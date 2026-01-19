/**
 * Cosine Similarity Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createCosineSimilarityAdapter } from '@mikesaintsg/adapters'

describe('CosineSimilarity', () => {
	it('has correct name', () => {
		const similarity = createCosineSimilarityAdapter()
		expect(similarity.name).toBe('cosine')
	})

	it('returns 1.0 for identical vectors', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([1, 0, 0])
		const b = new Float32Array([1, 0, 0])

		expect(similarity.compute(a, b)).toBeCloseTo(1.0)
	})

	it('returns 0.0 for orthogonal vectors', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([1, 0, 0])
		const b = new Float32Array([0, 1, 0])

		expect(similarity.compute(a, b)).toBeCloseTo(0.0)
	})

	it('returns -1.0 for opposite vectors', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([1, 0, 0])
		const b = new Float32Array([-1, 0, 0])

		expect(similarity.compute(a, b)).toBeCloseTo(-1.0)
	})

	it('ignores magnitude (normalized result)', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([1, 0, 0])
		const b = new Float32Array([10, 0, 0])

		expect(similarity.compute(a, b)).toBeCloseTo(1.0)
	})

	it('computes similarity for non-unit vectors', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([3, 4, 0])
		const b = new Float32Array([4, 3, 0])

		// cos(θ) = (3*4 + 4*3) / (5 * 5) = 24/25 = 0.96
		expect(similarity.compute(a, b)).toBeCloseTo(0.96)
	})

	it('throws for dimension mismatch', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([1, 2, 3])
		const b = new Float32Array([1, 2])

		expect(() => similarity.compute(a, b)).toThrow('dimensions must match')
	})

	it('returns 0 for empty vectors', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([])
		const b = new Float32Array([])

		expect(similarity.compute(a, b)).toBe(0)
	})

	it('returns 0 for zero vectors', () => {
		const similarity = createCosineSimilarityAdapter()
		const a = new Float32Array([0, 0, 0])
		const b = new Float32Array([0, 0, 0])

		expect(similarity.compute(a, b)).toBe(0)
	})

	it('handles high-dimensional vectors', () => {
		const similarity = createCosineSimilarityAdapter()
		const dim = 1536
		const a = new Float32Array(dim).fill(1)
		const b = new Float32Array(dim).fill(1)

		expect(similarity.compute(a, b)).toBeCloseTo(1.0)
	})
})
