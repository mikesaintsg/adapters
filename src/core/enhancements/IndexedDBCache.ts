/**
 * IndexedDB cache adapter implementation.
 * Implements EmbeddingCacheAdapterInterface with persistent browser storage.
 */

import type {
	Embedding,
	MinimalDatabaseAccess,
	MinimalStoreAccess,
} from '@mikesaintsg/core'

import type {
	CacheStats,
	IndexedDBCacheEntry,
	IndexedDBCacheAdapterInterface,
} from '../../types.js'

/**
 * IndexedDB cache for embeddings.
 * Provides persistent caching across browser sessions.
 * Uses SHA-256 hashing for keys to handle long text inputs.
 */
export class IndexedDBCache implements IndexedDBCacheAdapterInterface {
	readonly #store: MinimalStoreAccess<IndexedDBCacheEntry>
	readonly #ttlMs: number

	// Stats tracking (in-memory only)
	#hits = 0
	#misses = 0
	#size = 0

	constructor(database: MinimalDatabaseAccess, storeName: string, ttlMs: number) {
		this.#store = database.store<IndexedDBCacheEntry>(storeName)
		this.#ttlMs = ttlMs
	}

	getStats(): CacheStats {
		return {
			size: this.#size,
			hits: this.#hits,
			misses: this.#misses,
		}
	}

	/**
	 * Async get method for IndexedDB operations.
	 */
	async get(text: string): Promise<Embedding | undefined> {
		const key = await this.#hashText(text)
		const entry = await this.#store.get(key)

		if (!entry) {
			this.#misses++
			return undefined
		}

		// Check TTL
		if (Date.now() - entry.timestamp > this.#ttlMs) {
			await this.#store.remove(key)
			this.#misses++
			return undefined
		}

		this.#hits++
		return new Float32Array(entry.embedding)
	}

	/**
	 * Async set method for IndexedDB operations.
	 */
	async set(text: string, embedding: Embedding): Promise<void> {
		const key = await this.#hashText(text)
		await this.#store.set({
			id: key,
			text,
			embedding: Array.from(embedding),
			timestamp: Date.now(),
		}, key)
		this.#size++
	}

	/**
	 * Async has method for IndexedDB operations.
	 */
	async has(text: string): Promise<boolean> {
		const key = await this.#hashText(text)
		const entry = await this.#store.get(key)

		if (!entry) {
			return false
		}

		if (Date.now() - entry.timestamp > this.#ttlMs) {
			await this.#store.remove(key)
			return false
		}

		return true
	}

	/**
	 * Async delete method for IndexedDB operations.
	 */
	async delete(text: string): Promise<boolean> {
		const key = await this.#hashText(text)
		try {
			await this.#store.remove(key)
			this.#size = Math.max(0, this.#size - 1)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Async clear method for IndexedDB operations.
	 */
	async clear(): Promise<void> {
		await this.#store.clear()
		await this.clear()
	}

	async #hashText(text: string): Promise<string> {
		const encoder = new TextEncoder()
		const data = encoder.encode(text)
		const hashBuffer = await crypto.subtle.digest('SHA-256', data)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
	}
}
