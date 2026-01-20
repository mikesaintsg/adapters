/**
 * IndexedDB Event Persistence Adapter
 *
 * Persists ActionLoop transition events to IndexedDB for event sourcing.
 */

import type {
	EventStorePersistenceAdapterInterface,
	TransitionEvent,
	EventFilter,
	MinimalStoreAccess,
} from '@mikesaintsg/core'

import type { IndexedDBEventPersistenceOptions, ActionLoopStoredEventRecord } from '../../types.js'
import {
	DEFAULT_ACTIONLOOP_EVENT_STORE,
} from '../../constants.js'

/**
 * IndexedDB event persistence adapter implementation.
 * Stores ActionLoop transition events in IndexedDB.
 */
export class IndexedDBEventPersistence implements EventStorePersistenceAdapterInterface {
	readonly #store: MinimalStoreAccess<ActionLoopStoredEventRecord>

	constructor(options: IndexedDBEventPersistenceOptions) {
		const storeName = options.storeName ?? DEFAULT_ACTIONLOOP_EVENT_STORE
		this.#store = options.database.store<ActionLoopStoredEventRecord>(storeName)
	}

	isAvailable(): Promise<boolean> {
		return Promise.resolve(true)
	}

	async persist(event: TransitionEvent | readonly TransitionEvent[]): Promise<void> {
		const events: readonly TransitionEvent[] = Array.isArray(event) ? event : [event]
		for (const e of events) {
			const record: ActionLoopStoredEventRecord = {
				id: e.id,
				timestamp: e.timestamp,
				sessionId: e.sessionId,
				actor: e.actor,
				from: e.from,
				to: e.to,
				path: e.path,
				engagement: e.engagement,
				...(e.namespace !== undefined && { namespace: e.namespace }),
				...(e.dwell !== undefined && { dwell: e.dwell }),
				...(e.metadata !== undefined && { metadata: e.metadata }),
			}
			await this.#store.set(record, e.id)
		}
	}

	async load(filter: EventFilter): Promise<readonly TransitionEvent[]> {
		const all = await this.#store.all()
		return this.#applyFilter(all, filter)
	}

	async getCount(filter?: EventFilter): Promise<number> {
		if (!filter) {
			const all = await this.#store.all()
			return all.length
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
			await this.#store.clear()
			return
		}

		const events = await this.load(filter)
		for (const event of events) {
			await this.#store.remove(event.id)
		}
	}

	async export(namespace?: string): Promise<readonly TransitionEvent[]> {
		const all = await this.#store.all()
		if (namespace) {
			return this.#recordsToEvents(all.filter((r) => r.namespace === namespace))
		}
		return this.#recordsToEvents(all)
	}

	async import(events: readonly TransitionEvent[]): Promise<void> {
		await this.persist(events)
	}

	async destroy(): Promise<void> {
		await this.#store.clear()
	}

	#applyFilter(records: readonly ActionLoopStoredEventRecord[], filter: EventFilter): readonly TransitionEvent[] {
		let filtered = [...records]

		if (filter.sessionId) {
			filtered = filtered.filter((r) => r.sessionId === filter.sessionId)
		}
		if (filter.actor) {
			filtered = filtered.filter((r) => r.actor === filter.actor)
		}
		if (filter.nodeId) {
			filtered = filtered.filter((r) => r.from === filter.nodeId || r.to === filter.nodeId)
		}
		if (filter.from) {
			filtered = filtered.filter((r) => r.from === filter.from)
		}
		if (filter.to) {
			filtered = filtered.filter((r) => r.to === filter.to)
		}
		if (filter.namespace) {
			filtered = filtered.filter((r) => r.namespace === filter.namespace)
		}
		if (filter.startTime !== undefined) {
			filtered = filtered.filter((r) => r.timestamp >= filter.startTime!)
		}
		if (filter.endTime !== undefined) {
			filtered = filtered.filter((r) => r.timestamp <= filter.endTime!)
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

		return this.#recordsToEvents(filtered)
	}

	#recordsToEvents(records: readonly ActionLoopStoredEventRecord[]): readonly TransitionEvent[] {
		return records.map((r) => ({
			id: r.id,
			timestamp: r.timestamp,
			sessionId: r.sessionId,
			actor: r.actor,
			from: r.from,
			to: r.to,
			path: r.path,
			engagement: r.engagement,
			namespace: r.namespace,
			dwell: r.dwell,
			metadata: r.metadata,
		})) as unknown as readonly TransitionEvent[]
	}
}
