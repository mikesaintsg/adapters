/**
 * Cross-encoder reranker adapter tests.
 */

import { describe, it, expect } from 'vitest'

import { createCrossEncoderRerankerAdapter } from '@mikesaintsg/adapters'
import type { ScoredResult } from '@mikesaintsg/core'

describe('CrossEncoderReranker', () => {
	describe('createCrossEncoderRerankerAdapter', () => {
		it('creates reranker with provided model', () => {
			const reranker = createCrossEncoderRerankerAdapter({
				model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
			})

			expect(reranker.getModelId()).toBe('cross-encoder/ms-marco-MiniLM-L-6-v2')
		})

		it('returns empty array for empty input', async() => {
			const reranker = createCrossEncoderRerankerAdapter({
				model: 'test-model',
			})

			const results = await reranker.rerank('query', [])

			expect(results).toHaveLength(0)
		})

		it('reranks documents based on relevance', async() => {
			const reranker = createCrossEncoderRerankerAdapter({
				model: 'test-model',
			})

			const docs: ScoredResult[] = [
				{ id: '1', content: 'Document about machine learning algorithms', score: 0.5 },
				{ id: '2', content: 'Recipe for chocolate cake baking', score: 0.5 },
				{ id: '3', content: 'Introduction to deep learning and neural networks', score: 0.5 },
			]

			const results = await reranker.rerank('machine learning tutorial', docs)

			expect(results).toHaveLength(3)
			// Results should have updated scores
			expect(results.every((r) => typeof r.score === 'number')).toBe(true)
		})

		it('sorts results by score descending', async() => {
			const reranker = createCrossEncoderRerankerAdapter({
				model: 'test-model',
			})

			const docs: ScoredResult[] = [
				{ id: '1', content: 'Unrelated topic', score: 0.5 },
				{ id: '2', content: 'Query relevant content here', score: 0.5 },
				{ id: '3', content: 'Somewhat related content', score: 0.5 },
			]

			const results = await reranker.rerank('query relevant', docs)

			// Check that scores are in descending order
			for (let i = 0; i < results.length - 1; i++) {
				const current = results[i]
				const next = results[i + 1]
				if (current && next) {
					expect(current.score).toBeGreaterThanOrEqual(next.score)
				}
			}
		})

		it('preserves document metadata', async() => {
			const reranker = createCrossEncoderRerankerAdapter({
				model: 'test-model',
			})

			const docs: ScoredResult[] = [
				{
					id: 'doc-1',
					content: 'Test content',
					score: 0.5,
					metadata: { source: 'test' },
				},
			]

			const results = await reranker.rerank('test', docs)

			expect(results[0]?.id).toBe('doc-1')
			expect(results[0]?.content).toBe('Test content')
			expect(results[0]?.metadata).toEqual({ source: 'test' })
		})

		it('handles single document', async() => {
			const reranker = createCrossEncoderRerankerAdapter({
				model: 'test-model',
			})

			const docs: ScoredResult[] = [
				{ id: '1', content: 'Single document', score: 0.5 },
			]

			const results = await reranker.rerank('query', docs)

			expect(results).toHaveLength(1)
			expect(results[0]?.id).toBe('1')
		})
	})
})
