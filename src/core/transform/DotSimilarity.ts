/**
 * Dot Product Similarity Adapter
 *
 * Calculates dot product between two embedding vectors.
 * Returns the raw dot product value (no normalization).
 */

import type { Embedding, SimilarityAdapterInterface } from '@mikesaintsg/core'

// ============================================================================
// Implementation
// ============================================================================

class DotSimilarity implements SimilarityAdapterInterface {
	readonly name = 'dot'

	compute(a: Embedding, b: Embedding): number {
		if (a.length !== b.length) {
			throw new Error(
				`Vector dimensions must match: ${a.length} !== ${b.length}`,
			)
		}

		if (a.length === 0) {
			return 0
		}

		let dotProduct = 0

		for (let i = 0; i < a.length; i++) {
			const aVal = a[i] ?? 0
			const bVal = b[i] ?? 0
			dotProduct += aVal * bVal
		}

		return dotProduct
	}
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a dot product similarity adapter.
 *
 * Dot product measures similarity as the sum of element-wise products.
 * For normalized vectors, this is equivalent to cosine similarity.
 *
 * @example
 * ```ts
 * const similarity = createDotSimilarityAdapter()
 *
 * const a = new Float32Array([1, 2, 3])
 * const b = new Float32Array([4, 5, 6])
 * similarity.calculate(a, b) // 32 (1*4 + 2*5 + 3*6)
 * ```
 */
export function createDotSimilarityAdapter(): SimilarityAdapterInterface {
	return new DotSimilarity()
}
