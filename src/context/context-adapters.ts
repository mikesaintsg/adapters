/**
 * @mikesaintsg/adapters
 *
 * Context builder adapters implementing:
 * - DeduplicationAdapterInterface
 * - TruncationAdapterInterface
 * - PriorityAdapterInterface
 */

import type {
	ContextFrame,
	DeduplicationAdapterInterface,
	TruncationAdapterInterface,
	PriorityAdapterInterface,
	FramePriority,
	DeduplicationStrategy,
} from '@mikesaintsg/core'
import type {
	DeduplicationAdapterOptions,
	TruncationAdapterOptions,
	PriorityAdapterOptions,
} from '../types.js'

// ============================================================================
// Deduplication Adapter
// ============================================================================

/**
 * Create a deduplication adapter for context frames.
 *
 * @param options - Deduplication configuration
 * @returns A DeduplicationAdapterInterface implementation
 * @example
 * ```ts
 * const dedup = createDeduplicationAdapter({
 *   strategy: 'keep_first',
 *   preserveSystem: true,
 * })
 * ```
 */
export function createDeduplicationAdapter(
	options?: DeduplicationAdapterOptions,
): DeduplicationAdapterInterface {
	const strategy: DeduplicationStrategy = options?.strategy ?? 'keep_first'

	return {
		select(frames: readonly ContextFrame[]): ContextFrame {
			if (frames.length === 0) {
				throw new Error('Cannot select from empty frames array')
			}

			// Check for system frames first (always preserve)
			const systemFrame = frames.find(f => f.type === 'system')
			if (systemFrame) return systemFrame

			switch (strategy) {
				case 'keep_first':
					return frames[0]!
				case 'keep_latest':
					return frames[frames.length - 1]!
				case 'keep_highest_priority': {
					const priorityOrder: readonly FramePriority[] = ['critical', 'high', 'normal', 'low', 'optional']
					return frames.reduce((best, frame) => {
						const bestIndex = priorityOrder.indexOf(best.priority)
						const frameIndex = priorityOrder.indexOf(frame.priority)
						return frameIndex < bestIndex ? frame : best
					})
				}
				case 'merge':
					// For merge, just return first - actual merging would be done by the system
					return frames[0]!
				default:
					return frames[0]!
			}
		},

		shouldPreserve(frame: ContextFrame): boolean {
			// Preserve system frames
			return frame.type === 'system'
		},
	}
}

// ============================================================================
// Truncation Adapters
// ============================================================================

/** Default priority weights for truncation */
const DEFAULT_PRIORITY_WEIGHTS: Readonly<Record<FramePriority, number>> = {
	critical: 1000,
	high: 100,
	normal: 10,
	low: 1,
	optional: 0,
}

/**
 * Create a priority-based truncation adapter.
 *
 * Sorts frames by priority weight so lowest priority frames are removed first.
 *
 * @param options - Truncation configuration
 * @returns A TruncationAdapterInterface implementation
 * @example
 * ```ts
 * const truncation = createPriorityTruncationAdapter({
 *   preserveSystem: true,
 * })
 * ```
 */
export function createPriorityTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	const preserveSystem = options?.preserveSystem ?? true

	return {
		sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
			// Sort by priority weight (lowest at end for removal)
			return [...frames].sort((a, b) => {
				const aWeight = DEFAULT_PRIORITY_WEIGHTS[a.priority]
				const bWeight = DEFAULT_PRIORITY_WEIGHTS[b.priority]
				return bWeight - aWeight // Higher weights first (preserved)
			})
		},

		shouldPreserve(frame: ContextFrame): boolean {
			if (preserveSystem && frame.type === 'system') return true
			return false
		},
	}
}

/**
 * Create a FIFO truncation adapter.
 *
 * Removes oldest frames first (First In, First Out).
 *
 * @param options - Truncation configuration
 * @returns A TruncationAdapterInterface implementation
 * @example
 * ```ts
 * const truncation = createFIFOTruncationAdapter({
 *   preserveSystem: true,
 * })
 * ```
 */
export function createFIFOTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	const preserveSystem = options?.preserveSystem ?? true

	return {
		sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
			// Sort by creation time (newest first, oldest at end for removal)
			return [...frames].sort((a, b) => b.createdAt - a.createdAt)
		},

		shouldPreserve(frame: ContextFrame): boolean {
			if (preserveSystem && frame.type === 'system') return true
			return false
		},
	}
}

/**
 * Create a LIFO truncation adapter.
 *
 * Removes newest frames first (Last In, First Out).
 *
 * @param options - Truncation configuration
 * @returns A TruncationAdapterInterface implementation
 * @example
 * ```ts
 * const truncation = createLIFOTruncationAdapter({
 *   preserveSystem: true,
 * })
 * ```
 */
export function createLIFOTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	const preserveSystem = options?.preserveSystem ?? true

	return {
		sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
			// Sort by creation time (oldest first, newest at end for removal)
			return [...frames].sort((a, b) => a.createdAt - b.createdAt)
		},

		shouldPreserve(frame: ContextFrame): boolean {
			if (preserveSystem && frame.type === 'system') return true
			return false
		},
	}
}

/**
 * Create a score-based truncation adapter.
 *
 * Removes lowest-scored frames first based on metadata.score.
 *
 * @param options - Truncation configuration
 * @returns A TruncationAdapterInterface implementation
 * @example
 * ```ts
 * const truncation = createScoreTruncationAdapter({
 *   preserveSystem: true,
 * })
 * ```
 */
export function createScoreTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	const preserveSystem = options?.preserveSystem ?? true

	return {
		sort(frames: readonly ContextFrame[]): readonly ContextFrame[] {
			// Sort by score (highest first, lowest at end for removal)
			return [...frames].sort((a, b) => {
				const aScore = a.metadata?.score ?? 0
				const bScore = b.metadata?.score ?? 0
				return bScore - aScore // Higher scores first (preserved)
			})
		},

		shouldPreserve(frame: ContextFrame): boolean {
			if (preserveSystem && frame.type === 'system') return true
			return false
		},
	}
}

// ============================================================================
// Priority Adapter
// ============================================================================

/**
 * Create a priority adapter for context frames.
 *
 * Provides priority weights and comparison for frame ordering.
 *
 * @param options - Priority configuration
 * @returns A PriorityAdapterInterface implementation
 * @example
 * ```ts
 * const priority = createPriorityAdapter({
 *   weights: { critical: 1000, high: 100, normal: 10, low: 1, optional: 0 },
 * })
 * ```
 */
export function createPriorityAdapter(
	options?: PriorityAdapterOptions,
): PriorityAdapterInterface {
	const weights: Readonly<Record<FramePriority, number>> = {
		...DEFAULT_PRIORITY_WEIGHTS,
		...(options?.weights as Partial<Record<FramePriority, number>>),
	}

	return {
		getWeight(priority: FramePriority): number {
			return weights[priority] ?? DEFAULT_PRIORITY_WEIGHTS[priority]
		},

		compare(a: ContextFrame, b: ContextFrame): number {
			const aWeight = weights[a.priority] ?? 0
			const bWeight = weights[b.priority] ?? 0
			return bWeight - aWeight // Higher weight = higher priority (comes first)
		},
	}
}
