/**
 * Cohere reranker adapter tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { createCohereRerankerAdapter } from '@mikesaintsg/adapters'
import type { ScoredResult } from '@mikesaintsg/core'

describe('CohereReranker', () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		globalThis.fetch = vi.fn() as typeof fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	describe('createCohereRerankerAdapter', () => {
		it('creates reranker with provided options', () => {
			const reranker = createCohereRerankerAdapter({
				apiKey: 'test-key',
				model: 'rerank-multilingual-v3.0',
			})

			expect(reranker.getModelId()).toBe('rerank-multilingual-v3.0')
		})

		it('uses default model if not specified', () => {
			const reranker = createCohereRerankerAdapter({
				apiKey: 'test-key',
			})

			expect(reranker.getModelId()).toBe('rerank-english-v3.0')
		})

		it('reranks documents successfully', async() => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					id: 'test-id',
					results: [
						{ index: 2, relevance_score: 0.95 },
						{ index: 0, relevance_score: 0.75 },
						{ index: 1, relevance_score: 0.50 },
					],
					meta: { api_version: { version: '1' } },
				}),
			} as Response)

			const reranker = createCohereRerankerAdapter({
				apiKey: 'test-key',
			})

			const docs: ScoredResult[] = [
				{ id: '1', content: 'Document about ML', score: 0.8 },
				{ id: '2', content: 'Document about cooking', score: 0.6 },
				{ id: '3', content: 'Document about AI', score: 0.7 },
			]

			const results = await reranker.rerank('What is machine learning?', docs)

			expect(results).toHaveLength(3)
			expect(results[0]?.score).toBe(0.95)
			expect(results[0]?.id).toBe('3') // Original index 2
		})

		it('returns empty array for empty input', async() => {
			const reranker = createCohereRerankerAdapter({
				apiKey: 'test-key',
			})

			const results = await reranker.rerank('query', [])

			expect(results).toHaveLength(0)
		})

		it('throws on authentication error', async() => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: false,
				status: 401,
			} as Response)

			const reranker = createCohereRerankerAdapter({
				apiKey: 'invalid-key',
			})

			const docs: ScoredResult[] = [
				{ id: '1', content: 'Test', score: 0.5 },
			]

			await expect(reranker.rerank('query', docs)).rejects.toThrow()
		})

		it('throws on rate limit error', async() => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: false,
				status: 429,
			} as Response)

			const reranker = createCohereRerankerAdapter({
				apiKey: 'test-key',
			})

			const docs: ScoredResult[] = [
				{ id: '1', content: 'Test', score: 0.5 },
			]

			await expect(reranker.rerank('query', docs)).rejects.toThrow()
		})

		it('sends correct request format', async() => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					id: 'test-id',
					results: [{ index: 0, relevance_score: 0.9 }],
					meta: { api_version: { version: '1' } },
				}),
			} as Response)

			const reranker = createCohereRerankerAdapter({
				apiKey: 'test-key',
				model: 'rerank-english-v3.0',
				baseURL: 'https://custom.cohere.ai/v1',
			})

			const docs: ScoredResult[] = [
				{ id: '1', content: 'Test document', score: 0.5 },
			]

			await reranker.rerank('test query', docs)

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://custom.cohere.ai/v1/rerank',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-key',
						'Content-Type': 'application/json',
					}),
				}),
			)

			const calls = vi.mocked(globalThis.fetch).mock.calls
			const firstCall = calls[0]
			if (firstCall?.[1] && typeof firstCall[1].body === 'string') {
				const body = JSON.parse(firstCall[1].body) as Record<string, unknown>
				expect(body.query).toBe('test query')
				expect(body.documents).toEqual(['Test document'])
				expect(body.model).toBe('rerank-english-v3.0')
			}
		})
	})
})
