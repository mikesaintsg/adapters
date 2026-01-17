/**
 * @mikesaintsg/adapters
 *
 * Integration tests for embedding adapter composition.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	createOpenAIEmbeddingAdapter,
	createBatchedEmbeddingAdapter,
	createCachedEmbeddingAdapter,
} from '@mikesaintsg/adapters'
import type { CachedEmbedding } from '@mikesaintsg/adapters'

describe('Embedding Adapter Composition', () => {
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.restoreAllMocks()
	})

	describe('cached + batched + base composition', () => {
		it('creates composed adapter with all wrappers', () => {
			const baseAdapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const batchedAdapter = createBatchedEmbeddingAdapter({
				adapter: baseAdapter,
				batchSize: 100,
				delayMs: 50,
				deduplicate: true,
			})

			const cache = new Map<string, CachedEmbedding>()
			const cachedAdapter = createCachedEmbeddingAdapter({
				adapter: batchedAdapter,
				cache,
				ttlMs: 3600000,
			})

			expect(cachedAdapter.embed).toBeInstanceOf(Function)
			expect(cachedAdapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('preserves model metadata through composition', () => {
			const baseAdapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'text-embedding-3-small',
				dimensions: 1536,
			})

			const batchedAdapter = createBatchedEmbeddingAdapter({
				adapter: baseAdapter,
				batchSize: 100,
			})

			const cache = new Map<string, CachedEmbedding>()
			const cachedAdapter = createCachedEmbeddingAdapter({
				adapter: batchedAdapter,
				cache,
			})

			const metadata = cachedAdapter.getModelMetadata()
			expect(metadata.provider).toBe('openai')
			expect(metadata.model).toBe('text-embedding-3-small')
			expect(metadata.dimensions).toBe(1536)
		})

		it('cache layer serves from cache on repeat calls', async() => {
			const mockResponse = {
				object: 'list',
				data: [{ index: 0, embedding: [0.1, 0.2, 0.3], object: 'embedding' }],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 5, total_tokens: 5 },
			}

			let fetchCallCount = 0
			globalThis.fetch = vi.fn().mockImplementation(() => {
				fetchCallCount++
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				})
			})

			const baseAdapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const cache = new Map<string, CachedEmbedding>()
			const cachedAdapter = createCachedEmbeddingAdapter({
				adapter: baseAdapter,
				cache,
				ttlMs: 3600000,
			})

			// First call - should hit API
			const result1 = await cachedAdapter.embed(['Hello'])
			expect(result1).toHaveLength(1)
			expect(fetchCallCount).toBe(1)

			// Second call - should serve from cache
			const result2 = await cachedAdapter.embed(['Hello'])
			expect(result2).toHaveLength(1)
			expect(fetchCallCount).toBe(1) // No additional fetch
		})

		it('batched layer deduplicates identical texts', async() => {
			const mockResponse = {
				object: 'list',
				data: [{ index: 0, embedding: [0.1, 0.2, 0.3], object: 'embedding' }],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 5, total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const baseAdapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const batchedAdapter = createBatchedEmbeddingAdapter({
				adapter: baseAdapter,
				batchSize: 100,
				deduplicate: true,
			})

			// Same text repeated - should deduplicate
			const result = await batchedAdapter.embed(['Hello', 'Hello', 'Hello'])
			expect(result).toHaveLength(3)

			// All results should be the same embedding
			expect(result[0]).toEqual(result[1])
			expect(result[1]).toEqual(result[2])
		})

		it('handles empty input through all layers', async() => {
			const baseAdapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const batchedAdapter = createBatchedEmbeddingAdapter({
				adapter: baseAdapter,
			})

			const cache = new Map<string, CachedEmbedding>()
			const cachedAdapter = createCachedEmbeddingAdapter({
				adapter: batchedAdapter,
				cache,
			})

			const result = await cachedAdapter.embed([])
			expect(result).toEqual([])
		})

		it('abort signal propagates through composition', async() => {
			const mockResponse = {
				object: 'list',
				data: [{ index: 0, embedding: [0.1], object: 'embedding' }],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 5, total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const baseAdapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const cache = new Map<string, CachedEmbedding>()
			const cachedAdapter = createCachedEmbeddingAdapter({
				adapter: baseAdapter,
				cache,
			})

			const abortController = new AbortController()
			await cachedAdapter.embed(['Hello'], { signal: abortController.signal })

			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					signal: abortController.signal,
				}),
			)
		})
	})
})
