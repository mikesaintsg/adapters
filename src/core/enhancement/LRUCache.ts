/**
 * LRU cache adapter implementation.
 * Implements EmbeddingCacheAdapterInterface with LRU eviction.
 */

import type { EmbeddingCacheAdapterInterface, CacheStats, Embedding } from '@mikesaintsg/core'

import type { LRUCacheAdapterOptions } from '../../types.js'
import {
	DEFAULT_CACHE_MAX_SIZE,
	DEFAULT_CACHE_TTL_MS,
} from '../../constants.js'

interface CacheEntry {
	readonly embedding: Embedding
	readonly timestamp: number
}

/**
 * LRU cache for embeddings.
 * Uses Map iteration order (insertion order) for LRU behavior.
 * Entries are evicted when maxSize is exceeded or TTL expires.
 */
class LRUCache implements EmbeddingCacheAdapterInterface {
	#cache = new Map<string, CacheEntry>()
	readonly #maxSize: number
	readonly #ttlMs: number
	readonly #onEvict: ((text: string, embedding: Embedding) => void) | undefined

	// Stats tracking
	#hits = 0
	#misses = 0

	constructor(options: LRUCacheAdapterOptions = {}) {
		this.#maxSize = options.maxSize ?? DEFAULT_CACHE_MAX_SIZE
		this.#ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS
		this.#onEvict = options.onEvict
	}

	get(text: string): Embedding | undefined {
		const entry = this.#cache.get(text)
		if (!entry) {
			this.#misses++
			return undefined
		}

		// Check TTL
		if (this.#isExpired(entry)) {
			this.#delete(text)
			this.#misses++
			return undefined
		}

		// Move to end (most recently used)
		this.#cache.delete(text)
		this.#cache.set(text, entry)

		this.#hits++
		return entry.embedding
	}

	set(text: string, embedding: Embedding): void {
		// If already exists, delete first to update position
		if (this.#cache.has(text)) {
			this.#cache.delete(text)
		} else if (this.#cache.size >= this.#maxSize) {
			// Evict oldest entry (first in Map)
			const oldest = this.#cache.keys().next().value
			if (oldest !== undefined) {
				const entry = this.#cache.get(oldest)
				this.#cache.delete(oldest)
				if (entry && this.#onEvict) {
					this.#onEvict(oldest, entry.embedding)
				}
			}
		}

		this.#cache.set(text, {
			embedding,
			timestamp: Date.now(),
		})
	}

	has(text: string): boolean {
		const entry = this.#cache.get(text)
		if (!entry) {
			return false
		}

		if (this.#isExpired(entry)) {
			this.#delete(text)
			return false
		}

		return true
	}

	#delete(text: string): boolean {
		const entry = this.#cache.get(text)
		const deleted = this.#cache.delete(text)

		if (deleted && entry && this.#onEvict) {
			this.#onEvict(text, entry.embedding)
		}

		return deleted
	}

	clear(): void {
		if (this.#onEvict) {
			for (const [text, entry] of this.#cache) {
				this.#onEvict(text, entry.embedding)
			}
		}
		this.#cache.clear()
		this.#hits = 0
		this.#misses = 0
	}

	getStats(): CacheStats {
		return {
			size: this.#cache.size,
			maxSize: this.#maxSize,
			hits: this.#hits,
			misses: this.#misses,
		}
	}

	#isExpired(entry: CacheEntry): boolean {
		return Date.now() - entry.timestamp > this.#ttlMs
	}
}

/**
 * Create an LRU cache adapter for embeddings.
 *
 * @example
 * ```ts
 * const cache = createLRUCacheAdapter({
 *   maxSize: 10000,
 *   ttlMs: 3600000, // 1 hour
 *   onEvict: (text, embedding) => {
 *     console.log(`Evicted: ${text.substring(0, 50)}...`)
 *   },
 * })
 *
 * // Check cache before embedding
 * let embedding = cache.get(text)
 * if (!embedding) {
 *   embedding = await embeddingAdapter.embed([text])[0]
 *   cache.set(text, embedding)
 * }
 * ```
 */
export function createLRUCacheAdapter(
	options?: LRUCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	return new LRUCache(options)
}
