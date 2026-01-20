/**
 * Cosine Similarity Adapter
 *
 * Calculates cosine similarity between two embedding vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 */

import type { Embedding, SimilarityAdapterInterface } from '@mikesaintsg/core'

// ============================================================================
// Implementation
// ============================================================================

export class CosineSimilarity implements SimilarityAdapterInterface {
	readonly name = 'cosine'

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
		let normA = 0
		let normB = 0

		for (let i = 0; i < a.length; i++) {
			const aVal = a[i] ?? 0
			const bVal = b[i] ?? 0
			dotProduct += aVal * bVal
			normA += aVal * aVal
			normB += bVal * bVal
		}

		const magnitude = Math.sqrt(normA) * Math.sqrt(normB)

		// Handle zero vectors
		if (magnitude === 0) {
			return 0
		}

		return dotProduct / magnitude
	}
}
