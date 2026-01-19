/**
 * HuggingFace Embedding Adapter Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'
import type { HuggingFaceFeatureExtractionPipeline, HuggingFaceTensor } from '@mikesaintsg/adapters'

describe('HuggingFaceEmbedding', () => {
	function createMockTensor(data: number[][]): HuggingFaceTensor {
		return {
			data: new Float32Array(data.flat()),
			dims: [data.length, data[0]!.length],
			type: 'float32',
			size: data.flat().length,
			tolist: () => data,
			dispose: vi.fn(),
		}
	}

	function createMockPipeline(): HuggingFaceFeatureExtractionPipeline {
		return vi.fn() as unknown as HuggingFaceFeatureExtractionPipeline
	}

	describe('embed', () => {
		it('returns empty array for empty input', async () => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 384,
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('embeds single text and returns Float32Array', async () => {
			const mockEmbedding = [[0.1, 0.2, 0.3, 0.4, 0.5]]
			const mockPipeline = createMockPipeline()
			vi.mocked(mockPipeline).mockResolvedValue(createMockTensor(mockEmbedding))

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 5,
			})

			const result = await adapter.embed(['Hello, world!'])

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[0]!.length).toBe(5)
		})

		it('embeds batch and returns all embeddings', async () => {
			const mockEmbeddings = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
				[0.7, 0.8, 0.9],
			]
			const mockPipeline = createMockPipeline()
			vi.mocked(mockPipeline).mockResolvedValue(createMockTensor(mockEmbeddings))

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			const result = await adapter.embed(['First', 'Second', 'Third'])

			expect(result).toHaveLength(3)
			expect(result[0]!.length).toBe(3)
			expect(result[1]!.length).toBe(3)
			expect(result[2]!.length).toBe(3)
		})

		it('passes pooling and normalize options to pipeline', async () => {
			const mockPipeline = createMockPipeline()
			vi.mocked(mockPipeline).mockResolvedValue(createMockTensor([[0.1, 0.2, 0.3]]))

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
				pooling: 'cls',
				normalize: false,
			})

			await adapter.embed(['Hello'])

			expect(mockPipeline).toHaveBeenCalledWith(
				['Hello'],
				{ pooling: 'cls', normalize: false },
			)
		})

		it('uses default pooling and normalize values', async () => {
			const mockPipeline = createMockPipeline()
			vi.mocked(mockPipeline).mockResolvedValue(createMockTensor([[0.1, 0.2, 0.3]]))

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			await adapter.embed(['Hello'])

			expect(mockPipeline).toHaveBeenCalledWith(
				['Hello'],
				{ pooling: 'mean', normalize: true },
			)
		})

		it('disposes tensor after use', async () => {
			const mockTensor = createMockTensor([[0.1, 0.2, 0.3]])
			const mockPipeline = createMockPipeline()
			vi.mocked(mockPipeline).mockResolvedValue(mockTensor)

			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 3,
			})

			await adapter.embed(['Hello'])

			expect(mockTensor.dispose).toHaveBeenCalled()
		})
	})

	describe('getModelMetadata', () => {
		it('returns correct metadata', () => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceEmbeddingAdapter({
				pipeline: mockPipeline,
				modelName: 'all-MiniLM-L6-v2',
				dimensions: 384,
			})

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe('all-MiniLM-L6-v2')
			expect(metadata.dimensions).toBe(384)
			// maxTokens not in interface
		})
	})
})
