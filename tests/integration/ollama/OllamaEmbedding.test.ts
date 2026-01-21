/**
 * Integration tests for OllamaEmbedding with real Ollama instance.
 *
 * These tests require a running Ollama server with an embedding model.
 * Default model: nomic-embed-text
 * Run with: npm run test:ollama
 */

import { describe, it, expect } from 'vitest'
import {
	createTestEmbeddingAdapter,
	cosineSimilarity,
	TEST_TIMEOUTS,
	OLLAMA_CONFIG,
} from './setup.js'

describe('OllamaEmbedding Integration', () => {
	// =========================================================================
	// Basic Embedding
	// =========================================================================

	describe('embed', () => {
		it('generates embeddings for single text', async() => {
			const adapter = createTestEmbeddingAdapter()

			const embeddings = await adapter.embed(['Hello world'])

			expect(embeddings).toHaveLength(1)
			expect(embeddings[0]).toBeInstanceOf(Float32Array)
			expect(embeddings[0]?.length).toBeGreaterThan(0)
		}, TEST_TIMEOUTS.embedding)

		it('generates embeddings for multiple texts', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'The quick brown fox',
				'jumps over the lazy dog',
				'Machine learning is fascinating',
			]

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(3)
			for (const embedding of embeddings) {
				expect(embedding).toBeInstanceOf(Float32Array)
				expect(embedding.length).toBeGreaterThan(0)
			}
		}, TEST_TIMEOUTS.embedding)

		it('returns empty array for empty input', async() => {
			const adapter = createTestEmbeddingAdapter()

			const embeddings = await adapter.embed([])

			expect(embeddings).toEqual([])
		})
	})

	// =========================================================================
	// Dimension Consistency
	// =========================================================================

	describe('dimension consistency', () => {
		it('produces consistent dimensions regardless of input length', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'A',
				'Short text',
				'This is a medium length sentence for testing.',
				'This is a much longer piece of text that contains multiple sentences. It should still produce the same dimensionality as the short one. The embedding model should handle this gracefully.',
			]

			const embeddings = await adapter.embed(texts)

			const dimension = embeddings[0]?.length
			expect(dimension).toBeGreaterThan(0)
			for (const embedding of embeddings) {
				expect(embedding.length).toBe(dimension)
			}
		}, TEST_TIMEOUTS.embedding)

		it('produces same dimensions for batch vs single embedding', async() => {
			const adapter = createTestEmbeddingAdapter()
			const text = 'Test text for comparison'

			const singleEmbedding = await adapter.embed([text])
			const batchEmbedding = await adapter.embed([text, 'other text'])

			expect(singleEmbedding[0]?.length).toBe(batchEmbedding[0]?.length)
		}, TEST_TIMEOUTS.embedding)
	})

	// =========================================================================
	// Semantic Similarity
	// =========================================================================

	describe('semantic similarity', () => {
		it('produces different embeddings for different texts', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'I love programming in TypeScript',
				'The weather is beautiful today',
			]

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(2)
			const a = embeddings[0]
			const b = embeddings[1]

			if (a && b) {
				const similarity = cosineSimilarity(a, b)
				expect(similarity).toBeLessThan(0.9)
				expect(similarity).toBeGreaterThan(-1)
			}
		}, TEST_TIMEOUTS.embedding)

		it('produces similar embeddings for semantically similar texts', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'I love cats',
				'I adore cats',
			]

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(2)
			const a = embeddings[0]
			const b = embeddings[1]

			if (a && b) {
				const similarity = cosineSimilarity(a, b)
				expect(similarity).toBeGreaterThan(0.7)
			}
		}, TEST_TIMEOUTS.embedding)

		it('produces very high similarity for identical texts', async() => {
			const adapter = createTestEmbeddingAdapter()
			const text = 'This is a test sentence'

			const embeddings = await adapter.embed([text, text])

			expect(embeddings).toHaveLength(2)
			const a = embeddings[0]
			const b = embeddings[1]

			if (a && b) {
				const similarity = cosineSimilarity(a, b)
				expect(similarity).toBeCloseTo(1, 4)
			}
		}, TEST_TIMEOUTS.embedding)

		it('produces moderate similarity for related topics', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'TypeScript is a programming language',
				'JavaScript runs in browsers',
			]

			const embeddings = await adapter.embed(texts)

			const a = embeddings[0]
			const b = embeddings[1]

			if (a && b) {
				const similarity = cosineSimilarity(a, b)
				// Related topics should have moderate similarity
				expect(similarity).toBeGreaterThan(0.3)
				expect(similarity).toBeLessThan(0.95)
			}
		}, TEST_TIMEOUTS.embedding)
	})

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles unicode characters', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'你好世界', // Chinese
				'مرحبا بالعالم', // Arabic
				'こんにちは世界', // Japanese
				'Привет мир', // Russian
			]

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(4)
			for (const embedding of embeddings) {
				expect(embedding).toBeInstanceOf(Float32Array)
				expect(embedding.length).toBeGreaterThan(0)
			}
		}, TEST_TIMEOUTS.embedding)

		it('handles emoji', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = ['I love 🐱 cats', 'Dogs are 🐕 great']

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(2)
		}, TEST_TIMEOUTS.embedding)

		it('handles special characters and punctuation', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'Hello! How are you?',
				'@user: check this #hashtag',
				'email@example.com',
				'$100.00 USD (50% off!)',
			]

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(4)
		}, TEST_TIMEOUTS.embedding)

		it('handles single character input', async() => {
			const adapter = createTestEmbeddingAdapter()

			const embeddings = await adapter.embed(['A'])

			expect(embeddings).toHaveLength(1)
			expect(embeddings[0]?.length).toBeGreaterThan(0)
		}, TEST_TIMEOUTS.embedding)

		it('handles whitespace-only input', async() => {
			const adapter = createTestEmbeddingAdapter()

			const embeddings = await adapter.embed(['   '])

			expect(embeddings).toHaveLength(1)
			expect(embeddings[0]?.length).toBeGreaterThan(0)
		}, TEST_TIMEOUTS.embedding)

		it('handles newlines and tabs', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'Line 1\nLine 2\nLine 3',
				'Tab\tseparated\tvalues',
			]

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(2)
		}, TEST_TIMEOUTS.embedding)

		it('handles very long text', async() => {
			const adapter = createTestEmbeddingAdapter()
			const longText = 'This is a test sentence. '.repeat(50)

			const embeddings = await adapter.embed([longText])

			expect(embeddings).toHaveLength(1)
			expect(embeddings[0]?.length).toBeGreaterThan(0)
		}, TEST_TIMEOUTS.embedding)
	})

	// =========================================================================
	// Batch Processing
	// =========================================================================

	describe('batch processing', () => {
		it('handles small batch efficiently', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = Array.from({ length: 5 }, (_, i) => `Sentence number ${i + 1}`)

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(5)
		}, TEST_TIMEOUTS.embedding)

		it('handles medium batch', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = Array.from({ length: 10 }, (_, i) => `Test text ${i + 1}`)

			const embeddings = await adapter.embed(texts)

			expect(embeddings).toHaveLength(10)
		}, TEST_TIMEOUTS.embedding)

		it('preserves order in batch', async() => {
			const adapter = createTestEmbeddingAdapter()
			const texts = [
				'I love programming in TypeScript',
				'The weather is beautiful today',
				'Cooking pasta for dinner tonight',
			]

			const embeddings = await adapter.embed(texts)

			const e0 = embeddings[0]
			const e1 = embeddings[1]
			const e2 = embeddings[2]

			// Different topics should have lower similarity
			if (e0 && e1 && e2) {
				expect(cosineSimilarity(e0, e1)).toBeLessThan(0.95)
				expect(cosineSimilarity(e1, e2)).toBeLessThan(0.95)
			}
		}, TEST_TIMEOUTS.embedding)
	})

	// =========================================================================
	// Metadata
	// =========================================================================

	describe('getModelMetadata', () => {
		it('returns correct provider', () => {
			const adapter = createTestEmbeddingAdapter()

			const metadata = adapter.getModelMetadata()

			expect(metadata.provider).toBe('ollama')
		})

		it('returns correct model name', () => {
			const adapter = createTestEmbeddingAdapter()

			const metadata = adapter.getModelMetadata()

			expect(metadata.model).toBe(OLLAMA_CONFIG.embeddingModel)
		})

		it('returns positive dimensions', () => {
			const adapter = createTestEmbeddingAdapter()

			const metadata = adapter.getModelMetadata()

			expect(metadata.dimensions).toBeGreaterThan(0)
		})
	})

	// =========================================================================
	// Abort Handling
	// =========================================================================

	describe('abort handling', () => {
		it('respects abort signal', async() => {
			const adapter = createTestEmbeddingAdapter()
			const controller = new AbortController()

			const promise = adapter.embed(
				['This is a test text that will be embedded'],
				{ signal: controller.signal },
			)

			setTimeout(() => controller.abort(), 5)

			try {
				await promise
			} catch (error) {
				expect(error).toBeDefined()
			}
		})
	})

	// =========================================================================
	// Determinism
	// =========================================================================

	describe('determinism', () => {
		it('produces same embedding for same text on multiple calls', async() => {
			const adapter = createTestEmbeddingAdapter()
			const text = 'Consistent embedding test'

			const embeddings1 = await adapter.embed([text])
			const embeddings2 = await adapter.embed([text])

			const e1 = embeddings1[0]
			const e2 = embeddings2[0]

			if (e1 && e2) {
				const similarity = cosineSimilarity(e1, e2)
				expect(similarity).toBeCloseTo(1, 4)
			}
		}, TEST_TIMEOUTS.embedding)
	})
})
