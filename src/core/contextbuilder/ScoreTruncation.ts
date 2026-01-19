/**
 * Score Truncation Adapter
 *
 * Sorts context frames by relevance scores.
 * Lowest scoring frames are placed at end to be removed first.
 */

import type {
	TruncationAdapterInterface,
	ContextFrame,
} from '@mikesaintsg/core'

import type { TruncationAdapterOptions } from '../../types.js'

/**
 * Score Truncation adapter implementation
 *
 * Sorts frames by score (lowest scored at end = removed first).
 */
class ScoreTruncationAdapter implements TruncationAdapterInterface {
	constructor(_options?: TruncationAdapterOptions) {
		// Options reserved for future use
	}

	sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
		// Sort by score descending (highest score first, lowest at end)
		return [...frames].sort((a, b) => {
			const scoreA = this.#getScore(a)
			const scoreB = this.#getScore(b)
			return scoreB - scoreA // Descending (low score at end)
		})
	}

	shouldPreserve(frame: ContextFrame): boolean {
		// Preserve frames marked as critical priority
		const meta = frame.metadata as Record<string, unknown> | undefined
		if (meta && typeof meta.priority === 'string') {
			return meta.priority === 'critical'
		}
		return false
	}

	#getScore(frame: ContextFrame): number {
		const meta = frame.metadata as Record<string, unknown> | undefined
		if (meta && typeof meta.score === 'number') {
			return meta.score
		}
		return 0
	}
}

/**
 * Creates a Score Truncation adapter
 *
 * @param options - Optional truncation configuration
 * @returns TruncationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const truncator = createScoreTruncationAdapter()
 *
 * // Sort frames by score (low score at end = removed first)
 * const sorted = truncator.sort(frames)
 * ```
 */
export function createScoreTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	return new ScoreTruncationAdapter(options)
}
