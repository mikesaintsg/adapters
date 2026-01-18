/**
 * @mikesaintsg/adapters
 *
 * Cache adapters implementing EmbeddingCacheAdapterInterface.
 * Provides LRU, TTL, and IndexedDB-based caching.
 */

import type { Embedding, EmbeddingCacheAdapterInterface, CacheStats } from '@mikesaintsg/core'
import type { LRUCacheAdapterOptions, TTLCacheAdapterOptions, IndexedDBCacheAdapterOptions } from '../types.js'

/** Cache entry with TTL support */
interface CacheEntry {
	readonly embedding: Embedding
	readonly cachedAt: number
	accessCount: number
}

/**
 * Create an LRU cache adapter for embeddings.
 *
 * Uses Least Recently Used eviction with optional TTL.
 *
 * @param options - Cache configuration options
 * @returns An EmbeddingCacheAdapterInterface implementation
 * @example
 * ```ts
 * const cache = createLRUCacheAdapter({
 *   maxSize: 10000,
 *   ttlMs: 3600000, // 1 hour
 *   onEvict: (text, embedding) => console.log(`Evicted: ${text}`),
 * })
 * ```
 */
export function createLRUCacheAdapter(
	options?: LRUCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	const maxSize = options?.maxSize ?? 1000
	const ttlMs = options?.ttlMs
	const onEvict = options?.onEvict

	// Map maintains insertion order for LRU
	const cache = new Map<string, CacheEntry>()
	let hitCount = 0
	let missCount = 0

	/** Check if an entry is expired */
	function isExpired(entry: CacheEntry): boolean {
		if (ttlMs === undefined) return false
		return Date.now() - entry.cachedAt > ttlMs
	}

	/** Evict oldest entry if at capacity */
	function evictIfNeeded(): void {
		if (cache.size >= maxSize) {
			// Get first (oldest) entry
			const firstKey = cache.keys().next().value
			if (firstKey !== undefined) {
				const entry = cache.get(firstKey)
				cache.delete(firstKey)
				if (onEvict && entry) {
					onEvict(firstKey, entry.embedding)
				}
			}
		}
	}

	return {
		get(text: string): Embedding | undefined {
			const entry = cache.get(text)
			if (!entry) {
				missCount++
				return undefined
			}

			if (isExpired(entry)) {
				cache.delete(text)
				missCount++
				return undefined
			}

			// Move to end (most recently used)
			cache.delete(text)
			entry.accessCount++
			cache.set(text, entry)

			hitCount++
			return entry.embedding
		},

		set(text: string, embedding: Embedding): void {
			// Remove if exists to update position
			cache.delete(text)
			evictIfNeeded()

			cache.set(text, {
				embedding,
				cachedAt: Date.now(),
				accessCount: 0,
			})
		},

		has(text: string): boolean {
			const entry = cache.get(text)
			if (!entry) return false
			if (isExpired(entry)) {
				cache.delete(text)
				return false
			}
			return true
		},

		clear(): void {
			cache.clear()
			hitCount = 0
			missCount = 0
		},

		getStats(): CacheStats {
			return {
				size: cache.size,
				hits: hitCount,
				misses: missCount,
				maxSize,
			}
		},
	}
}

/**
 * Create a TTL-only cache adapter for embeddings.
 *
 * Uses time-based expiration without size limits.
 *
 * @param options - Cache configuration options
 * @returns An EmbeddingCacheAdapterInterface implementation
 * @example
 * ```ts
 * const cache = createTTLCacheAdapter({
 *   ttlMs: 86400000, // 24 hours
 * })
 * ```
 */
