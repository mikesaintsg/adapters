/**
 * LIFO Truncation Adapter
 *
 * Sorts context frames using Last-In-First-Out strategy.
 * Newest frames are placed at end to be removed first.
 */

import type {
	TruncationAdapterInterface,
	ContextFrame,
} from '@mikesaintsg/core'

import type { TruncationAdapterOptions } from '../../types.js'

/**
 * LIFO Truncation adapter implementation
 *
 * Sorts frames so newest are at end (removed first during truncation).
 */
class LIFOTruncationAdapter implements TruncationAdapterInterface {
	constructor(_options?: TruncationAdapterOptions) {
		// Options reserved for future use
	}

	sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
		// Keep original order: newest at end (removed first)
		return [...frames]
	}

	shouldPreserve(frame: ContextFrame): boolean {
		// Preserve frames marked as critical priority
		const meta = frame.metadata as Record<string, unknown> | undefined
		if (meta && typeof meta.priority === 'string') {
			return meta.priority === 'critical'
		}
		return false
	}
}

/**
 * Creates a LIFO Truncation adapter
 *
 * @param options - Optional truncation configuration
 * @returns TruncationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const truncator = createLIFOTruncationAdapter()
 *
 * // Sort frames (newest at end = removed first)
 * const sorted = truncator.sort(frames)
 * ```
 */
export function createLIFOTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	return new LIFOTruncationAdapter(options)
}
