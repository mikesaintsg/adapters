/**
 * Euclidean Similarity Adapter
 *
 * Converts Euclidean distance to a similarity score.
 * Uses the formula: similarity = 1 / (1 + distance)
 * Returns a value between 0 and 1, where 1 means identical vectors.
 */

import type { Embedding, SimilarityAdapterInterface } from '@mikesaintsg/core'

// ============================================================================
// Implementation
// ============================================================================

class EuclideanSimilarity implements SimilarityAdapterInterface {
	readonly name = 'euclidean'

	compute(a: Embedding, b: Embedding): number {
		if (a.length !== b.length) {
			throw new Error(
				`Vector dimensions must match: ${a.length} !== ${b.length}`,
			)
		}

		if (a.length === 0) {
			return 1 // No dimensions means no distance, so fully similar
		}

		let sumSquares = 0

		for (let i = 0; i < a.length; i++) {
			const aVal = a[i] ?? 0
			const bVal = b[i] ?? 0
			const diff = aVal - bVal
			sumSquares += diff * diff
		}

		const distance = Math.sqrt(sumSquares)

		// Convert distance to similarity (0 to 1)
		// As distance approaches 0, similarity approaches 1
		// As distance approaches infinity, similarity approaches 0
		return 1 / (1 + distance)
	}
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a Euclidean similarity adapter.
 *
 * Euclidean similarity converts distance to a similarity score using
 * the formula: 1 / (1 + distance). Returns values between 0 and 1.
 *
 * @example
 * ```ts
 * const similarity = createEuclideanSimilarityAdapter()
 *
 * const a = new Float32Array([0, 0, 0])
 * const b = new Float32Array([0, 0, 0])
 * similarity.calculate(a, b) // 1.0 (identical)
 *
 * const c = new Float32Array([1, 1, 1])
 * similarity.calculate(a, c) // ~0.366 (distance = sqrt(3))
 * ```
 */
export function createEuclideanSimilarityAdapter(): SimilarityAdapterInterface {
	return new EuclideanSimilarity()
}
