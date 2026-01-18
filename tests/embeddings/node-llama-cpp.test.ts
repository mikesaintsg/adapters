/**
 * @mikesaintsg/adapters
 *
 * Tests for node-llama-cpp embedding adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNodeLlamaCppEmbeddingAdapter } from '@mikesaintsg/adapters'
import type { NodeLlamaCppEmbeddingContext } from '@mikesaintsg/adapters'

/**
 * Create a mock node-llama-cpp embedding context for testing.
 */
function createMockEmbeddingContext(options?: {
	dimensions?: number
	error?: Error
}): NodeLlamaCppEmbeddingContext {
	const dimensions = options?.dimensions ?? 384
	const error = options?.error

	return {
		getEmbeddingFor: vi.fn().mockImplementation((_text: string) => {
			if (error) {
				return Promise.reject(error)
			}
			// Return a mock embedding vector
			return Promise.resolve({
				vector: Array.from({ length: dimensions }, (_, i) => i / dimensions),
			})
		}),
	}
}

describe('node-llama-cpp Embedding Adapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('createNodeLlamaCppEmbeddingAdapter', () => {
		it('implements EmbeddingAdapterInterface', () => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			expect(adapter.embed).toBeInstanceOf(Function)
			expect(adapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('returns correct model metadata with default name', () => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.provider).toBe('node-llama-cpp')
			expect(metadata.model).toBe('node-llama-cpp-embedding')
			// Dimensions are 0 until first embedding is generated
			expect(metadata.dimensions).toBe(0)
		})

		it('returns correct model metadata with custom name', () => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
				modelName: 'nomic-embed-text',
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.model).toBe('nomic-embed-text')
		})

		it('returns correct dimensions when specified', () => {
			const mockContext = createMockEmbeddingContext({ dimensions: 768 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
				dimensions: 768,
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.dimensions).toBe(768)
		})

		it('returns empty array for empty input', async() => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])

			// Should not call the embedding context
			expect(mockContext.getEmbeddingFor).not.toHaveBeenCalled()
		})

		it('embeds single text', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 384 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed(['Hello, world!'])

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[0]?.length).toBe(384)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledWith('Hello, world!')
		})

		it('embeds multiple texts', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 384 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const texts = ['Hello', 'World', 'Test']
			const result = await adapter.embed(texts)

			expect(result).toHaveLength(3)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[1]).toBeInstanceOf(Float32Array)
			expect(result[2]).toBeInstanceOf(Float32Array)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledTimes(3)
		})

		it('detects dimensions from first embedding', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 512 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			// Before embedding, dimensions are 0
			expect(adapter.getModelMetadata().dimensions).toBe(0)

			await adapter.embed(['Hello'])

			// After embedding, dimensions should be detected
			expect(adapter.getModelMetadata().dimensions).toBe(512)
		})

		it('handles abort signal before start', async() => {
			const mockContext = createMockEmbeddingContext()
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const abortController = new AbortController()
			abortController.abort()

			await expect(
				adapter.embed(['Hello'], { signal: abortController.signal }),
			).rejects.toThrow()

			// Should not call the embedding context
			expect(mockContext.getEmbeddingFor).not.toHaveBeenCalled()
		})

		it('handles errors from embedding context', async() => {
			const error = new Error('Model not loaded')
			const mockContext = createMockEmbeddingContext({ error })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('Model not loaded')
		})

		it('wraps unknown errors', async() => {
			const mockContext: NodeLlamaCppEmbeddingContext = {
				getEmbeddingFor: vi.fn().mockRejectedValue('string error'),
			}
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow()
		})

		it('returns Float32Array embeddings', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 256 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed(['Test'])

			expect(result[0]).toBeInstanceOf(Float32Array)
			// Verify values are correct
			expect(result[0]?.[0]).toBeCloseTo(0, 5)
			expect(result[0]?.[1]).toBeCloseTo(1 / 256, 5)
		})

		it('processes texts sequentially', async() => {
			const callOrder: string[] = []
			const mockContext: NodeLlamaCppEmbeddingContext = {
				getEmbeddingFor: vi.fn().mockImplementation((text: string) => {
					callOrder.push(text)
					return Promise.resolve({ vector: [0.1, 0.2, 0.3] })
				}),
			}
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			await adapter.embed(['First', 'Second', 'Third'])

			expect(callOrder).toEqual(['First', 'Second', 'Third'])
		})

		it('preserves specified dimensions over detected', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 768 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
				dimensions: 512, // Explicitly specified
			})

			// Even after embedding, should use specified dimensions
			await adapter.embed(['Hello'])

			const metadata = adapter.getModelMetadata()
			expect(metadata.dimensions).toBe(512)
		})

		it('handles abort signal during processing', async() => {
			let resolveSecond: (() => void) | undefined
			const secondEmbedPromise = new Promise<void>(resolve => {
				resolveSecond = resolve
			})

			const mockContext: NodeLlamaCppEmbeddingContext = {
				getEmbeddingFor: vi.fn()
					.mockImplementationOnce(() => Promise.resolve({ vector: [0.1, 0.2, 0.3] }))
					.mockImplementationOnce(() => secondEmbedPromise.then(() => ({ vector: [0.1, 0.2, 0.3] })))
					.mockImplementation(() => Promise.resolve({ vector: [0.1, 0.2, 0.3] })),
			}
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const abortController = new AbortController()

			// Start embedding
			const promise = adapter.embed(['First', 'Second', 'Third'], { signal: abortController.signal })

			// Wait for first embedding to complete
			await new Promise(resolve => setTimeout(resolve, 10))

			// Abort while waiting for second
			abortController.abort()

			// Resolve second to allow it to proceed
			resolveSecond?.()

			// Should throw due to abort
			await expect(promise).rejects.toThrow()
		})

		it('maintains consistent behavior across multiple calls', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 384 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			// First call
			const result1 = await adapter.embed(['Hello'])
			// Second call
			const result2 = await adapter.embed(['World'])
			// Third call with multiple texts
			const result3 = await adapter.embed(['Foo', 'Bar'])

			expect(result1[0]).toBeInstanceOf(Float32Array)
			expect(result2[0]).toBeInstanceOf(Float32Array)
			expect(result3.length).toBe(2)
		})

		it('handles very long text input', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 384 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const longText = 'A'.repeat(10000) // 10K characters
			const result = await adapter.embed([longText])

			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledWith(longText)
		})

		it('handles unicode text properly', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 384 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const unicodeText = '你好世界 🌍 مرحبا'
			const result = await adapter.embed([unicodeText])

			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledWith(unicodeText)
		})

		it('handles empty string input', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 384 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed([''])

			expect(result.length).toBe(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledWith('')
		})

		it('handles mixed empty and non-empty strings', async() => {
			const mockContext = createMockEmbeddingContext({ dimensions: 384 })
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			const result = await adapter.embed(['Hello', '', 'World'])

			expect(result.length).toBe(3)
			expect(mockContext.getEmbeddingFor).toHaveBeenCalledTimes(3)
		})

		it('throws AdapterError for non-AdapterError exceptions', async() => {
			const mockContext: NodeLlamaCppEmbeddingContext = {
				getEmbeddingFor: vi.fn().mockRejectedValue(new TypeError('Type error')),
			}
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('Type error')
		})

		it('re-throws AdapterError without wrapping', async() => {
			// Import AdapterError to create one for testing
			const { AdapterError } = await import('@mikesaintsg/adapters')
			const originalError = new AdapterError('RATE_LIMIT_ERROR', 'Rate limited')

			const mockContext: NodeLlamaCppEmbeddingContext = {
				getEmbeddingFor: vi.fn().mockRejectedValue(originalError),
			}
			const adapter = createNodeLlamaCppEmbeddingAdapter({
				embeddingContext: mockContext,
			})

			try {
				await adapter.embed(['Hello'])
				expect.fail('Should have thrown')
			} catch (error) {
				expect(error).toBe(originalError)
			}
		})
	})
})
