/**
 * OPFS Vector Persistence Adapter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createOPFSVectorPersistenceAdapter } from '@mikesaintsg/adapters'
import type { MinimalDirectoryAccess, MinimalFileAccess } from '@mikesaintsg/core'

// Mock directory implementation for testing
function createMockDirectory(): MinimalDirectoryAccess {
	const files = new Map<string, string>()

	function createFileAccess(name: string): MinimalFileAccess {
		return {
			getName: () => name,
			getText: () => {
				const content = files.get(name)
				if (content === undefined) return Promise.reject(new Error('File not found'))
				return Promise.resolve(content)
			},
			getArrayBuffer: () => {
				const content = files.get(name)
				if (content === undefined) return Promise.reject(new Error('File not found'))
				return Promise.resolve(new TextEncoder().encode(content).buffer)
			},
			write: (data: string | ArrayBuffer) => {
				if (typeof data === 'string') {
					files.set(name, data)
				} else {
					files.set(name, new TextDecoder().decode(data))
				}
				return Promise.resolve()
			},
		}
	}

	return {
		getFile(name: string): Promise<MinimalFileAccess | undefined> {
			if (files.has(name)) {
				return Promise.resolve(createFileAccess(name))
			}
			return Promise.resolve(undefined)
		},
		createFile(name: string): Promise<MinimalFileAccess> {
			files.set(name, '')
			return Promise.resolve(createFileAccess(name))
		},
		hasFile(name: string): Promise<boolean> {
			return Promise.resolve(files.has(name))
		},
		removeFile(name: string): Promise<void> {
			files.delete(name)
			return Promise.resolve()
		},
		listFiles(): Promise<readonly MinimalFileAccess[]> {
			return Promise.resolve(Array.from(files.keys()).map(createFileAccess))
		},
	}
}

describe('OPFSVectorPersistence', () => {
	let directory: MinimalDirectoryAccess

	beforeEach(() => {
		directory = createMockDirectory()
	})

	describe('save and load', () => {
		it('saves and loads documents', async() => {
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

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

		it('chunks large document sets', async() => {
			const persistence = createOPFSVectorPersistenceAdapter({
				directory,
				chunkSize: 2,
			})

			const documents = [
				{ id: '1', content: 'A', embedding: new Float32Array([0.1]) },
				{ id: '2', content: 'B', embedding: new Float32Array([0.2]) },
				{ id: '3', content: 'C', embedding: new Float32Array([0.3]) },
				{ id: '4', content: 'D', embedding: new Float32Array([0.4]) },
				{ id: '5', content: 'E', embedding: new Float32Array([0.5]) },
			]

			await persistence.save(documents)
			const loaded = await persistence.load()

			expect(loaded).toHaveLength(5)
		})

		it('preserves metadata in documents', async() => {
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

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
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

			const loaded = await persistence.load()

			expect(loaded).toEqual([])
		})

		it('clears old documents before save', async() => {
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

			await persistence.save([
				{ id: '1', content: 'Old', embedding: new Float32Array([0.1]) },
			])

			await persistence.save([
				{ id: '2', content: 'New', embedding: new Float32Array([0.2]) },
			])

			const loaded = await persistence.load()

			expect(loaded).toHaveLength(1)
			expect(loaded[0]?.id).toBe('2')
		})
	})

	describe('metadata', () => {
		it('saves and loads metadata', async() => {
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

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
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

			const loaded = await persistence.loadMetadata()

			expect(loaded).toBeUndefined()
		})
	})

	describe('clear', () => {
		it('clears all files', async() => {
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

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
		it('returns true when directory is available', async() => {
			const persistence = createOPFSVectorPersistenceAdapter({ directory })

			const available = await persistence.isAvailable()

			expect(available).toBe(true)
		})
	})
})
