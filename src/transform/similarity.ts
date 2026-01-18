/**
 * @mikesaintsg/adapters
 *
 * Similarity adapters implementing SimilarityAdapterInterface.
 * Provides cosine, dot product, and euclidean distance similarity functions.
 */

import type { Embedding, SimilarityAdapterInterface } from '@mikesaintsg/core'

/**
 * Create a cosine similarity adapter.
 *
 * Computes the cosine of the angle between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 *
 * @returns A SimilarityAdapterInterface implementation
 * @example
 * ```ts
 * const similarity = createCosineSimilarityAdapter()
 * const score = similarity.compute(embedding1, embedding2)
 * ```
 */
export function createCosineSimilarityAdapter(): SimilarityAdapterInterface {
	return {
		name: 'cosine',

		compute(a: Embedding, b: Embedding): number {
			if (a.length !== b.length) {
				throw new Error(`Embedding dimensions must match: ${a.length} !== ${b.length}`)
			}

			let dotProduct = 0
			let magnitudeA = 0
			let magnitudeB = 0

			for (let i = 0; i < a.length; i++) {
				const aVal = a[i] ?? 0
				const bVal = b[i] ?? 0
				dotProduct += aVal * bVal
				magnitudeA += aVal * aVal
				magnitudeB += bVal * bVal
			}

			const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)

			// Handle zero magnitude vectors
			if (magnitude === 0) {
				return 0
			}

			return dotProduct / magnitude
		},
	}
}

/**
 * Create a dot product similarity adapter.
 *
 * Computes the dot product between two vectors.
 * Higher values indicate more similarity (for normalized vectors).
 *
 * @returns A SimilarityAdapterInterface implementation
 * @example
 * ```ts
 * const similarity = createDotSimilarityAdapter()
 * const score = similarity.compute(embedding1, embedding2)
 * ```
 */
export function createDotSimilarityAdapter(): SimilarityAdapterInterface {
	return {
		name: 'dot',

		compute(a: Embedding, b: Embedding): number {
			if (a.length !== b.length) {
				throw new Error(`Embedding dimensions must match: ${a.length} !== ${b.length}`)
			}

			let dotProduct = 0
			for (let i = 0; i < a.length; i++) {
				dotProduct += (a[i] ?? 0) * (b[i] ?? 0)
			}

			return dotProduct
		},
	}
}

/**
 * Create a euclidean distance similarity adapter.
 *
 * Computes the euclidean (L2) distance between two vectors.
 * Returns a normalized similarity score where 1 means identical.
 *
 * @returns A SimilarityAdapterInterface implementation
 * @example
 * ```ts
 * const similarity = createEuclideanSimilarityAdapter()
 * const score = similarity.compute(embedding1, embedding2)
 * ```
 */
export function createEuclideanSimilarityAdapter(): SimilarityAdapterInterface {
	return {
		name: 'euclidean',

		compute(a: Embedding, b: Embedding): number {
			if (a.length !== b.length) {
				throw new Error(`Embedding dimensions must match: ${a.length} !== ${b.length}`)
			}

			let sumSquaredDiff = 0
			for (let i = 0; i < a.length; i++) {
				const diff = (a[i] ?? 0) - (b[i] ?? 0)
				sumSquaredDiff += diff * diff
			}

			const distance = Math.sqrt(sumSquaredDiff)

			// Convert distance to similarity score (closer = higher score)
			// Using 1 / (1 + distance) normalization
			return 1 / (1 + distance)
		},
	}
}
