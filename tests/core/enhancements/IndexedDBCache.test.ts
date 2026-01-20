/**
 * IndexedDBCache Adapter Tests
 *
 * Tests for IndexedDB-backed embedding cache adapter.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createIndexedDBCacheAdapter } from '@mikesaintsg/adapters'
import type { MinimalDatabaseAccess, MinimalStoreAccess } from '@mikesaintsg/core'

// Mock store implementation
function createMockStore<T>(): MinimalStoreAccess<T> & { data: Map<string, T> } {
	const data = new Map<string, T>()
	return {
		data,
		get(key: string): Promise<T | undefined> {
			return Promise.resolve(data.get(key))
		},
		set(value: T, key: string): Promise<string> {
			data.set(key, value)
			return Promise.resolve(key)
		},
		remove(key: string): Promise<void> {
			data.delete(key)
			return Promise.resolve()
		},
		clear(): Promise<void> {
			data.clear()
			return Promise.resolve()
		},
		all(): Promise<readonly T[]> {
			return Promise.resolve(Array.from(data.values()))
		},
	}
}

// Mock database implementation
function createMockDatabase(): MinimalDatabaseAccess & { stores: Map<string, MinimalStoreAccess<unknown>> } {
	const stores = new Map<string, MinimalStoreAccess<unknown>>()
	return {
		stores,
		store<T>(name: string): MinimalStoreAccess<T> {
			if (!stores.has(name)) {
				stores.set(name, createMockStore<T>())
			}
			return stores.get(name) as MinimalStoreAccess<T>
		},
	}
}

describe('IndexedDBCache', () => {
	let database: ReturnType<typeof createMockDatabase>

	beforeEach(() => {
		database = createMockDatabase()
	})

	describe('get', () => {
		it('returns undefined for cache miss', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})

			const result = await cache.get('unknown text')

			expect(result).toBeUndefined()
		})

		it('returns embedding for cache hit', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			const embedding = new Float32Array([0.1, 0.2, 0.3])
			await cache.set('test text', embedding)

			const result = await cache.get('test text')

			expect(result).toBeDefined()
			expect(result).toHaveLength(3)
			expect(result?.[0]).toBeCloseTo(0.1)
		})

		it('returns undefined for expired entry', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 1, // 1ms TTL
			})
			const embedding = new Float32Array([0.1, 0.2, 0.3])
			await cache.set('test text', embedding)

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 10))

			const result = await cache.get('test text')

			expect(result).toBeUndefined()
		})

		it('updates stats on hit', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			await cache.set('test', new Float32Array([0.1]))

			await cache.get('test')

			const stats = cache.getStats()
			expect(stats.hits).toBe(1)
			expect(stats.misses).toBe(0)
		})

		it('updates stats on miss', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})

			await cache.get('unknown')

			const stats = cache.getStats()
			expect(stats.hits).toBe(0)
			expect(stats.misses).toBe(1)
		})
	})

	describe('set', () => {
		it('stores embedding for text', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			const embedding = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])

			await cache.set('test text', embedding)
			const result = await cache.get('test text')

			expect(result).toBeDefined()
			expect(result).toHaveLength(5)
		})

		it('updates size stats', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})

			await cache.set('text1', new Float32Array([0.1]))
			await cache.set('text2', new Float32Array([0.2]))

			const stats = cache.getStats()
			expect(stats.size).toBe(2)
		})

		it('handles long text inputs', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			const longText = 'a'.repeat(10000)
			const embedding = new Float32Array([0.1, 0.2])

			await cache.set(longText, embedding)
			const result = await cache.get(longText)

			expect(result).toBeDefined()
		})

		it('handles special characters in text', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			const specialText = 'Hello 🌍! Привет мир! 你好世界!'
			const embedding = new Float32Array([0.1, 0.2])

			await cache.set(specialText, embedding)
			const result = await cache.get(specialText)

			expect(result).toBeDefined()
		})
	})

	describe('has', () => {
		it('returns false for missing entry', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})

			const result = await cache.has('unknown')

			expect(result).toBe(false)
		})

		it('returns true for existing entry', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			await cache.set('test', new Float32Array([0.1]))

			const result = await cache.has('test')

			expect(result).toBe(true)
		})

		it('returns false for expired entry', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 1,
			})
			await cache.set('test', new Float32Array([0.1]))

			await new Promise((resolve) => setTimeout(resolve, 10))

			const result = await cache.has('test')

			expect(result).toBe(false)
		})
	})

	describe('delete', () => {
		it('removes existing entry', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			await cache.set('test', new Float32Array([0.1]))

			const result = await cache.delete('test')

			expect(result).toBe(true)
			expect(await cache.has('test')).toBe(false)
		})

		it('returns true for non-existent entry', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})

			const result = await cache.delete('unknown')

			expect(result).toBe(true)
		})

		it('decrements size stats', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})
			await cache.set('test', new Float32Array([0.1]))

			await cache.delete('test')

			const stats = cache.getStats()
			expect(stats.size).toBe(0)
		})
	})

	describe('getStats', () => {
		it('returns initial stats', () => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})

			const stats = cache.getStats()

			expect(stats.size).toBe(0)
			expect(stats.hits).toBe(0)
			expect(stats.misses).toBe(0)
		})

		it('tracks cumulative stats', async() => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'embeddings',
				ttlMs: 60000,
			})

			await cache.set('a', new Float32Array([0.1]))
			await cache.set('b', new Float32Array([0.2]))
			await cache.get('a') // hit
			await cache.get('c') // miss
			await cache.get('d') // miss

			const stats = cache.getStats()
			expect(stats.size).toBe(2)
			expect(stats.hits).toBe(1)
			expect(stats.misses).toBe(2)
		})
	})

	describe('factory function', () => {
		it('creates adapter with default options', () => {
			const cache = createIndexedDBCacheAdapter({
				database,
			})

			expect(cache).toBeDefined()
			expect(typeof cache.get).toBe('function')
			expect(typeof cache.set).toBe('function')
			expect(typeof cache.has).toBe('function')
			expect(typeof cache.delete).toBe('function')
			expect(typeof cache.getStats).toBe('function')
		})

		it('creates adapter with custom store name', () => {
			const cache = createIndexedDBCacheAdapter({
				database,
				storeName: 'custom_cache',
			})

			expect(cache).toBeDefined()
		})

		it('creates adapter with custom TTL', () => {
			const cache = createIndexedDBCacheAdapter({
				database,
				ttlMs: 300000, // 5 minutes
			})

			expect(cache).toBeDefined()
		})
	})
})
