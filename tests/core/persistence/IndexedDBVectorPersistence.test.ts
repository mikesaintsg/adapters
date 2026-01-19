/**
 * IndexedDB Vector Persistence Adapter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createIndexedDBVectorPersistenceAdapter } from '@mikesaintsg/adapters'
import type { MinimalDatabaseAccess, MinimalStoreAccess } from '@mikesaintsg/core'

// Mock database implementation for testing
function createMockDatabase(): MinimalDatabaseAccess {
	const stores = new Map<string, Map<IDBValidKey, unknown>>()

	function getStore<T>(name: string): MinimalStoreAccess<T> {
		if (!stores.has(name)) {
			stores.set(name, new Map())
		}
		const storeData = stores.get(name)!

		return {
			get(key: IDBValidKey): Promise<T | undefined> {
				return Promise.resolve(storeData.get(key) as T | undefined)
			},
			set(value: T, key?: IDBValidKey): Promise<IDBValidKey> {
				const k = key ?? (value as { id?: IDBValidKey }).id ?? Date.now()
				storeData.set(k, value)
				return Promise.resolve(k)
			},
			remove(key: IDBValidKey): Promise<void> {
				storeData.delete(key)
				return Promise.resolve()
			},
			all(): Promise<readonly T[]> {
				return Promise.resolve(Array.from(storeData.values()) as T[])
			},
			clear(): Promise<void> {
				storeData.clear()
				return Promise.resolve()
			},
		}
	}

	return {
		store<S>(name: string): MinimalStoreAccess<S> {
			return getStore<S>(name)
		},
	}
}

describe('IndexedDBVectorPersistence', () => {
	let database: MinimalDatabaseAccess

	beforeEach(() => {
		database = createMockDatabase()
	})

	describe('save and load', () => {
		it('saves and loads documents', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			const documents = [
				{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) },
				{ id: '2', content: 'World', embedding: new Float32Array([0.3, 0.4]) },
			]

			await persistence.save(documents)
			const loaded = await persistence.load()

			expect(loaded).toHaveLength(2)
			expect(loaded[0]?.id).toBe('1')
			expect(loaded[0]?.content).toBe('Hello')
			expect(loaded[0]?.embedding).toBeInstanceOf(Float32Array)
		})

		it('saves single document', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			await persistence.save({ id: '1', content: 'Test', embedding: new Float32Array([0.1]) })
			const loaded = await persistence.load()

			expect(loaded).toHaveLength(1)
		})

		it('preserves metadata in documents', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			const documents = [
				{
					id: '1',
					content: 'Test',
					embedding: new Float32Array([0.1]),
					metadata: { source: 'test', page: 1 },
				},
			]

			await persistence.save(documents)
			const loaded = await persistence.load()

			expect(loaded[0]?.metadata).toEqual({ source: 'test', page: 1 })
		})

		it('returns empty array when no documents', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			const loaded = await persistence.load()

			expect(loaded).toEqual([])
		})
	})

	describe('metadata', () => {
		it('saves and loads metadata', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			const metadata = {
				dimensions: 1536,
				model: 'text-embedding-3-small',
				provider: 'openai',
				documentCount: 10,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			await persistence.saveMetadata(metadata)
			const loaded = await persistence.loadMetadata()

			expect(loaded).toEqual(metadata)
		})

		it('returns undefined when no metadata', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			const loaded = await persistence.loadMetadata()

			expect(loaded).toBeUndefined()
		})
	})

	describe('remove', () => {
		it('removes documents by id', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			await persistence.save([
				{ id: '1', content: 'A', embedding: new Float32Array([0.1]) },
				{ id: '2', content: 'B', embedding: new Float32Array([0.2]) },
			])

			await persistence.remove('1')
			const loaded = await persistence.load()

			expect(loaded).toHaveLength(1)
			expect(loaded[0]?.id).toBe('2')
		})

		it('removes multiple documents', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			await persistence.save([
				{ id: '1', content: 'A', embedding: new Float32Array([0.1]) },
				{ id: '2', content: 'B', embedding: new Float32Array([0.2]) },
				{ id: '3', content: 'C', embedding: new Float32Array([0.3]) },
			])

			await persistence.remove(['1', '3'])
			const loaded = await persistence.load()

			expect(loaded).toHaveLength(1)
			expect(loaded[0]?.id).toBe('2')
		})
	})

	describe('clear', () => {
		it('clears all documents and metadata', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			await persistence.save([
				{ id: '1', content: 'Test', embedding: new Float32Array([0.1]) },
			])
			await persistence.saveMetadata({
				dimensions: 1,
				model: 'test',
				provider: 'test',
				documentCount: 1,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})

			await persistence.clear()

			const docs = await persistence.load()
			const meta = await persistence.loadMetadata()

			expect(docs).toEqual([])
			expect(meta).toBeUndefined()
		})
	})

	describe('isAvailable', () => {
		it('returns true when database is available', async() => {
			const persistence = createIndexedDBVectorPersistenceAdapter({ database })

			const available = await persistence.isAvailable()

			expect(available).toBe(true)
		})
	})
})
