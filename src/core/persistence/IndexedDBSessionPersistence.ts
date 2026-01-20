/**
 * IndexedDB Session Persistence Adapter
 *
 * Persists session data to IndexedDB with TTL-based cleanup.
 */

import type {
	SessionPersistenceInterface,
	SerializableSession,
	SerializedSession,
} from '@mikesaintsg/core'
import type { IndexedDBSessionPersistenceOptions, SessionRecord } from '../../types.js'
import {
	DEFAULT_INDEXEDDB_SESSION_DATABASE,
	DEFAULT_INDEXEDDB_SESSION_STORE,
	DEFAULT_SESSION_TTL_MS,
} from '../../constants.js'
import { toError } from '../../helpers.js'

// ============================================================================
// Implementation
// ============================================================================

export class IndexedDBSessionPersistence implements SessionPersistenceInterface {
	#databaseName: string
	#storeName: string
	#ttlMs: number
	#database: IDBDatabase | null = null

	constructor(options?: IndexedDBSessionPersistenceOptions) {
		this.#databaseName = options?.databaseName ?? DEFAULT_INDEXEDDB_SESSION_DATABASE
		this.#storeName = options?.storeName ?? DEFAULT_INDEXEDDB_SESSION_STORE
		this.#ttlMs = options?.ttlMs ?? DEFAULT_SESSION_TTL_MS
	}

	async save(id: string, session: SerializableSession): Promise<void> {
		const db = await this.#getDatabase()
		const serialized = {
			metadata: session.getMetadata(),
		} as SerializedSession

		const record: SessionRecord = {
			id,
			session: serialized,
			timestamp: Date.now(),
		}

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.#storeName, 'readwrite')
			const store = transaction.objectStore(this.#storeName)
			const request = store.put(record)

			request.onsuccess = () => resolve()
			request.onerror = () => reject(toError(request.error))
		})
	}

	async load(id: string): Promise<SerializedSession | undefined> {
		const db = await this.#getDatabase()

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.#storeName, 'readonly')
			const store = transaction.objectStore(this.#storeName)
			const request = store.get(id)

			request.onsuccess = () => {
				const result = request.result as SessionRecord | undefined
				if (!result) {
					resolve(undefined)
					return
				}

				// Check TTL
				if (Date.now() - result.timestamp > this.#ttlMs) {
					void this.delete(id)
					resolve(undefined)
					return
				}

				resolve(result.session)
			}
			request.onerror = () => reject(toError(request.error))
		})
	}

	async delete(id: string): Promise<void> {
		const db = await this.#getDatabase()

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.#storeName, 'readwrite')
			const store = transaction.objectStore(this.#storeName)
			const request = store.delete(id)

			request.onsuccess = () => resolve()
			request.onerror = () => reject(toError(request.error))
		})
	}

	async list(): Promise<readonly string[]> {
		const db = await this.#getDatabase()

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.#storeName, 'readonly')
			const store = transaction.objectStore(this.#storeName)
			const request = store.getAllKeys()

			request.onsuccess = () => {
				resolve(request.result as string[])
			}
			request.onerror = () => reject(toError(request.error))
		})
	}

	async prune(maxAgeMs: number): Promise<number> {
		const db = await this.#getDatabase()
		const cutoff = Date.now() - maxAgeMs
		let prunedCount = 0

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.#storeName, 'readwrite')
			const store = transaction.objectStore(this.#storeName)
			const request = store.openCursor()

			request.onsuccess = () => {
				const cursor = request.result
				if (cursor) {
					const record = cursor.value as SessionRecord
					if (record.timestamp < cutoff) {
						cursor.delete()
						prunedCount++
					}
					cursor.continue()
				} else {
					resolve(prunedCount)
				}
			}
			request.onerror = () => reject(toError(request.error))
		})
	}

	async isAvailable(): Promise<boolean> {
		try {
			await this.#getDatabase()
			return true
		} catch {
			return false
		}
	}

	async clear(): Promise<void> {
		const db = await this.#getDatabase()

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.#storeName, 'readwrite')
			const store = transaction.objectStore(this.#storeName)
			const request = store.clear()

			request.onsuccess = () => resolve()
			request.onerror = () => reject(toError(request.error))
		})
	}

	async #getDatabase(): Promise<IDBDatabase> {
		if (this.#database) {
			return this.#database
		}

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.#databaseName, 1)

			request.onerror = () => reject(toError(request.error))

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result
				if (!db.objectStoreNames.contains(this.#storeName)) {
					db.createObjectStore(this.#storeName, { keyPath: 'id' })
				}
			}

			request.onsuccess = () => {
				this.#database = request.result
				resolve(request.result)
			}
		})
	}
}
