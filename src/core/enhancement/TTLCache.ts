/**
 * TTL cache adapter implementation.
 * Implements EmbeddingCacheAdapterInterface with time-based expiration only.
 */

import type { EmbeddingCacheAdapterInterface, CacheStats, Embedding } from '@mikesaintsg/core'

import type { TTLCacheAdapterOptions } from '../../types.js'
import { DEFAULT_CACHE_TTL_MS } from '../../constants.js'

interface CacheEntry {
	readonly embedding: Embedding
	readonly expiresAt: number
}

/**
 * TTL cache for embeddings.
 * Simple cache with time-based expiration only, no size limits.
 * Entries are removed when TTL expires.
 */
class TTLCache implements EmbeddingCacheAdapterInterface {
	#cache = new Map<string, CacheEntry>()
	readonly #ttlMs: number

	// Stats tracking
	#hits = 0
	#misses = 0

	constructor(options: TTLCacheAdapterOptions = {}) {
		this.#ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS
	}

	get(text: string): Embedding | undefined {
		const entry = this.#cache.get(text)
		if (!entry) {
			this.#misses++
			return undefined
		}

		// Check expiration
		if (Date.now() > entry.expiresAt) {
			this.#cache.delete(text)
			this.#misses++
			return undefined
		}

		this.#hits++
		return entry.embedding
	}

	set(text: string, embedding: Embedding): void {
		this.#cache.set(text, {
			embedding,
			expiresAt: Date.now() + this.#ttlMs,
		})
	}

	has(text: string): boolean {
		const entry = this.#cache.get(text)
		if (!entry) {
			return false
		}

		if (Date.now() > entry.expiresAt) {
			this.#cache.delete(text)
			return false
		}

		return true
	}

	clear(): void {
		this.#cache.clear()
		this.#hits = 0
		this.#misses = 0
	}

	getStats(): CacheStats {
		// Clean up expired entries when checking stats
		const now = Date.now()
		for (const [text, entry] of this.#cache) {
			if (now > entry.expiresAt) {
				this.#cache.delete(text)
			}
		}

		return {
			size: this.#cache.size,
			hits: this.#hits,
			misses: this.#misses,
		}
	}
}

/**
 * Create a TTL cache adapter for embeddings.
 * Simple cache with time-based expiration only, no size limits.
 *
 * @example
 * ```ts
 * const cache = createTTLCacheAdapter({
 *   ttlMs: 3600000, // 1 hour
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
export function createTTLCacheAdapter(
	options?: TTLCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	return new TTLCache(options)
}
