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
import { DEFAULT_PRIORITY_WEIGHTS } from '../../constants.js'

/**
 * Priority adapter implementation
 *
 * Scores and compares context frames based on their priority level.
 */
export class PriorityAdapter implements PriorityAdapterInterface {
	#weights: Record<FramePriority, number>

	constructor(options?: PriorityAdapterOptions) {
		this.#weights = {
			...DEFAULT_PRIORITY_WEIGHTS,
			...options?.weights,
		}
	}

	getWeight(priority: FramePriority): number {
		return this.#weights[priority] ?? DEFAULT_PRIORITY_WEIGHTS.normal
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
