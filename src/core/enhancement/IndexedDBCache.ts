/**
 * IndexedDB cache adapter implementation.
 * Implements EmbeddingCacheAdapterInterface with persistent browser storage.
 */

import type {
	EmbeddingCacheAdapterInterface,
	CacheStats,
	Embedding,
	MinimalDatabaseAccess,
	MinimalStoreAccess,
} from '@mikesaintsg/core'

import type { IndexedDBCacheAdapterOptions } from '../../types.js'
import {
	DEFAULT_CACHE_STORE_NAME,
	DEFAULT_INDEXEDDB_CACHE_TTL_MS,
} from '../../constants.js'

interface CacheEntry {
	readonly id: string
	readonly text: string
	readonly embedding: readonly number[]
	readonly timestamp: number
}

/**
 * IndexedDB cache for embeddings.
 * Provides persistent caching across browser sessions.
 * Uses SHA-256 hashing for keys to handle long text inputs.
 */
class IndexedDBCache implements EmbeddingCacheAdapterInterface {
	readonly #store: MinimalStoreAccess<CacheEntry>
	readonly #ttlMs: number

	// Stats tracking (in-memory only)
	#hits = 0
	#misses = 0
	#size = 0

	constructor(database: MinimalDatabaseAccess, storeName: string, ttlMs: number) {
		this.#store = database.store<CacheEntry>(storeName)
		this.#ttlMs = ttlMs
	}

	get(text: string): Embedding | undefined {
		// This is synchronous interface but we're wrapping async
		// Return undefined - use async version via getAsync
		// Note: Don't increment stats here - not a real cache operation
		void text
		return undefined
	}

	set(text: string, _embedding: Embedding): void {
		// This is synchronous interface but we're wrapping async
		// No-op for synchronous - use setAsync
		void text
	}

	has(text: string): boolean {
		// This is synchronous interface - always returns false
		// Use hasAsync for proper check
		void text
		return false
	}

	clear(): void {
		// Reset stats
		this.#hits = 0
		this.#misses = 0
		this.#size = 0
		// Note: For actual clearing, use clearAsync
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
	async getAsync(text: string): Promise<Embedding | undefined> {
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
	async setAsync(text: string, embedding: Embedding): Promise<void> {
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
	async hasAsync(text: string): Promise<boolean> {
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
	async deleteAsync(text: string): Promise<boolean> {
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
	async clearAsync(): Promise<void> {
		await this.#store.clear()
		this.clear()
	}

	async #hashText(text: string): Promise<string> {
		const encoder = new TextEncoder()
		const data = encoder.encode(text)
		const hashBuffer = await crypto.subtle.digest('SHA-256', data)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
	}
}

/**
 * Extended interface for IndexedDB cache with async methods.
 */
export interface IndexedDBCacheAdapterInterfaceAsync extends EmbeddingCacheAdapterInterface {
	getAsync(text: string): Promise<Embedding | undefined>
	setAsync(text: string, embedding: Embedding): Promise<void>
	hasAsync(text: string): Promise<boolean>
	deleteAsync(text: string): Promise<boolean>
	clearAsync(): Promise<void>
}

/**
 * Create an IndexedDB cache adapter for embeddings.
 * Provides persistent caching across browser sessions.
 *
 * @example
 * ```ts
 * const cache = createIndexedDBCacheAdapter({
 *   database: myDatabaseAccess,
 *   storeName: 'embeddings',
 *   ttlMs: 604800000, // 7 days
 * })
 *
 * // Use async methods for IndexedDB
 * let embedding = await cache.getAsync(text)
 * if (!embedding) {
 *   embedding = await embeddingAdapter.embed([text])[0]
 *   await cache.setAsync(text, embedding)
 * }
 * ```
 */
export function createIndexedDBCacheAdapter(
	options: IndexedDBCacheAdapterOptions,
): IndexedDBCacheAdapterInterfaceAsync {
	const storeName = options.storeName ?? DEFAULT_CACHE_STORE_NAME
	const ttlMs = options.ttlMs ?? DEFAULT_INDEXEDDB_CACHE_TTL_MS
	return new IndexedDBCache(options.database, storeName, ttlMs)
}
