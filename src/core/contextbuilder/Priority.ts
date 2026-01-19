/**
 * Priority Adapter
 *
 * Scores and compares context frames based on priority.
 */

import type {
	PriorityAdapterInterface,
	ContextFrame,
	FramePriority,
} from '@mikesaintsg/core'

import type { PriorityAdapterOptions } from '../../types.js'

const DEFAULT_WEIGHTS: Record<FramePriority, number> = {
	critical: 1.0,
	high: 0.75,
	normal: 0.5,
	low: 0.25,
	optional: 0.1,
}

/**
 * Priority adapter implementation
 *
 * Scores and compares context frames based on their priority level.
 */
class PriorityAdapter implements PriorityAdapterInterface {
	#weights: Record<FramePriority, number>

	constructor(options?: PriorityAdapterOptions) {
		this.#weights = {
			...DEFAULT_WEIGHTS,
			...options?.weights,
		}
	}

	getWeight(priority: FramePriority): number {
		return this.#weights[priority] ?? DEFAULT_WEIGHTS.normal
	}

	compare(a: ContextFrame, b: ContextFrame): number {
		const priorityA = this.#getFramePriority(a)
		const priorityB = this.#getFramePriority(b)
		const weightA = this.getWeight(priorityA)
		const weightB = this.getWeight(priorityB)
		return weightB - weightA // Descending (higher priority first)
	}

	#getFramePriority(frame: ContextFrame): FramePriority {
		const meta = frame.metadata as Record<string, unknown> | undefined
		if (meta && typeof meta.priority === 'string') {
			const priority = meta.priority as FramePriority
			if (priority in this.#weights) {
				return priority
			}
		}
		return 'normal'
	}
}

/**
 * Creates a Priority adapter
 *
 * @param options - Optional priority configuration
 * @returns PriorityAdapterInterface implementation
 *
 * @example
 * ```ts
 * const priority = createPriorityAdapter({
 *   weights: {
 *     critical: 1.0,
 *     high: 0.8,
 *     normal: 0.5,
 *     low: 0.2,
 *     optional: 0.1,
 *   },
 * })
 *
 * const weight = priority.getWeight('high')
 * const comparison = priority.compare(frameA, frameB)
 * ```
 */
export function createPriorityAdapter(
	options?: PriorityAdapterOptions,
): PriorityAdapterInterface {
	return new PriorityAdapter(options)
}
