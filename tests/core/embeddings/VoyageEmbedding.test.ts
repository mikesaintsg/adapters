/**
 * Voyage Embedding Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createVoyageEmbeddingAdapter } from '@mikesaintsg/adapters'
import { isAdapterError } from '@mikesaintsg/adapters'

describe('VoyageEmbedding', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('embed', () => {
		it('returns empty array for empty input', async() => {
			const adapter = createVoyageEmbeddingAdapter({
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
						model: 'voyage-3',
						usage: { total_tokens: 5 },
					}),
					{ status: 200 },
				),
			)

			const adapter = createVoyageEmbeddingAdapter({
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
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						object: 'list',
						data: [
							{ object: 'embedding', embedding: mockEmbeddings[2], index: 2 },
							{ object: 'embedding', embedding: mockEmbeddings[0], index: 0 },
							{ object: 'embedding', embedding: mockEmbeddings[1], index: 1 },
						],
						model: 'voyage-3',
						usage: { total_tokens: 15 },
					}),
					{ status: 200 },
				),
			)

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed(['First', 'Second', 'Third'])

			expect(result).toHaveLength(3)
			expect(result[0]!.length).toBe(3)
			expect(result[1]!.length).toBe(3)
			expect(result[2]!.length).toBe(3)
		})

		it('includes input_type in request when specified', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						object: 'list',
						data: [{ object: 'embedding', embedding: [0.1, 0.2, 0.3], index: 0 }],
						model: 'voyage-3',
						usage: { total_tokens: 5 },
					}),
					{ status: 200 },
				),
			)

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				inputType: 'document',
			})

			await adapter.embed(['Hello'])

			expect(fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('"input_type":"document"'),
				}),
			)
		})

		it('throws AUTHENTICATION_ERROR for 401', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({ detail: 'Invalid API key' }),
					{ status: 401 },
				),
			)

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'invalid-key',
			})

			try {
				await adapter.embed(['Hello'])
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
				if (isAdapterError(error)) {
					expect(error.data.code).toBe('AUTHENTICATION_ERROR')
				}
			}
		})

		it('throws RATE_LIMIT_ERROR for 429', async() => {
			vi.mocked(fetch).mockResolvedValue(
				new Response(
					JSON.stringify({ detail: 'Rate limit exceeded' }),
					{
						status: 429,
						headers: { 'retry-after': '10' },
					},
				),
			)

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
			})

			try {
				await adapter.embed(['Hello'])
			} catch (error) {
				expect(isAdapterError(error)).toBe(true)
				if (isAdapterError(error)) {
					expect(error.data.code).toBe('RATE_LIMIT_ERROR')
					expect(error.data.retryAfter).toBe(10000)
				}
			}
		})
	})

	describe('getModelMetadata', () => {
		it('returns correct metadata for voyage-3', () => {
			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'voyage-3',
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('voyage-3')
			expect(metadata.dimensions).toBe(1024)
			// maxTokens not in interface
		})

		it('returns correct metadata for voyage-3-lite', () => {
			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'voyage-3-lite',
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('voyage-3-lite')
			expect(metadata.dimensions).toBe(512)
		})
	})
})
