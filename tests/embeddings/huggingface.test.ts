/**
 * @mikesaintsg/adapters
 *
 * Tests for HuggingFace Transformers embedding adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'
import type { HuggingFaceFeatureExtractionPipeline, HuggingFaceTensor } from '@mikesaintsg/adapters'

describe('HuggingFace Embedding Adapter', () => {
	let mockPipeline: HuggingFaceFeatureExtractionPipeline
	let mockTensor: HuggingFaceTensor

	beforeEach(() => {
		// Create mock tensor with 2D output (batch_size, hidden_size)
		mockTensor = {
			data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
			dims: [2, 3], // 2 texts, 3 dimensions
			type: 'float32',
			size: 6,
			tolist: () => [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
			dispose: vi.fn(),
		}

		// Create mock pipeline
		mockPipeline = vi.fn().mockResolvedValue(mockTensor) as unknown as HuggingFaceFeatureExtractionPipeline
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('createHuggingFaceEmbeddingAdapter', () => {
		it('implements EmbeddingAdapterInterface', () => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 384,
			})

			expect(adapter.embed).toBeInstanceOf(Function)
			expect(adapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('returns correct model metadata', () => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 384,
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.provider).toBe('huggingface')
			expect(metadata.model).toBe('all-MiniLM-L6-v2')
			expect(metadata.dimensions).toBe(384)
		})

		it('throws error when pipeline is not provided', () => {
			expect(() =>
				createHuggingFaceEmbeddingAdapter({
					pipeline: undefined as unknown as HuggingFaceFeatureExtractionPipeline,
					modelName: 'test-model',
					dimensions: 384,
				}),
			).toThrow('HuggingFace pipeline is required')
		})

		it('throws error when modelName is not provided', () => {
			expect(() =>
				createHuggingFaceEmbeddingAdapter({
					pipeline: mockPipeline,
					modelName: '',
					dimensions: 384,
				}),
			).toThrow('Model name is required')
		})

		it('throws error when dimensions is invalid', () => {
			expect(() =>
				createHuggingFaceEmbeddingAdapter({
					pipeline: mockPipeline,
					modelName: 'test-model',
					dimensions: 0,
				}),
			).toThrow('Valid dimensions are required')
		})

		it('returns empty array for empty input', async() => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 384,
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
			expect(mockPipeline).not.toHaveBeenCalled()
		})

		it('calls pipeline with correct options', async() => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
				pooling: 'mean',
				normalize: true,
			})

			await adapter.embed(['Hello', 'World'])

			expect(mockPipeline).toHaveBeenCalledWith(
				['Hello', 'World'],
				{
					pooling: 'mean',
					normalize: true,
				},
			)
		})

		it('uses default pooling and normalize options', async() => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			await adapter.embed(['Hello'])

			expect(mockPipeline).toHaveBeenCalledWith(
				['Hello'],
				{
					pooling: 'mean',
					normalize: true,
				},
			)
		})

		it('parses 2D tensor output correctly', async() => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			const result = await adapter.embed(['Hello', 'World'])

			expect(result).toHaveLength(2)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[1]).toBeInstanceOf(Float32Array)
			expect(result[0]?.length).toBe(3)
			expect(result[1]?.length).toBe(3)
			expect(result[0]?.[0]).toBeCloseTo(0.1, 5)
			expect(result[0]?.[1]).toBeCloseTo(0.2, 5)
			expect(result[0]?.[2]).toBeCloseTo(0.3, 5)
			expect(result[1]?.[0]).toBeCloseTo(0.4, 5)
		})

		it('parses 3D tensor output with manual pooling', async() => {
			// Create mock tensor with 3D output (batch_size, seq_length, hidden_size)
			const threeDTensor: HuggingFaceTensor = {
				data: new Float32Array([
					// First text, first token
					0.1, 0.2, 0.3,
					// First text, second token
					0.2, 0.3, 0.4,
					// Second text, first token
					0.5, 0.6, 0.7,
					// Second text, second token
					0.6, 0.7, 0.8,
				]),
				dims: [2, 2, 3], // 2 texts, 2 tokens, 3 dimensions
				type: 'float32',
				size: 12,
				tolist: () => [],
				dispose: vi.fn(),
			}

			const threeDPipeline = vi.fn().mockResolvedValue(threeDTensor) as unknown as HuggingFaceFeatureExtractionPipeline

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: threeDPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
				pooling: 'none', // Will trigger manual pooling in adapter
			})

			const result = await adapter.embed(['Hello', 'World'])

			expect(result).toHaveLength(2)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[1]).toBeInstanceOf(Float32Array)
			expect(result[0]?.length).toBe(3)
			expect(result[1]?.length).toBe(3)
		})

		it('handles single text embedding', async() => {
			const singleTensor: HuggingFaceTensor = {
				data: new Float32Array([0.1, 0.2, 0.3]),
				dims: [1, 3],
				type: 'float32',
				size: 3,
				tolist: () => [[0.1, 0.2, 0.3]],
				dispose: vi.fn(),
			}

			const singlePipeline = vi.fn().mockResolvedValue(singleTensor) as unknown as HuggingFaceFeatureExtractionPipeline

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: singlePipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			const result = await adapter.embed(['Single text'])

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[0]?.length).toBe(3)
		})

		it('disposes tensor after extraction', async() => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			await adapter.embed(['Hello'])

			expect(mockTensor.dispose).toHaveBeenCalled()
		})

		it('handles pipeline errors', async() => {
			const errorPipeline = vi.fn().mockRejectedValue(
				new Error('Model loading failed'),
			) as unknown as HuggingFaceFeatureExtractionPipeline

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: errorPipeline,
				modelName: 'nonexistent-model',
				dimensions: 384,
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('Model loading failed')
		})

		it('handles unexpected tensor dimensions', async() => {
			const badTensor: HuggingFaceTensor = {
				data: new Float32Array([0.1]),
				dims: [1], // Invalid 1D tensor
				type: 'float32',
				size: 1,
				tolist: () => [0.1],
				dispose: vi.fn(),
			}

			const badPipeline = vi.fn().mockResolvedValue(badTensor) as unknown as HuggingFaceFeatureExtractionPipeline

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: badPipeline,
				modelName: 'test-model',
				dimensions: 1,
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('Unexpected tensor dimensions')
		})

		it('handles 4D tensor as unsupported', async() => {
			const fourDTensor: HuggingFaceTensor = {
				data: new Float32Array([0.1, 0.2, 0.3, 0.4]),
				dims: [1, 1, 2, 2], // 4D tensor
				type: 'float32',
				size: 4,
				tolist: () => [],
				dispose: vi.fn(),
			}

			const fourDPipeline = vi.fn().mockResolvedValue(fourDTensor) as unknown as HuggingFaceFeatureExtractionPipeline

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: fourDPipeline,
				modelName: 'test-model',
				dimensions: 2,
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('Unsupported tensor dimensions')
		})

		it('works without dispose method on tensor', async() => {
			const noDisposeTensor: HuggingFaceTensor = {
				data: new Float32Array([0.1, 0.2, 0.3]),
				dims: [1, 3],
				type: 'float32',
				size: 3,
				tolist: () => [[0.1, 0.2, 0.3]],
				// No dispose method
			}

			const noDisposePipeline = vi.fn().mockResolvedValue(noDisposeTensor) as unknown as HuggingFaceFeatureExtractionPipeline

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: noDisposePipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			// Should not throw
			const result = await adapter.embed(['Hello'])
			expect(result).toHaveLength(1)
		})

		it('supports cls pooling option', async() => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
				pooling: 'cls',
			})

			await adapter.embed(['Hello'])

			expect(mockPipeline).toHaveBeenCalledWith(
				['Hello'],
				{
					pooling: 'cls',
					normalize: true,
				},
			)
		})

		it('supports disabling normalization', async() => {
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
				normalize: false,
			})

			await adapter.embed(['Hello'])

			expect(mockPipeline).toHaveBeenCalledWith(
				['Hello'],
				{
					pooling: 'mean',
					normalize: false,
				},
			)
		})
	})
})
