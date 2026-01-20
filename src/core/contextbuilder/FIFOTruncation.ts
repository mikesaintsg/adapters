/**
 * FIFO Truncation Adapter
 *
 * Sorts context frames using First-In-First-Out strategy.
 * Oldest frames (first in array) are placed at end to be removed first.
 */

import type {
	TruncationAdapterInterface,
	ContextFrame,
} from '@mikesaintsg/core'

import type { TruncationAdapterOptions } from '../../types.js'

/**
 * FIFO Truncation adapter implementation
 *
 * Sorts frames so oldest are at end (removed first during truncation).
 */
export class FIFOTruncationAdapter implements TruncationAdapterInterface {
	constructor(_options?: TruncationAdapterOptions) {
		// Options reserved for future use
	}

	sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
		// Reverse order: oldest at end (removed first)
		return [...frames].reverse()
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
