/**
 * LRU cache adapter tests.
 */

import { describe, it, expect, vi } from 'vitest'

import { createLRUCacheAdapter } from '@mikesaintsg/adapters'

describe('LRUCache', () => {
	describe('createLRUCacheAdapter', () => {
		it('creates cache adapter with default options', () => {
			const cache = createLRUCacheAdapter()
			const stats = cache.getStats?.()

			expect(stats?.size).toBe(0)
			expect(stats?.hits).toBe(0)
			expect(stats?.misses).toBe(0)
		})

		it('stores and retrieves embeddings', () => {
			const cache = createLRUCacheAdapter()
			const embedding = new Float32Array([1, 2, 3, 4])

			cache.set('test text', embedding)
			const retrieved = cache.get('test text')

			expect(retrieved).toEqual(embedding)
		})

		it('returns undefined for missing keys', () => {
			const cache = createLRUCacheAdapter()

			expect(cache.get('missing')).toBeUndefined()
			expect(cache.getStats?.()?.misses).toBe(1)
		})

		it('tracks hit and miss statistics', () => {
			const cache = createLRUCacheAdapter()
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
			const cache = createLRUCacheAdapter()
			const embedding = new Float32Array([1, 2, 3])

			expect(cache.has('key')).toBe(false)
			cache.set('key', embedding)
			expect(cache.has('key')).toBe(true)
		})

		it('clears all entries', () => {
			const cache = createLRUCacheAdapter()

			cache.set('a', new Float32Array([1]))
			cache.set('b', new Float32Array([2]))
			cache.set('c', new Float32Array([3]))

			expect(cache.getStats?.()?.size).toBe(3)

			cache.clear()

			expect(cache.getStats?.()?.size).toBe(0)
			expect(cache.has('a')).toBe(false)
		})

		it('evicts oldest entry when max size exceeded', () => {
			const cache = createLRUCacheAdapter({
				maxSize: 2,
			})

			cache.set('first', new Float32Array([1]))
			cache.set('second', new Float32Array([2]))
			cache.set('third', new Float32Array([3])) // Should evict 'first'

			expect(cache.getStats?.()?.size).toBe(2)
			expect(cache.has('first')).toBe(false)
			expect(cache.has('second')).toBe(true)
			expect(cache.has('third')).toBe(true)
		})

		it('calls onEvict callback when entry is evicted', () => {
			const onEvict = vi.fn()
			const cache = createLRUCacheAdapter({
				maxSize: 1,
				onEvict,
			})

			const firstEmbedding = new Float32Array([1])
			cache.set('first', firstEmbedding)
			cache.set('second', new Float32Array([2])) // Should evict 'first'

			expect(onEvict).toHaveBeenCalledWith('first', firstEmbedding)
		})

		it('moves accessed item to most recently used', () => {
			const cache = createLRUCacheAdapter({
				maxSize: 2,
			})

			cache.set('first', new Float32Array([1]))
			cache.set('second', new Float32Array([2]))

			// Access 'first' to make it most recently used
			cache.get('first')

			// Add third - should evict 'second' (now oldest)
			cache.set('third', new Float32Array([3]))

			expect(cache.has('first')).toBe(true)
			expect(cache.has('second')).toBe(false)
			expect(cache.has('third')).toBe(true)
		})

		it('respects TTL expiration', async() => {
			const cache = createLRUCacheAdapter({
				ttlMs: 50,
			})

			cache.set('temporary', new Float32Array([1]))
			expect(cache.has('temporary')).toBe(true)

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 60))

			expect(cache.get('temporary')).toBeUndefined()
		})
	})
})
