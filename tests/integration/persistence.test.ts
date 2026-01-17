/**
 * @mikesaintsg/adapters
 *
 * Integration tests for persistence adapters.
 */

import { describe, it, expect } from 'vitest'
import {
	createIndexedDBSessionPersistence,
} from '@mikesaintsg/adapters'

describe('Persistence Integration', () => {
	const testDatabaseName = `adapters-test-${Date.now()}`

	describe('Session Persistence', () => {
		it('saves and loads session correctly', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: testDatabaseName,
				storeName: 'sessions',
			})

			const now = Date.now()
			const session = {
				id: `test-session-${now}`,
				system: 'You are a helpful assistant.',
				messages: [
					{ id: 'msg-1', role: 'user' as const, content: 'Hello!', createdAt: now },
					{ id: 'msg-2', role: 'assistant' as const, content: 'Hi there!', createdAt: now + 1 },
				],
				createdAt: now,
				updatedAt: now,
			}

			// Save
			await persistence.save(session)

			// Load
			const loaded = await persistence.load(session.id)
			expect(loaded).toBeDefined()
			expect(loaded?.id).toBe(session.id)
			expect(loaded?.system).toBe(session.system)
			expect(loaded?.messages).toHaveLength(2)

			// Cleanup
			await persistence.remove(session.id)
		})

		it('lists all sessions', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: testDatabaseName,
				storeName: 'sessions',
			})

			const now = Date.now()
			const session1 = {
				id: `list-test-1-${now}`,
				system: undefined,
				messages: [{ id: 'msg-1', role: 'user' as const, content: 'First', createdAt: now }],
				createdAt: now,
				updatedAt: now,
			}
			const session2 = {
				id: `list-test-2-${now}`,
				system: undefined,
				messages: [{ id: 'msg-2', role: 'user' as const, content: 'Second', createdAt: now + 100 }],
				createdAt: now + 100,
				updatedAt: now + 100,
			}

			await persistence.save(session1)
			await persistence.save(session2)

			const allSessions = await persistence.all()
			expect(allSessions.length).toBeGreaterThanOrEqual(2)

			const session1Summary = allSessions.find((s) => s.id === session1.id)
			const session2Summary = allSessions.find((s) => s.id === session2.id)
			expect(session1Summary).toBeDefined()
			expect(session2Summary).toBeDefined()

			// Cleanup
			await persistence.remove(session1.id)
			await persistence.remove(session2.id)
		})

		it('removes session correctly', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: testDatabaseName,
				storeName: 'sessions',
			})

			const now = Date.now()
			const session = {
				id: `remove-test-${now}`,
				system: undefined,
				messages: [{ id: 'msg-1', role: 'user' as const, content: 'To be removed', createdAt: now }],
				createdAt: now,
				updatedAt: now,
			}

			await persistence.save(session)
			const loaded = await persistence.load(session.id)
			expect(loaded).toBeDefined()

			await persistence.remove(session.id)
			const afterRemove = await persistence.load(session.id)
			expect(afterRemove).toBeUndefined()
		})

		it('clears all sessions', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: `${testDatabaseName}-clear`,
				storeName: 'sessions',
			})

			const now = Date.now()
			const session = {
				id: `clear-test-${now}`,
				system: undefined,
				messages: [{ id: 'msg-1', role: 'user' as const, content: 'Clear test', createdAt: now }],
				createdAt: now,
				updatedAt: now,
			}

			await persistence.save(session)
			await persistence.clear()

			const allSessions = await persistence.all()
			expect(allSessions).toHaveLength(0)
		})

		it('handles TTL expiration', async() => {
			const shortTtlMs = 50 // 50ms TTL

			const persistence = createIndexedDBSessionPersistence({
				databaseName: `${testDatabaseName}-ttl`,
				storeName: 'sessions',
				ttlMs: shortTtlMs,
			})

			const now = Date.now()
			const session = {
				id: `ttl-test-${now}`,
				system: undefined,
				messages: [{ id: 'msg-1', role: 'user' as const, content: 'TTL test', createdAt: now }],
				createdAt: now,
				updatedAt: now,
			}

			await persistence.save(session)

			// Should load immediately
			const loaded = await persistence.load(session.id)
			expect(loaded).toBeDefined()

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Should be expired now
			const expired = await persistence.load(session.id)
			expect(expired).toBeUndefined()
		})

		it('updates session correctly', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: testDatabaseName,
				storeName: 'sessions',
			})

			const now = Date.now()
			const session = {
				id: `update-test-${now}`,
				system: undefined,
				messages: [{ id: 'msg-1', role: 'user' as const, content: 'Original', createdAt: now }],
				createdAt: now,
				updatedAt: now,
			}

			await persistence.save(session)

			// Update with additional message
			const updatedSession = {
				...session,
				messages: [
					...session.messages,
					{ id: 'msg-2', role: 'assistant' as const, content: 'Response', createdAt: now + 100 },
				],
				updatedAt: now + 100,
			}

			await persistence.save(updatedSession)

			const loaded = await persistence.load(session.id)
			expect(loaded?.messages).toHaveLength(2)
			expect(loaded?.updatedAt).toBe(now + 100)

			// Cleanup
			await persistence.remove(session.id)
		})
	})
})
