/**
 * @mikesaintsg/adapters
 *
 * IndexedDB persistence adapter for sessions.
 * Provides session save/load/remove with TTL-based expiration.
 */

import type { PersistedSession, SessionSummary } from '@mikesaintsg/inference'
import type {
	SessionPersistenceAdapterInterface,
	IndexedDBSessionPersistenceOptions,
} from '../../types.js'
import {
	INDEXEDDB_DEFAULT_SESSION_DATABASE,
	INDEXEDDB_DEFAULT_SESSION_STORE,
	INDEXEDDB_DEFAULT_SESSION_TTL_MS,
} from '../../constants.js'

/** Stored session with expiration tracking */
interface StoredSession {
	readonly session: PersistedSession
	readonly expiresAt: number
}

/**
 * Create an IndexedDB session persistence adapter.
 *
 * @param options - Adapter configuration
 * @returns A session persistence adapter using IndexedDB
 *
 * @example
 * ```ts
 * const persistence = createIndexedDBSessionPersistence({
 *   databaseName: 'my-app-sessions',
 *   ttlMs: 24 * 60 * 60 * 1000, // 1 day TTL
 * })
 *
 * await persistence.save(session)
 * const loaded = await persistence.load('session-id')
 * ```
 */
export function createIndexedDBSessionPersistence(
	options: IndexedDBSessionPersistenceOptions = {},
): SessionPersistenceAdapterInterface {
	const {
		databaseName = INDEXEDDB_DEFAULT_SESSION_DATABASE,
		storeName = INDEXEDDB_DEFAULT_SESSION_STORE,
		ttlMs = INDEXEDDB_DEFAULT_SESSION_TTL_MS,
	} = options

	let dbPromise: Promise<IDBDatabase> | undefined

	/** Open or get the database connection */
	function getDatabase(): Promise<IDBDatabase> {
		if (dbPromise) return dbPromise

		dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open(databaseName, 1)

			request.onerror = () => {
				dbPromise = undefined
				reject(new Error(`Failed to open database: ${request.error?.message ?? 'Unknown error'}`))
			}

			request.onsuccess = () => {
				resolve(request.result)
			}

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result
				if (!db.objectStoreNames.contains(storeName)) {
					db.createObjectStore(storeName, { keyPath: 'session.id' })
				}
			}
		})

		return dbPromise
	}

	/** Run a transaction on the store */
	async function withStore<T>(
		mode: IDBTransactionMode,
		operation: (store: IDBObjectStore) => IDBRequest<T>,
	): Promise<T> {
		const db = await getDatabase()
		return new Promise<T>((resolve, reject) => {
			const transaction = db.transaction(storeName, mode)
			const store = transaction.objectStore(storeName)
			const request = operation(store)

			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(new Error(`Transaction failed: ${request.error?.message ?? 'Unknown error'}`))
		})
	}

	/** Check if a stored session is expired */
	function isExpired(stored: StoredSession): boolean {
		return Date.now() >= stored.expiresAt
	}

	/** Remove a session by ID */
	async function removeSession(id: string): Promise<void> {
		await withStore('readwrite', (store) => store.delete(id))
	}

	return {
		async save(session: PersistedSession): Promise<void> {
			const stored: StoredSession = {
				session,
				expiresAt: Date.now() + ttlMs,
			}
			await withStore('readwrite', (store) => store.put(stored))
		},

		async load(id: string): Promise<PersistedSession | undefined> {
			const stored = await withStore<StoredSession | undefined>('readonly', (store) =>
				store.get(id) as IDBRequest<StoredSession | undefined>,
			)

			if (!stored) return undefined

			// Check expiration
			if (isExpired(stored)) {
				// Remove expired session in background
				void removeSession(id)
				return undefined
			}

			return stored.session
		},

		async remove(id: string): Promise<void> {
			await removeSession(id)
		},

		async all(): Promise<readonly SessionSummary[]> {
			const db = await getDatabase()

			return new Promise<readonly SessionSummary[]>((resolve, reject) => {
				const transaction = db.transaction(storeName, 'readonly')
				const store = transaction.objectStore(storeName)
				const request = store.getAll()

				request.onsuccess = () => {
					const now = Date.now()
					const summaries: SessionSummary[] = []

					for (const stored of request.result as StoredSession[]) {
						// Skip expired sessions
						if (now >= stored.expiresAt) continue

						const { session } = stored
						const firstMessage = session.messages[0]
						const title = firstMessage?.role === 'user'
							? (typeof firstMessage.content === 'string'
								? firstMessage.content.slice(0, 50)
								: undefined)
							: undefined

						summaries.push({
							id: session.id,
							title,
							messageCount: session.messages.length,
							createdAt: session.createdAt,
							updatedAt: session.updatedAt,
						})
					}

					resolve(summaries)
				}

				request.onerror = () => {
					reject(new Error(`Failed to get all sessions: ${request.error?.message ?? 'Unknown error'}`))
				}
			})
		},

		async clear(): Promise<void> {
			await withStore('readwrite', (store) => store.clear())
		},
	}
}