export function createTTLCacheAdapter(
	options?: TTLCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	const ttlMs = options?.ttlMs ?? 3600000 // Default: 1 hour

	const cache = new Map<string, CacheEntry>()
	let hitCount = 0
	let missCount = 0

	/** Check if an entry is expired */
	function isExpired(entry: CacheEntry): boolean {
		return Date.now() - entry.cachedAt > ttlMs
	}

	/** Clean up expired entries periodically */
	function cleanupExpired(): void {
		const now = Date.now()
		for (const [key, entry] of cache) {
			if (now - entry.cachedAt > ttlMs) {
				cache.delete(key)
			}
		}
	}

	return {
		get(text: string): Embedding | undefined {
			const entry = cache.get(text)
			if (!entry) {
				missCount++
				return undefined
			}

			if (isExpired(entry)) {
				cache.delete(text)
				missCount++
				return undefined
			}

			entry.accessCount++
			hitCount++
			return entry.embedding
		},

		set(text: string, embedding: Embedding): void {
			// Periodically cleanup (every 100 sets)
			if (cache.size % 100 === 0) {
				cleanupExpired()
			}

			cache.set(text, {
				embedding,
				cachedAt: Date.now(),
				accessCount: 0,
			})
		},

		has(text: string): boolean {
			const entry = cache.get(text)
			if (!entry) return false
			if (isExpired(entry)) {
				cache.delete(text)
				return false
			}
			return true
		},

		clear(): void {
			cache.clear()
			hitCount = 0
			missCount = 0
		},

		getStats(): CacheStats {
			// Cleanup before reporting
			cleanupExpired()

			return {
				size: cache.size,
				hits: hitCount,
				misses: missCount,
			}
		},
	}
}

/**
 * Create an IndexedDB-backed cache adapter for embeddings.
 *
 * Provides persistent caching across browser sessions.
 *
 * @param options - Cache configuration options (requires database)
 * @returns An EmbeddingCacheAdapterInterface implementation
 * @example
 * ```ts
 * const cache = createIndexedDBCacheAdapter({
 *   database: db,
 *   storeName: 'embedding_cache',
 *   ttlMs: 604800000, // 7 days
 * })
 * ```
 */
export function createIndexedDBCacheAdapter(
	options: IndexedDBCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	const { database, storeName = 'embedding_cache', ttlMs } = options

	// In-memory cache for sync access
	const memCache = new Map<string, CacheEntry>()
	let hitCount = 0
	let missCount = 0

	const store = database.store<{ key: string; embedding: Embedding; cachedAt: number }>(storeName)

	/** Check if an entry is expired */
	function isExpired(cachedAt: number): boolean {
		if (ttlMs === undefined) return false
		return Date.now() - cachedAt > ttlMs
	}

	// Load cache from IndexedDB on init
	void (async() => {
		try {
			const entries = await store.all()
			for (const entry of entries) {
				if (!isExpired(entry.cachedAt)) {
					memCache.set(entry.key, {
						embedding: entry.embedding,
						cachedAt: entry.cachedAt,
						accessCount: 0,
					})
				}
			}
		} catch {
			// Ignore load errors
		}
	})()

	return {
		get(text: string): Embedding | undefined {
			const entry = memCache.get(text)
			if (!entry) {
				missCount++
				return undefined
			}

			if (isExpired(entry.cachedAt)) {
				memCache.delete(text)
				void store.remove(text)
				missCount++
				return undefined
			}

			entry.accessCount++
			hitCount++
			return entry.embedding
		},

		set(text: string, embedding: Embedding): void {
			const cachedAt = Date.now()
			memCache.set(text, {
				embedding,
				cachedAt,
				accessCount: 0,
			})

			// Persist to IndexedDB
			void store.set({ key: text, embedding, cachedAt }, text)
		},

		has(text: string): boolean {
			const entry = memCache.get(text)
			if (!entry) return false
			if (isExpired(entry.cachedAt)) {
				memCache.delete(text)
				void store.remove(text)
				return false
			}
			return true
		},

		clear(): void {
			memCache.clear()
			void store.clear()
			hitCount = 0
			missCount = 0
		},

		getStats(): CacheStats {
			return {
				size: memCache.size,
				hits: hitCount,
				misses: missCount,
			}
		},
	}
}
