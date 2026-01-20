/**
 * In-Memory Event Persistence Adapter
 *
 * Stores ActionLoop transition events in memory.
 * Useful for testing or when persistence is not required.
 */

import type {
	EventStorePersistenceAdapterInterface,
	TransitionEvent,
	EventFilter,
} from '@mikesaintsg/core'

import type { InMemoryEventPersistenceOptions } from '../../types.js'
import {
	DEFAULT_ACTIONLOOP_MAX_EVENTS,
} from '../../constants.js'

/**
 * In-memory event persistence adapter implementation.
 * Stores ActionLoop transition events in a Map.
 */
export class InMemoryEventPersistence implements EventStorePersistenceAdapterInterface {
	readonly #events = new Map<string, TransitionEvent>()
	readonly #maxEvents: number

	constructor(options?: InMemoryEventPersistenceOptions) {
		this.#maxEvents = options?.maxEvents ?? DEFAULT_ACTIONLOOP_MAX_EVENTS
	}

	isAvailable(): Promise<boolean> {
		return Promise.resolve(true)
	}

	persist(event: TransitionEvent | readonly TransitionEvent[]): Promise<void> {
		const events: readonly TransitionEvent[] = Array.isArray(event) ? event : [event]

		for (const e of events) {
			this.#events.set(e.id, e)
		}

		// Evict oldest events if exceeding max
		if (this.#events.size > this.#maxEvents) {
			const sortedIds = Array.from(this.#events.entries())
				.sort((a, b) => a[1].timestamp - b[1].timestamp)
				.map(([id]) => id)

			const toRemove = sortedIds.slice(0, this.#events.size - this.#maxEvents)
			for (const id of toRemove) {
				this.#events.delete(id)
			}
		}
		return Promise.resolve()
	}

	load(filter: EventFilter): Promise<readonly TransitionEvent[]> {
		return Promise.resolve(this.#applyFilter(Array.from(this.#events.values()), filter))
	}

	async getCount(filter?: EventFilter): Promise<number> {
		if (!filter) {
			return this.#events.size
		}
		const filtered = await this.load(filter)
		return filtered.length
	}

	async has(filter?: EventFilter): Promise<boolean> {
		const count = await this.getCount(filter)
		return count > 0
	}

	async clear(filter?: EventFilter): Promise<void> {
		if (!filter) {
			this.#events.clear()
			return
		}

		const events = await this.load(filter)
		for (const event of events) {
			this.#events.delete(event.id)
		}
	}

	export(namespace?: string): Promise<readonly TransitionEvent[]> {
		const all = Array.from(this.#events.values())
		if (namespace) {
			return Promise.resolve(all.filter((e) => e.namespace === namespace))
		}
		return Promise.resolve(all)
	}

	async import(events: readonly TransitionEvent[]): Promise<void> {
		await this.persist(events)
	}

	destroy(): Promise<void> {
		this.#events.clear()
		return Promise.resolve()
	}

	#applyFilter(events: readonly TransitionEvent[], filter: EventFilter): readonly TransitionEvent[] {
		let filtered = [...events]

		if (filter.sessionId) {
			filtered = filtered.filter((e) => e.sessionId === filter.sessionId)
		}
		if (filter.actor) {
			filtered = filtered.filter((e) => e.actor === filter.actor)
		}
		if (filter.nodeId) {
			filtered = filtered.filter((e) => e.from === filter.nodeId || e.to === filter.nodeId)
		}
		if (filter.from) {
			filtered = filtered.filter((e) => e.from === filter.from)
		}
		if (filter.to) {
			filtered = filtered.filter((e) => e.to === filter.to)
		}
		if (filter.namespace) {
			filtered = filtered.filter((e) => e.namespace === filter.namespace)
		}
		if (filter.startTime !== undefined) {
			filtered = filtered.filter((e) => e.timestamp >= filter.startTime!)
		}
		if (filter.endTime !== undefined) {
			filtered = filtered.filter((e) => e.timestamp <= filter.endTime!)
		}

		// Sort by timestamp ascending
		filtered.sort((a, b) => a.timestamp - b.timestamp)

		// Apply offset
		if (filter.offset !== undefined && filter.offset > 0) {
			filtered = filtered.slice(filter.offset)
		}

		// Apply limit
		if (filter.limit !== undefined && filter.limit > 0) {
			filtered = filtered.slice(0, filter.limit)
		}

		return filtered
	}
}
