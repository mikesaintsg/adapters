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

export class DotSimilarity implements SimilarityAdapterInterface {
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
