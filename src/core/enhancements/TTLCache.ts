/**
 * TTL cache adapter implementation.
 * Implements EmbeddingCacheAdapterInterface with time-based expiration only.
 */

import type { EmbeddingCacheAdapterInterface, CacheStats, Embedding } from '@mikesaintsg/core'

import type { TTLCacheAdapterOptions, TTLCacheEntry } from '../../types.js'
import { DEFAULT_CACHE_TTL_MS } from '../../constants.js'

/**
 * TTL cache for embeddings.
 * Simple cache with time-based expiration only, no size limits.
 * Entries are removed when TTL expires.
 */
export class TTLCache implements EmbeddingCacheAdapterInterface {
	#cache = new Map<string, TTLCacheEntry>()
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
