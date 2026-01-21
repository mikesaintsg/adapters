/**
 * HuggingFace Embedding Adapter Integration Tests
 *
 * Tests the embedding adapter directly.
 * Uses Xenova/all-MiniLM-L6-v2 - smallest embedding model.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'
import type { HuggingFaceFeatureExtractionPipeline } from '@mikesaintsg/adapters'
import {
	loadEmbeddingPipeline,
	createEmbedding,
	cosineSimilarity,
	l2Norm,
	HF_TEST_TIMEOUTS,
	HUGGINGFACE_CONFIG,
} from './setup.js'

// Module-level state
let embeddingPipeline: HuggingFaceFeatureExtractionPipeline | undefined
let adapter: EmbeddingAdapterInterface | undefined

beforeAll(async() => {
	console.log('[Embedding Test] Loading embedding model...')
	embeddingPipeline = await loadEmbeddingPipeline()
	adapter = createEmbedding(embeddingPipeline)
	console.log('[Embedding Test] Ready')
}, HF_TEST_TIMEOUTS.modelLoad)

afterAll(async() => {
	console.log('[Embedding Test] Disposing...')
	if (embeddingPipeline?.dispose) {
		await embeddingPipeline.dispose()
	}
	embeddingPipeline = undefined
	adapter = undefined
	console.log('[Embedding Test] Cleanup complete')
})

function getAdapter(): EmbeddingAdapterInterface {
	if (adapter === undefined) {
		throw new Error('Adapter not initialized')
	}
	return adapter
}

describe('HuggingFaceEmbedding', () => {
	// =========================================================================
	// Basic Embedding
	// =========================================================================

	describe('embed', () => {
		it('generates embeddings for single text', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['Hello world'])

			expect(embeddings).toHaveLength(1)
			expect(embeddings[0]).toBeInstanceOf(Float32Array)
			expect(embeddings[0]?.length).toBe(HUGGINGFACE_CONFIG.embeddingDimensions)
		}, HF_TEST_TIMEOUTS.embedding)

		it('generates embeddings for multiple texts', async() => {
			const a = getAdapter()

			const embeddings = await a.embed([
				'First text',
				'Second text',
				'Third text',
			])

			expect(embeddings).toHaveLength(3)
			for (const emb of embeddings) {
				expect(emb).toBeInstanceOf(Float32Array)
				expect(emb.length).toBe(HUGGINGFACE_CONFIG.embeddingDimensions)
			}
		}, HF_TEST_TIMEOUTS.embedding)

		it('returns empty array for empty input', async() => {
			const a = getAdapter()

			const embeddings = await a.embed([])

			expect(embeddings).toEqual([])
		})
	})

	// =========================================================================
	// Normalization
	// =========================================================================

	describe('normalization', () => {
		it('produces normalized embeddings (L2 norm ≈ 1)', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['Test text'])

			expect(embeddings).toHaveLength(1)
			const norm = l2Norm(embeddings[0]!)
			expect(norm).toBeCloseTo(1, 2)
		}, HF_TEST_TIMEOUTS.embedding)

		it('all batch embeddings are normalized', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['One', 'Two', 'Three'])

			for (const emb of embeddings) {
				const norm = l2Norm(emb)
				expect(norm).toBeCloseTo(1, 2)
			}
		}, HF_TEST_TIMEOUTS.embedding)
	})

	// =========================================================================
	// Semantic Similarity
	// =========================================================================

	describe('similarity', () => {
		it('identical texts have very high similarity', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['cat', 'cat'])

			const sim = cosineSimilarity(embeddings[0]!, embeddings[1]!)
			expect(sim).toBeGreaterThan(0.99)
		}, HF_TEST_TIMEOUTS.embedding)

		it('similar texts have high similarity', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['I love cats', 'I adore cats'])

			const sim = cosineSimilarity(embeddings[0]!, embeddings[1]!)
			expect(sim).toBeGreaterThan(0.8)
		}, HF_TEST_TIMEOUTS.embedding)

		it('different texts have lower similarity', async() => {
			const a = getAdapter()

			const embeddings = await a.embed([
				'The weather is nice today',
				'Machine learning is fascinating',
			])

			const sim = cosineSimilarity(embeddings[0]!, embeddings[1]!)
			expect(sim).toBeLessThan(0.7)
		}, HF_TEST_TIMEOUTS.embedding)
	})

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles unicode text', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['你好世界'])

			expect(embeddings).toHaveLength(1)
			expect(embeddings[0]?.length).toBe(HUGGINGFACE_CONFIG.embeddingDimensions)
		}, HF_TEST_TIMEOUTS.embedding)

		it('handles emoji', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['I love 🐱 cats'])

			expect(embeddings).toHaveLength(1)
		}, HF_TEST_TIMEOUTS.embedding)

		it('handles single character', async() => {
			const a = getAdapter()

			const embeddings = await a.embed(['A'])

			expect(embeddings).toHaveLength(1)
			expect(embeddings[0]?.length).toBe(HUGGINGFACE_CONFIG.embeddingDimensions)
		}, HF_TEST_TIMEOUTS.embedding)
	})

	// =========================================================================
	// Metadata
	// =========================================================================

	describe('metadata', () => {
		it('returns correct provider', () => {
			const a = getAdapter()
			const meta = a.getModelMetadata()

			expect(meta.provider).toBe('huggingface')
		})

		it('returns correct model', () => {
			const a = getAdapter()
			const meta = a.getModelMetadata()

			expect(meta.model).toBe(HUGGINGFACE_CONFIG.embeddingModel)
		})

		it('returns correct dimensions', () => {
			const a = getAdapter()
			const meta = a.getModelMetadata()

			expect(meta.dimensions).toBe(HUGGINGFACE_CONFIG.embeddingDimensions)
		})
	})

	// =========================================================================
	// Determinism
	// =========================================================================

	describe('determinism', () => {
		it('same text produces same embedding', async() => {
			const a = getAdapter()
			const text = 'Consistent test'

			const emb1 = await a.embed([text])
			const emb2 = await a.embed([text])

			const sim = cosineSimilarity(emb1[0]!, emb2[0]!)
			expect(sim).toBeGreaterThan(0.999)
		}, HF_TEST_TIMEOUTS.embedding)
	})
})
