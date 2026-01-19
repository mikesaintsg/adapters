/**
 * Dot Product Similarity Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createDotSimilarityAdapter } from '@mikesaintsg/adapters'

describe('DotSimilarity', () => {
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

	it('returns 0 for orthogonal vectors', () => {
		const similarity = createDotSimilarityAdapter()
		const a = new Float32Array([1, 0, 0])
		const b = new Float32Array([0, 1, 0])

		expect(similarity.compute(a, b)).toBe(0)
	})

	it('returns positive for same direction', () => {
		const similarity = createDotSimilarityAdapter()
		const a = new Float32Array([1, 1, 1])
		const b = new Float32Array([1, 1, 1])

		expect(similarity.compute(a, b)).toBe(3)
	})

	it('returns negative for opposite direction', () => {
		const similarity = createDotSimilarityAdapter()
		const a = new Float32Array([1, 1, 1])
		const b = new Float32Array([-1, -1, -1])

		expect(similarity.compute(a, b)).toBe(-3)
	})

	it('magnitude affects result', () => {
		const similarity = createDotSimilarityAdapter()
		const a = new Float32Array([1, 0, 0])
		const b1 = new Float32Array([1, 0, 0])
		const b2 = new Float32Array([10, 0, 0])

		expect(similarity.compute(a, b2)).toBe(10 * similarity.compute(a, b1))
	})

	it('throws for dimension mismatch', () => {
		const similarity = createDotSimilarityAdapter()
		const a = new Float32Array([1, 2, 3])
		const b = new Float32Array([1, 2])

		expect(() => similarity.compute(a, b)).toThrow('dimensions must match')
	})

	it('returns 0 for empty vectors', () => {
		const similarity = createDotSimilarityAdapter()
		const a = new Float32Array([])
		const b = new Float32Array([])

		expect(similarity.compute(a, b)).toBe(0)
	})

	it('handles high-dimensional vectors', () => {
		const similarity = createDotSimilarityAdapter()
		const dim = 1536
		const a = new Float32Array(dim).fill(1)
		const b = new Float32Array(dim).fill(1)

		expect(similarity.compute(a, b)).toBe(dim)
	})
})
