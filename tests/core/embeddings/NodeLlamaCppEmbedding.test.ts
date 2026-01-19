/**
 * node-llama-cpp Embedding Adapter Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { createNodeLlamaCppEmbeddingAdapter } from '@mikesaintsg/adapters'
import type { NodeLlamaCppEmbeddingContext } from '@mikesaintsg/adapters'

describe('NodeLlamaCppEmbedding', () => {
	function createMockEmbeddingContext(): NodeLlamaCppEmbeddingContext {
		return {
			getEmbeddingFor: vi.fn(),
		}
	}

	describe('embed', () => {
		it('returns empty array for empty input', async () => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('embeds single text and returns Float32Array', async () => {
			const mockVector = [0.1, 0.2, 0.3, 0.4, 0.5]
			const mockContext = createMockEmbeddingContext()
			vi.mocked(mockContext.getEmbeddingFor).mockResolvedValue({
				vector: mockVector,
			})

			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed(['Hello, world!'])

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[0]!.length).toBe(5)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledWith('Hello, world!')
		})

		it('embeds batch by processing one at a time', async () => {
			const mockVectors = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
				[0.7, 0.8, 0.9],
			]
			const mockContext = createMockEmbeddingContext()
			vi.mocked(mockContext.getEmbeddingFor)
				.mockResolvedValueOnce({ vector: mockVectors[0]! })
				.mockResolvedValueOnce({ vector: mockVectors[1]! })
				.mockResolvedValueOnce({ vector: mockVectors[2]! })

			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed(['First', 'Second', 'Third'])

			expect(result).toHaveLength(3)
			expect(result[0]!.length).toBe(3)
			expect(result[1]!.length).toBe(3)
			expect(result[2]!.length).toBe(3)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledTimes(3)
		})

		it('respects abort signal', async () => {
			const mockContext = createMockEmbeddingContext()
			const controller = new AbortController()
			controller.abort()

			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			await expect(
				adapter.embed(['Hello'], { signal: controller.signal }),
			).rejects.toThrow('Aborted')
		})
	})

	describe('getModelMetadata', () => {
		it('returns default model name when not specified', () => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('node-llama-cpp-embedding')
			// maxTokens not in interface
		})

		it('returns custom model name when specified', () => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
				modelName: 'nomic-embed-text',
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('nomic-embed-text')
		})

		it('returns specified dimensions', () => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
				dimensions: 768,
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.dimensions).toBe(768)
		})

		it('auto-detects dimensions after first embed', async () => {
			const mockVector = [0.1, 0.2, 0.3, 0.4, 0.5]
			const mockContext = createMockEmbeddingContext()
			vi.mocked(mockContext.getEmbeddingFor).mockResolvedValue({
				vector: mockVector,
			})

			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			// Before embed, dimensions is 0
			expect(adapter.getModelMetadata().dimensions).toBe(0)

			await adapter.embed(['Hello'])

			// After embed, dimensions are detected
			expect(adapter.getModelMetadata().dimensions).toBe(5)
		})
	})
})
