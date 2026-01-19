/**
 * HTTP Vector Persistence Adapter Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHTTPVectorPersistenceAdapter, isAdapterError } from '@mikesaintsg/adapters'

describe('HTTPVectorPersistence', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	describe('save', () => {
		it('sends PUT request with documents', async() => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
			})
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			await persistence.save([
				{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) },
			])

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/documents',
				expect.objectContaining({
					method: 'PUT',
				}),
			)
		})

		it('throws on error response', async() => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			})
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			await expect(persistence.save([])).rejects.toThrow()
		})
	})

	describe('load', () => {
		it('returns documents from GET request', async() => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([
					{ id: '1', content: 'Hello', embedding: [0.1, 0.2] },
				]),
			})
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			const docs = await persistence.load()

			expect(docs).toHaveLength(1)
			expect(docs[0]?.embedding).toBeInstanceOf(Float32Array)
		})

		it('returns empty array for 404', async() => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
			})
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			const docs = await persistence.load()

			expect(docs).toEqual([])
		})
	})

	describe('metadata', () => {
		it('saves metadata with PUT request', async() => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: true })
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			await persistence.saveMetadata({
				dimensions: 1536,
				model: 'test',
				provider: 'test',
				documentCount: 10,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/metadata',
				expect.objectContaining({ method: 'PUT' }),
			)
		})

		it('loads metadata from GET request', async() => {
			const metadata = {
				dimensions: 1536,
				model: 'test',
				provider: 'test',
				documentCount: 10,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(metadata),
			})
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			const loaded = await persistence.loadMetadata()

			expect(loaded).toEqual(metadata)
		})

		it('returns undefined for 404 metadata', async() => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
			})
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			const loaded = await persistence.loadMetadata()

			expect(loaded).toBeUndefined()
		})
	})

	describe('clear', () => {
		it('sends DELETE requests', async() => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: true })
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			await persistence.clear()

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/documents',
				expect.objectContaining({ method: 'DELETE' }),
			)
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/metadata',
				expect.objectContaining({ method: 'DELETE' }),
			)
		})
	})

	describe('headers', () => {
		it('includes custom headers', async() => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([]),
			})
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
				headers: { Authorization: 'Bearer token' },
			})

			await persistence.load()

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer token',
					}),
				}),
			)
		})
	})

	describe('error handling', () => {
		it('throws network error on fetch failure', async() => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network failed'))
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			try {
				await persistence.load()
				expect.fail('Should have thrown')
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
			}
		})
	})

	describe('isAvailable', () => {
		it('returns true when health check passes', async() => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: true })
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			const available = await persistence.isAvailable()

			expect(available).toBe(true)
		})

		it('returns false when health check fails', async() => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: false })
			vi.stubGlobal('fetch', mockFetch)

			const persistence = createHTTPVectorPersistenceAdapter({
				baseURL: 'https://api.example.com',
			})

			const available = await persistence.isAvailable()

			expect(available).toBe(false)
		})
	})
})
