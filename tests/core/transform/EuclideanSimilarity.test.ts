/**
 * Euclidean Similarity Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createEuclideanSimilarityAdapter } from '@mikesaintsg/adapters'

describe('EuclideanSimilarity', () => {
	it('has correct name', () => {
		const similarity = createEuclideanSimilarityAdapter()
		expect(similarity.name).toBe('euclidean')
	})

	it('returns 1.0 for identical vectors', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const a = new Float32Array([1, 2, 3])
		const b = new Float32Array([1, 2, 3])

		expect(similarity.compute(a, b)).toBe(1.0)
	})

	it('returns value less than 1 for different vectors', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const a = new Float32Array([0, 0, 0])
		const b = new Float32Array([1, 1, 1])

		// distance = sqrt(3), similarity = 1/(1+sqrt(3)) ≈ 0.366
		const result = similarity.compute(a, b)
		expect(result).toBeLessThan(1)
		expect(result).toBeGreaterThan(0)
		expect(result).toBeCloseTo(1 / (1 + Math.sqrt(3)))
	})

	it('similarity decreases with distance', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const a = new Float32Array([0, 0, 0])
		const close = new Float32Array([1, 0, 0])
		const far = new Float32Array([10, 0, 0])

		const closeSim = similarity.compute(a, close)
		const farSim = similarity.compute(a, far)

		expect(closeSim).toBeGreaterThan(farSim)
	})

	it('returns same similarity regardless of direction', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const a = new Float32Array([0, 0, 0])
		const b1 = new Float32Array([1, 0, 0])
		const b2 = new Float32Array([-1, 0, 0])

		expect(similarity.compute(a, b1)).toBe(similarity.compute(a, b2))
	})

	it('throws for dimension mismatch', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const a = new Float32Array([1, 2, 3])
		const b = new Float32Array([1, 2])

		expect(() => similarity.compute(a, b)).toThrow('dimensions must match')
	})

	it('returns 1 for empty vectors', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const a = new Float32Array([])
		const b = new Float32Array([])

		expect(similarity.compute(a, b)).toBe(1)
	})

	it('handles high-dimensional vectors', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const dim = 1536
		const a = new Float32Array(dim).fill(0)
		const b = new Float32Array(dim).fill(0)

		expect(similarity.compute(a, b)).toBe(1.0)
	})

	it('returns approximately 0.5 for distance of 1', () => {
		const similarity = createEuclideanSimilarityAdapter()
		const a = new Float32Array([0])
		const b = new Float32Array([1])

		// distance = 1, similarity = 1/(1+1) = 0.5
		expect(similarity.compute(a, b)).toBe(0.5)
	})
})
