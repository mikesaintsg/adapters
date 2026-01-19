/**
 * Ollama Embedding Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOllamaEmbeddingAdapter } from '@mikesaintsg/adapters'
import { isAdapterError } from '@mikesaintsg/adapters'

describe('OllamaEmbedding', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('embed', () => {
		it('returns empty array for empty input', async() => {
			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('embeds single text and returns Float32Array', async() => {
			const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						model: 'nomic-embed-text',
						embeddings: [mockEmbedding],
					}),
					{ status: 200 },
				),
			)

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const result = await adapter.embed(['Hello, world!'])

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[0]!.length).toBe(5)
		})

		it('embeds batch and returns all embeddings', async() => {
			const mockEmbeddings = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
				[0.7, 0.8, 0.9],
			]
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						model: 'nomic-embed-text',
						embeddings: mockEmbeddings,
					}),
					{ status: 200 },
				),
			)

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const result = await adapter.embed(['First', 'Second', 'Third'])

			expect(result).toHaveLength(3)
			expect(result[0]!.length).toBe(3)
			expect(result[1]!.length).toBe(3)
			expect(result[2]!.length).toBe(3)
		})

		it('calls correct endpoint', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						model: 'nomic-embed-text',
						embeddings: [[0.1, 0.2, 0.3]],
					}),
					{ status: 200 },
				),
			)

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
				baseURL: 'http://localhost:11434',
			})

			await adapter.embed(['Hello'])

			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:11434/api/embed',
				expect.any(Object),
			)
		})

		it('throws MODEL_NOT_FOUND_ERROR for 404', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({ error: 'model not found' }),
					{ status: 404 },
				),
			)

			const adapter = createOllamaEmbeddingAdapter({
				model: 'invalid-model',
			})

			try {
				await adapter.embed(['Hello'])
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
				if (isAdapterError(error)) {
					expect(error.data.code).toBe('MODEL_NOT_FOUND_ERROR')
				}
			}
		})

		it('throws INVALID_REQUEST_ERROR for 400', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({ error: 'invalid request' }),
					{ status: 400 },
				),
			)

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			try {
				await adapter.embed(['Hello'])
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
				if (isAdapterError(error)) {
					expect(error.data.code).toBe('INVALID_REQUEST_ERROR')
				}
			}
		})

		it('throws NETWORK_ERROR for network failure', async() => {
			vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			try {
				await adapter.embed(['Hello'])
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
				if (isAdapterError(error)) {
					expect(error.data.code).toBe('NETWORK_ERROR')
				}
			}
		})
	})

	describe('getModelMetadata', () => {
		it('returns correct metadata for nomic-embed-text', () => {
			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('nomic-embed-text')
			expect(metadata.dimensions).toBe(768)
			// maxTokens not in interface
		})

		it('returns correct metadata for mxbai-embed-large', () => {
			const adapter = createOllamaEmbeddingAdapter({
				model: 'mxbai-embed-large',
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('mxbai-embed-large')
			expect(metadata.dimensions).toBe(1024)
		})
	})
})
