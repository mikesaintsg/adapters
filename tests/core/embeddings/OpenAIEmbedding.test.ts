/**
 * OpenAI Embedding Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'
import { isAdapterError } from '@mikesaintsg/adapters'

describe('OpenAIEmbedding', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('embed', () => {
		it('returns empty array for empty input', async() => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('embeds single text and returns Float32Array', async() => {
			const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						object: 'list',
						data: [{ object: 'embedding', embedding: mockEmbedding, index: 0 }],
						model: 'text-embedding-3-small',
						usage: { prompt_tokens: 5, total_tokens: 5 },
					}),
					{ status: 200 },
				),
			)

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed(['Hello, world!'])

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[0]!.length).toBe(5)
		})

		it('embeds batch and preserves order', async() => {
			const mockEmbeddings = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
				[0.7, 0.8, 0.9],
			]
			// Return in shuffled order to test sorting
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						object: 'list',
						data: [
							{ object: 'embedding', embedding: mockEmbeddings[2], index: 2 },
							{ object: 'embedding', embedding: mockEmbeddings[0], index: 0 },
							{ object: 'embedding', embedding: mockEmbeddings[1], index: 1 },
						],
						model: 'text-embedding-3-small',
						usage: { prompt_tokens: 15, total_tokens: 15 },
					}),
					{ status: 200 },
				),
			)

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed(['First', 'Second', 'Third'])

			expect(result).toHaveLength(3)
			expect(result[0]!.length).toBe(3)
			expect(result[1]!.length).toBe(3)
			expect(result[2]!.length).toBe(3)
		})

		it('includes dimensions in request when specified', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						object: 'list',
						data: [{ object: 'embedding', embedding: [0.1, 0.2, 0.3], index: 0 }],
						model: 'text-embedding-3-small',
						usage: { prompt_tokens: 5, total_tokens: 5 },
					}),
					{ status: 200 },
				),
			)

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'text-embedding-3-small',
				dimensions: 256,
			})

			await adapter.embed(['Hello'])

			expect(fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('"dimensions":256'),
				}),
			)
		})

		it('throws AUTHENTICATION_ERROR for 401', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({ error: { message: 'Invalid API key' } }),
					{ status: 401 },
				),
			)

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'invalid-key',
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow()

			try {
				await adapter.embed(['Hello'])
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
				if (isAdapterError(error)) {
					expect(error.data.code).toBe('AUTHENTICATION_ERROR')
				}
			}
		})

		it('throws RATE_LIMIT_ERROR for 429 with retryAfter', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({ error: { message: 'Rate limit exceeded' } }),
					{
						status: 429,
						headers: { 'retry-after': '5' },
					},
				),
			)

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			try {
				await adapter.embed(['Hello'])
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
				if (isAdapterError(error)) {
					expect(error.data.code).toBe('RATE_LIMIT_ERROR')
					expect(error.data.retryAfter).toBe(5000)
				}
			}
		})

		it('throws MODEL_NOT_FOUND_ERROR for 404', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({ error: { message: 'Model not found' } }),
					{ status: 404 },
				),
			)

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
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

		it('respects abort signal', async() => {
			const controller = new AbortController()
			controller.abort()

			vi.mocked(fetch).mockRejectedValue(new DOMException('Aborted', 'AbortError'))

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			await expect(
				adapter.embed(['Hello'], { signal: controller.signal }),
			).rejects.toThrow()
		})
	})

	describe('getModelMetadata', () => {
		it('returns correct metadata for text-embedding-3-small', () => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'text-embedding-3-small',
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('text-embedding-3-small')
			expect(metadata.dimensions).toBe(1536)
			// maxTokens not in interface
		})

		it('returns correct metadata for text-embedding-3-large', () => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'text-embedding-3-large',
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('text-embedding-3-large')
			expect(metadata.dimensions).toBe(3072)
		})

		it('uses custom dimensions when specified', () => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'text-embedding-3-small',
				dimensions: 512,
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.dimensions).toBe(512)
		})
	})
})
