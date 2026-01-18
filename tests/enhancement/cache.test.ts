/**
 * @mikesaintsg/adapters
 *
 * Tests for cache adapters.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
	createLRUCacheAdapter,
	createTTLCacheAdapter,
} from '@mikesaintsg/adapters'

describe('Cache Adapters', () => {
	describe('createLRUCacheAdapter', () => {
		it('creates adapter with default options', () => {
			const cache = createLRUCacheAdapter()

			expect(cache.has('test')).toBe(false)
		})

		it('set and get work correctly', () => {
			const cache = createLRUCacheAdapter()
			const embedding = new Float32Array([1, 2, 3])

			cache.set('hello', embedding)

			expect(cache.has('hello')).toBe(true)
			expect(cache.get('hello')).toBe(embedding)
		})

		it('has returns false for non-existent keys', () => {
			const cache = createLRUCacheAdapter()

			expect(cache.has('nonexistent')).toBe(false)
		})

		it('get returns undefined for non-existent keys', () => {
			const cache = createLRUCacheAdapter()

			expect(cache.get('nonexistent')).toBeUndefined()
		})

		it('clear removes all entries', () => {
			const cache = createLRUCacheAdapter()
			cache.set('a', new Float32Array([1]))
			cache.set('b', new Float32Array([2]))
			cache.set('c', new Float32Array([3]))

			cache.clear()

			expect(cache.has('a')).toBe(false)
			expect(cache.has('b')).toBe(false)
			expect(cache.has('c')).toBe(false)
		})

		it('respects maxSize and evicts oldest entries', () => {
			const cache = createLRUCacheAdapter({ maxSize: 3 })

			cache.set('a', new Float32Array([1]))
			cache.set('b', new Float32Array([2]))
			cache.set('c', new Float32Array([3]))
			cache.set('d', new Float32Array([4])) // Should evict 'a'

			expect(cache.has('a')).toBe(false)
			expect(cache.has('b')).toBe(true)
			expect(cache.has('c')).toBe(true)
			expect(cache.has('d')).toBe(true)
		})

		it('accessing an entry moves it to end (LRU)', () => {
			const cache = createLRUCacheAdapter({ maxSize: 3 })

			cache.set('a', new Float32Array([1]))
			cache.set('b', new Float32Array([2]))
			cache.set('c', new Float32Array([3]))

			// Access 'a' to move it to end
			cache.get('a')

			// Now add 'd' - should evict 'b' (oldest unused)
			cache.set('d', new Float32Array([4]))

			expect(cache.has('a')).toBe(true) // Was accessed, still here
			expect(cache.has('b')).toBe(false) // Was evicted
			expect(cache.has('c')).toBe(true)
			expect(cache.has('d')).toBe(true)
		})

		it('getStats returns correct statistics', () => {
			const cache = createLRUCacheAdapter({ maxSize: 10 })

			cache.set('a', new Float32Array([1]))
			cache.get('a') // Hit
			cache.get('a') // Hit
			cache.get('b') // Miss

			const stats = cache.getStats?.()
			expect(stats).toBeDefined()
			expect(stats!.size).toBe(1)
			expect(stats!.hits).toBe(2)
			expect(stats!.misses).toBe(1)
			expect(stats!.maxSize).toBe(10)
		})

		it('calls onEvict when entry is evicted', () => {
			const onEvict = vi.fn()
			const cache = createLRUCacheAdapter({ maxSize: 2, onEvict })

			const embedding1 = new Float32Array([1])
			cache.set('a', embedding1)
			cache.set('b', new Float32Array([2]))
			cache.set('c', new Float32Array([3])) // Should evict 'a'

			expect(onEvict).toHaveBeenCalledWith('a', embedding1)
		})

		it('handles TTL expiration', () => {
			vi.useFakeTimers()

			const cache = createLRUCacheAdapter({ ttlMs: 1000 })
			cache.set('a', new Float32Array([1]))

			expect(cache.has('a')).toBe(true)

			// Advance time past TTL
			vi.advanceTimersByTime(1100)

			expect(cache.has('a')).toBe(false)
			expect(cache.get('a')).toBeUndefined()

			vi.useRealTimers()
		})

		it('updating existing key refreshes position', () => {
			const cache = createLRUCacheAdapter({ maxSize: 3 })

			cache.set('a', new Float32Array([1]))
			cache.set('b', new Float32Array([2]))
			cache.set('c', new Float32Array([3]))

			// Update 'a' (moves to end)
			cache.set('a', new Float32Array([10]))

			// Add 'd' - should evict 'b'
			cache.set('d', new Float32Array([4]))

			expect(cache.has('a')).toBe(true)
			expect(cache.has('b')).toBe(false)
		})
	})

	describe('createTTLCacheAdapter', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('creates adapter with default TTL', () => {
			const cache = createTTLCacheAdapter()

			cache.set('test', new Float32Array([1]))
			expect(cache.has('test')).toBe(true)
		})

		it('creates adapter with custom TTL', () => {
			const cache = createTTLCacheAdapter({ ttlMs: 5000 })

			cache.set('test', new Float32Array([1]))
			expect(cache.has('test')).toBe(true)

			vi.advanceTimersByTime(5100)
			expect(cache.has('test')).toBe(false)
		})

		it('entries expire after TTL', () => {
			const cache = createTTLCacheAdapter({ ttlMs: 2000 })

			cache.set('test', new Float32Array([1]))

			vi.advanceTimersByTime(1900)
			expect(cache.has('test')).toBe(true)

			vi.advanceTimersByTime(200)
			expect(cache.has('test')).toBe(false)
		})

		it('getStats returns correct statistics', () => {
			const cache = createTTLCacheAdapter({ ttlMs: 60000 })

			cache.set('a', new Float32Array([1]))
			cache.get('a') // Hit
			cache.get('b') // Miss

			const stats = cache.getStats?.()
			expect(stats).toBeDefined()
			expect(stats!.size).toBe(1)
			expect(stats!.hits).toBe(1)
			expect(stats!.misses).toBe(1)
		})

		it('clear removes all entries and resets stats', () => {
			const cache = createTTLCacheAdapter()

			cache.set('a', new Float32Array([1]))
			cache.get('a')
			cache.get('b')

			cache.clear()

			expect(cache.has('a')).toBe(false)
			const stats = cache.getStats?.()
			expect(stats).toBeDefined()
			expect(stats!.size).toBe(0)
			expect(stats!.hits).toBe(0)
			expect(stats!.misses).toBe(0)
		})

		it('set on same key updates timestamp', () => {
			const cache = createTTLCacheAdapter({ ttlMs: 2000 })

			cache.set('test', new Float32Array([1]))

			vi.advanceTimersByTime(1500) // 1.5 seconds passed

			// Re-set the same key
			cache.set('test', new Float32Array([2]))

			vi.advanceTimersByTime(1500) // Another 1.5 seconds (total 3s from start)

			// Should still be valid since we reset the timer
			expect(cache.has('test')).toBe(true)
		})
	})

	describe('Edge Cases', () => {
		it('handles empty embeddings', () => {
			const cache = createLRUCacheAdapter()
			const empty = new Float32Array([])

			cache.set('empty', empty)
			expect(cache.get('empty')).toBe(empty)
		})

		it('handles large embeddings', () => {
			const cache = createLRUCacheAdapter()
			const large = new Float32Array(10000).fill(0.5)

			cache.set('large', large)
			expect(cache.get('large')).toBe(large)
		})

		it('handles special characters in keys', () => {
			const cache = createLRUCacheAdapter()
			const embedding = new Float32Array([1, 2, 3])

			const keys = [
				'with spaces',
				'emoji 🎉',
				'unicode 中文',
				'newline\nchar',
				'tab\tchar',
				'',
			]

			keys.forEach((key) => {
				cache.set(key, embedding)
				expect(cache.has(key)).toBe(true)
			})
		})

		it('clear on empty cache is no-op', () => {
			const cache = createLRUCacheAdapter()

			expect(() => cache.clear()).not.toThrow()
			expect(cache.getStats?.()?.size).toBe(0)
		})
	})
})
