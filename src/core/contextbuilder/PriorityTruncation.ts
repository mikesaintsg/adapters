/**
 * Priority Truncation Adapter
 *
 * Sorts context frames by priority for truncation.
 * Frames at the end of the sorted array are removed first.
 */

import type {
	TruncationAdapterInterface,
	ContextFrame,
} from '@mikesaintsg/core'

import type { TruncationAdapterOptions } from '../../types.js'

/**
 * Priority Truncation adapter implementation
 *
 * Sorts frames by priority (lowest priority at end = removed first).
 */
class PriorityTruncationAdapter implements TruncationAdapterInterface {
	constructor(_options?: TruncationAdapterOptions) {
		// Options reserved for future use
	}

	sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
		// Sort by priority descending (highest priority first, lowest at end)
		// Frames at end are removed first during truncation
		return [...frames].sort((a, b) => {
			const priorityA = this.#getPriorityScore(a)
			const priorityB = this.#getPriorityScore(b)
			return priorityB - priorityA // Descending (low priority at end)
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

	#getPriorityScore(frame: ContextFrame): number {
		const meta = frame.metadata as Record<string, unknown> | undefined
		if (meta && typeof meta.priority === 'string') {
			const priorityMap: Record<string, number> = {
				critical: 100,
				high: 75,
				normal: 50,
				low: 25,
				optional: 10,
			}
			return priorityMap[meta.priority] ?? 50
		}
		return 50
	}
}

/**
 * Creates a Priority Truncation adapter
 *
 * @param options - Optional truncation configuration
 * @returns TruncationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const truncator = createPriorityTruncationAdapter()
 *
 * // Sort frames by priority (low priority at end = removed first)
 * const sorted = truncator.sort(frames)
 *
 * // Check if a frame should be preserved
 * const preserve = truncator.shouldPreserve(frame)
 * ```
 */
export function createPriorityTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	return new PriorityTruncationAdapter(options)
}
