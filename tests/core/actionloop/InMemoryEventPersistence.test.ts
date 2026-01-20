/**
 * InMemoryEventPersistence Adapter Tests
 *
 * Tests for in-memory ActionLoop event persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createInMemoryEventPersistenceAdapter } from '@mikesaintsg/adapters'
import type { TransitionEvent } from '@mikesaintsg/core'

function createEvent(
	id: string,
	from: string,
	to: string,
	timestamp = Date.now(),
	sessionId = 'session-1',
): TransitionEvent {
	return {
		id,
		timestamp,
		sessionId,
		actor: 'user',
		from,
		to,
		path: '/test',
		engagement: 'active',
	} as TransitionEvent
}

describe('InMemoryEventPersistence', () => {
	let adapter: ReturnType<typeof createInMemoryEventPersistenceAdapter>

	beforeEach(() => {
		adapter = createInMemoryEventPersistenceAdapter()
	})

	describe('isAvailable', () => {
		it('returns true', async() => {
			const result = await adapter.isAvailable()
			expect(result).toBe(true)
		})
	})

	describe('persist', () => {
		it('persists a single event', async() => {
			const event = createEvent('e1', 'A', 'B')

			await adapter.persist(event)

			const count = await adapter.getCount()
			expect(count).toBe(1)
		})

		it('persists multiple events', async() => {
			const events = [
				createEvent('e1', 'A', 'B'),
				createEvent('e2', 'B', 'C'),
			]

			await adapter.persist(events)

			const count = await adapter.getCount()
			expect(count).toBe(2)
		})

		it('evicts oldest events when exceeding maxEvents', async() => {
			adapter = createInMemoryEventPersistenceAdapter({ maxEvents: 3 })
			const now = Date.now()

			await adapter.persist(createEvent('e1', 'A', 'B', now - 300))
			await adapter.persist(createEvent('e2', 'B', 'C', now - 200))
			await adapter.persist(createEvent('e3', 'C', 'D', now - 100))
			await adapter.persist(createEvent('e4', 'D', 'E', now))

			const count = await adapter.getCount()
			expect(count).toBe(3)

			// Oldest event (e1) should be evicted
			const events = await adapter.load({})
			const ids = events.map((e) => e.id)
			expect(ids).not.toContain('e1')
			expect(ids).toContain('e4')
		})
	})

	describe('load', () => {
		beforeEach(async() => {
			const now = Date.now()
			await adapter.persist([
				createEvent('e1', 'A', 'B', now - 300, 'session-1'),
				createEvent('e2', 'B', 'C', now - 200, 'session-1'),
				createEvent('e3', 'C', 'D', now - 100, 'session-2'),
			])
		})

		it('loads all events with empty filter', async() => {
			const events = await adapter.load({})
			expect(events).toHaveLength(3)
		})

		it('filters by sessionId', async() => {
			const events = await adapter.load({ sessionId: 'session-1' })
			expect(events).toHaveLength(2)
		})

		it('filters by from node', async() => {
			const events = await adapter.load({ from: 'A' })
			expect(events).toHaveLength(1)
		})

		it('filters by to node', async() => {
			const events = await adapter.load({ to: 'C' })
			expect(events).toHaveLength(1)
		})

		it('applies limit', async() => {
			const events = await adapter.load({ limit: 2 })
			expect(events).toHaveLength(2)
		})

		it('applies offset', async() => {
			const events = await adapter.load({ offset: 1 })
			expect(events).toHaveLength(2)
		})

		it('sorts by timestamp ascending', async() => {
			const events = await adapter.load({})
			for (let i = 1; i < events.length; i++) {
				const prev = events[i - 1]
				const curr = events[i]
				if (prev && curr) {
					expect(curr.timestamp).toBeGreaterThanOrEqual(prev.timestamp)
				}
			}
		})
	})

	describe('getCount', () => {
		it('returns 0 for empty store', async() => {
			const count = await adapter.getCount()
			expect(count).toBe(0)
		})

		it('returns count with filter', async() => {
			await adapter.persist([
				createEvent('e1', 'A', 'B', Date.now(), 'session-1'),
				createEvent('e2', 'B', 'C', Date.now(), 'session-2'),
			])

			const count = await adapter.getCount({ sessionId: 'session-1' })
			expect(count).toBe(1)
		})
	})

	describe('has', () => {
		it('returns false for empty store', async() => {
			const result = await adapter.has()
			expect(result).toBe(false)
		})

		it('returns true when events exist', async() => {
			await adapter.persist(createEvent('e1', 'A', 'B'))

			const result = await adapter.has()
			expect(result).toBe(true)
		})

		it('returns false when filter matches nothing', async() => {
			await adapter.persist(createEvent('e1', 'A', 'B', Date.now(), 'session-1'))

			const result = await adapter.has({ sessionId: 'session-2' })
			expect(result).toBe(false)
		})
	})

	describe('clear', () => {
		it('clears all events without filter', async() => {
			await adapter.persist([
				createEvent('e1', 'A', 'B'),
				createEvent('e2', 'B', 'C'),
			])

			await adapter.clear()

			const count = await adapter.getCount()
			expect(count).toBe(0)
		})

		it('clears only matching events with filter', async() => {
			await adapter.persist([
				createEvent('e1', 'A', 'B', Date.now(), 'session-1'),
				createEvent('e2', 'B', 'C', Date.now(), 'session-2'),
			])

			await adapter.clear({ sessionId: 'session-1' })

			const count = await adapter.getCount()
			expect(count).toBe(1)
		})
	})

	describe('export', () => {
		it('exports all events', async() => {
			await adapter.persist([
				createEvent('e1', 'A', 'B'),
				createEvent('e2', 'B', 'C'),
			])

			const events = await adapter.export()

			expect(events).toHaveLength(2)
		})
	})

	describe('import', () => {
		it('imports events', async() => {
			const events = [
				createEvent('e1', 'A', 'B'),
				createEvent('e2', 'B', 'C'),
			]

			await adapter.import(events)

			const count = await adapter.getCount()
			expect(count).toBe(2)
		})
	})
})
