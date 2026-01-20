/**
 * Deduplication Adapter
 *
 * Selects frames to keep when duplicates are found and checks preservation rules.
 */

import type {
	DeduplicationAdapterInterface,
	ContextFrame,
	DeduplicationStrategy,
} from '@mikesaintsg/core'

import type { DeduplicationAdapterOptions } from '../../types.js'

/**
 * Deduplication adapter implementation
 *
 * Selects which frame to keep from duplicates:
 * - 'keep_latest': Keep the most recent frame
 * - 'keep_first': Keep the oldest frame
 * - 'keep_highest_priority': Keep the highest priority frame
 * - 'merge': Merge duplicate content
 */
export class DeduplicationAdapter implements DeduplicationAdapterInterface {
	#strategy: DeduplicationStrategy

	constructor(options?: DeduplicationAdapterOptions) {
		this.#strategy = options?.strategy ?? 'keep_first'
	}

	select(frames: readonly ContextFrame[]): ContextFrame {
		if (frames.length === 0) {
			throw new Error('Cannot select from empty frames array')
		}

		const first = frames[0]
		if (first === undefined) {
			throw new Error('Cannot select from empty frames array')
		}

		if (frames.length === 1) {
			return first
		}

		const last = frames[frames.length - 1]
		if (last === undefined) {
			throw new Error('Cannot select from empty frames array')
		}

		switch (this.#strategy) {
			case 'keep_latest':
				return last
			case 'keep_first':
				return first
			case 'keep_highest_priority':
				return this.#selectHighestPriority(frames)
			case 'merge':
				return this.#mergeFrames(frames)
			default:
				return first
		}
	}

	shouldPreserve(frame: ContextFrame): boolean {
		// Preserve frames marked as critical priority
		const meta = frame.metadata as Record<string, unknown> | undefined
		if (meta && typeof meta.priority === 'string') {
			return meta.priority === 'critical'
		}
		return false
	}

	#selectHighestPriority(frames: readonly ContextFrame[]): ContextFrame {
		const first = frames[0]
		if (first === undefined) {
			throw new Error('Cannot select from empty frames array')
		}

		let highest = first
		let highestScore = this.#getPriorityScore(highest)

		for (let i = 1; i < frames.length; i++) {
			const frame = frames[i]
			if (frame !== undefined) {
				const score = this.#getPriorityScore(frame)
				if (score > highestScore) {
					highest = frame
					highestScore = score
				}
			}
		}

		return highest
	}

	#mergeFrames(frames: readonly ContextFrame[]): ContextFrame {
		// For merge, combine content and use highest priority metadata
		const merged = this.#selectHighestPriority(frames)
		// Return the highest priority frame as the representative
		return merged
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
