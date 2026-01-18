/**
 * @mikesaintsg/adapters
 *
 * Tests for similarity adapters.
 */

import { describe, it, expect } from 'vitest'
import {
	createCosineSimilarityAdapter,
	createDotSimilarityAdapter,
	createEuclideanSimilarityAdapter,
} from '@mikesaintsg/adapters'

describe('Similarity Adapters', () => {
	describe('createCosineSimilarityAdapter', () => {
		it('has correct name', () => {
			const similarity = createCosineSimilarityAdapter()

			expect(similarity.name).toBe('cosine')
		})

		it('computes similarity of identical vectors as 1', () => {
			const similarity = createCosineSimilarityAdapter()
			const vec = new Float32Array([1, 2, 3])

			expect(similarity.compute(vec, vec)).toBeCloseTo(1, 5)
		})

		it('computes similarity of orthogonal vectors as 0', () => {
			const similarity = createCosineSimilarityAdapter()
			const a = new Float32Array([1, 0, 0])
			const b = new Float32Array([0, 1, 0])

			expect(similarity.compute(a, b)).toBeCloseTo(0, 5)
		})

		it('computes similarity of opposite vectors as -1', () => {
			const similarity = createCosineSimilarityAdapter()
			const a = new Float32Array([1, 2, 3])
			const b = new Float32Array([-1, -2, -3])

			expect(similarity.compute(a, b)).toBeCloseTo(-1, 5)
		})

		it('handles normalized vectors', () => {
			const similarity = createCosineSimilarityAdapter()
			const a = new Float32Array([0.6, 0.8])
			const b = new Float32Array([0.8, 0.6])

			const result = similarity.compute(a, b)
			expect(result).toBeGreaterThan(0.9) // High similarity
			expect(result).toBeLessThanOrEqual(1)
		})

		it('handles zero vectors', () => {
			const similarity = createCosineSimilarityAdapter()
			const a = new Float32Array([0, 0, 0])
			const b = new Float32Array([1, 2, 3])

			expect(similarity.compute(a, b)).toBe(0)
		})

		it('throws for dimension mismatch', () => {
			const similarity = createCosineSimilarityAdapter()
			const a = new Float32Array([1, 2, 3])
			const b = new Float32Array([1, 2])

			expect(() => similarity.compute(a, b)).toThrow('Embedding dimensions must match')
		})
	})

	describe('createDotSimilarityAdapter', () => {
		it('has correct name', () => {
			const similarity = createDotSimilarityAdapter()

			expect(similarity.name).toBe('dot')
		})

		it('computes dot product correctly', () => {
			const similarity = createDotSimilarityAdapter()
			const a = new Float32Array([1, 2, 3])
			const b = new Float32Array([4, 5, 6])

			// 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
			expect(similarity.compute(a, b)).toBe(32)
		})

		it('computes dot product of orthogonal vectors as 0', () => {
			const similarity = createDotSimilarityAdapter()
			const a = new Float32Array([1, 0, 0])
			const b = new Float32Array([0, 1, 0])

			expect(similarity.compute(a, b)).toBe(0)
		})

		it('handles unit vectors', () => {
			const similarity = createDotSimilarityAdapter()
			const a = new Float32Array([1, 0, 0])
			const b = new Float32Array([1, 0, 0])

			expect(similarity.compute(a, b)).toBe(1)
		})

		it('handles negative values', () => {
			const similarity = createDotSimilarityAdapter()
			const a = new Float32Array([1, -2, 3])
			const b = new Float32Array([-1, 2, -3])

			// 1*(-1) + (-2)*2 + 3*(-3) = -1 - 4 - 9 = -14
			expect(similarity.compute(a, b)).toBe(-14)
		})

		it('throws for dimension mismatch', () => {
			const similarity = createDotSimilarityAdapter()
			const a = new Float32Array([1, 2])
			const b = new Float32Array([1, 2, 3])

			expect(() => similarity.compute(a, b)).toThrow('Embedding dimensions must match')
		})
	})

	describe('createEuclideanSimilarityAdapter', () => {
		it('has correct name', () => {
			const similarity = createEuclideanSimilarityAdapter()

			expect(similarity.name).toBe('euclidean')
		})

		it('computes similarity of identical vectors as 1', () => {
			const similarity = createEuclideanSimilarityAdapter()
			const vec = new Float32Array([1, 2, 3])

			expect(similarity.compute(vec, vec)).toBe(1)
		})

		it('computes similarity decreases with distance', () => {
			const similarity = createEuclideanSimilarityAdapter()
			const a = new Float32Array([0, 0])
			const near = new Float32Array([1, 0])
			const far = new Float32Array([10, 0])

			const nearScore = similarity.compute(a, near)
			const farScore = similarity.compute(a, far)

			expect(nearScore).toBeGreaterThan(farScore)
		})

		it('returns value between 0 and 1', () => {
			const similarity = createEuclideanSimilarityAdapter()
			const a = new Float32Array([0, 0, 0])
			const b = new Float32Array([100, 100, 100])

			const score = similarity.compute(a, b)
			expect(score).toBeGreaterThan(0)
			expect(score).toBeLessThanOrEqual(1)
		})

		it('handles zero vectors', () => {
			const similarity = createEuclideanSimilarityAdapter()
			const a = new Float32Array([0, 0])
			const b = new Float32Array([0, 0])

			expect(similarity.compute(a, b)).toBe(1)
		})

		it('throws for dimension mismatch', () => {
			const similarity = createEuclideanSimilarityAdapter()
			const a = new Float32Array([1])
			const b = new Float32Array([1, 2])

			expect(() => similarity.compute(a, b)).toThrow('Embedding dimensions must match')
		})
	})

	describe('Edge Cases', () => {
		it('handles empty vectors', () => {
			const cosine = createCosineSimilarityAdapter()
			const dot = createDotSimilarityAdapter()
			const euclidean = createEuclideanSimilarityAdapter()

			const empty = new Float32Array([])

			expect(cosine.compute(empty, empty)).toBe(0)
			expect(dot.compute(empty, empty)).toBe(0)
			expect(euclidean.compute(empty, empty)).toBe(1)
		})

		it('handles single-element vectors', () => {
			const cosine = createCosineSimilarityAdapter()
			const a = new Float32Array([5])
			const b = new Float32Array([5])

			expect(cosine.compute(a, b)).toBeCloseTo(1, 5)
		})

		it('handles very large vectors', () => {
			const cosine = createCosineSimilarityAdapter()
			const size = 1536 // Common embedding size
			const a = new Float32Array(size).fill(1)
			const b = new Float32Array(size).fill(1)

			expect(cosine.compute(a, b)).toBeCloseTo(1, 5)
		})

		it('handles very small values', () => {
			const cosine = createCosineSimilarityAdapter()
			const a = new Float32Array([1e-10, 1e-10])
			const b = new Float32Array([1e-10, 1e-10])

			expect(cosine.compute(a, b)).toBeCloseTo(1, 5)
		})
	})
})
