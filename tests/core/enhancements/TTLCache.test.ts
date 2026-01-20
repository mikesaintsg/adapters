/**
 * TTL cache adapter tests.
 */

import { describe, it, expect } from 'vitest'

import { createTTLCacheAdapter } from '@mikesaintsg/adapters'

describe('TTLCache', () => {
	describe('createTTLCacheAdapter', () => {
		it('creates cache adapter with default options', () => {
			const cache = createTTLCacheAdapter()
			const stats = cache.getStats?.()

			expect(stats?.size).toBe(0)
			expect(stats?.hits).toBe(0)
			expect(stats?.misses).toBe(0)
		})

		it('stores and retrieves embeddings', () => {
			const cache = createTTLCacheAdapter()
			const embedding = new Float32Array([1, 2, 3, 4])

			cache.set('test text', embedding)
			const retrieved = cache.get('test text')

			expect(retrieved).toEqual(embedding)
		})

		it('returns undefined for missing keys', () => {
			const cache = createTTLCacheAdapter()

			expect(cache.get('missing')).toBeUndefined()
			expect(cache.getStats?.()?.misses).toBe(1)
		})

		it('tracks hit and miss statistics', () => {
			const cache = createTTLCacheAdapter()
			const embedding = new Float32Array([1, 2, 3])

			cache.set('exists', embedding)

			cache.get('exists')
			cache.get('exists')
			cache.get('missing')

			const stats = cache.getStats?.()
			expect(stats?.hits).toBe(2)
			expect(stats?.misses).toBe(1)
		})

		it('checks if key exists', () => {
			const cache = createTTLCacheAdapter()
			const embedding = new Float32Array([1, 2, 3])

			expect(cache.has('key')).toBe(false)
			cache.set('key', embedding)
			expect(cache.has('key')).toBe(true)
		})

		it('clears all entries', () => {
			const cache = createTTLCacheAdapter()

			cache.set('a', new Float32Array([1]))
			cache.set('b', new Float32Array([2]))
			cache.set('c', new Float32Array([3]))

			expect(cache.getStats?.()?.size).toBe(3)

			cache.clear()

			expect(cache.getStats?.()?.size).toBe(0)
			expect(cache.has('a')).toBe(false)
		})

		it('respects TTL expiration', async() => {
			const cache = createTTLCacheAdapter({
				ttlMs: 50,
			})

			cache.set('temporary', new Float32Array([1]))
			expect(cache.has('temporary')).toBe(true)

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 60))

			expect(cache.get('temporary')).toBeUndefined()
		})

		it('allows multiple entries without size limit', () => {
			const cache = createTTLCacheAdapter()

			for (let i = 0; i < 100; i++) {
				cache.set(`key-${i}`, new Float32Array([i]))
			}

			expect(cache.getStats?.()?.size).toBe(100)
		})
	})
})
