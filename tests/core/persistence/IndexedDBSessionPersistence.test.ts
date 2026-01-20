/**
 * IndexedDB Session Persistence Adapter Tests
 *
 * Note: These tests use the real IndexedDB API available in browser environments.
 * Vitest with Playwright provides a real browser context.
 */

import { describe, it, expect } from 'vitest'
import { createIndexedDBSessionPersistenceAdapter } from '@mikesaintsg/adapters'
import { createMockSession, uniqueDbName } from '../../setup.js'

describe('IndexedDBSessionPersistence', () => {
	describe('save and load', () => {
		it('saves and loads session data', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
			})

			const sessionId = 'session-1'
			const session = createMockSession({ id: sessionId, createdAt: Date.now() })

			await persistence.save(sessionId, session)
			const loaded = await persistence.load(sessionId)

			expect(loaded).toBeDefined()
			expect(loaded?.metadata).toBeDefined()

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})

		it('returns undefined for non-existent session', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
			})

			const loaded = await persistence.load('non-existent')

			expect(loaded).toBeUndefined()

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})

		it('overwrites existing session', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
			})

			const sessionId = 'session-1'

			await persistence.save(sessionId, createMockSession({ version: 1 }))
			await persistence.save(sessionId, createMockSession({ version: 2 }))

			const loaded = await persistence.load(sessionId)

			expect(loaded?.metadata).toEqual({ version: 2 })

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})
	})

	describe('delete', () => {
		it('deletes a session', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
			})

			const sessionId = 'session-1'
			await persistence.save(sessionId, createMockSession({ test: true }))
			await persistence.delete(sessionId)

			const loaded = await persistence.load(sessionId)

			expect(loaded).toBeUndefined()

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})
	})

	describe('list', () => {
		it('lists all session IDs', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
			})

			await persistence.save('session-1', createMockSession({}))
			await persistence.save('session-2', createMockSession({}))
			await persistence.save('session-3', createMockSession({}))

			const sessions = await persistence.list()

			expect(sessions).toContain('session-1')
			expect(sessions).toContain('session-2')
			expect(sessions).toContain('session-3')

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})

		it('returns empty array when no sessions', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
			})

			const sessions = await persistence.list()

			expect(sessions).toEqual([])

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})
	})

	describe('prune', () => {
		it('removes old sessions', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
			})

			await persistence.save('session-1', createMockSession({}))
			await persistence.save('session-2', createMockSession({}))

			// Wait briefly then prune with very short max age
			await new Promise((resolve) => setTimeout(resolve, 10))
			const pruned = await persistence.prune(1)

			expect(pruned).toBeGreaterThanOrEqual(2)

			const sessions = await persistence.list()
			expect(sessions).toEqual([])

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})
	})

	describe('TTL', () => {
		it('expires sessions after TTL', async() => {
			const testDbName = uniqueDbName()
			const persistence = createIndexedDBSessionPersistenceAdapter({
				databaseName: testDbName,
				ttlMs: 1, // 1ms TTL
			})

			const sessionId = 'session-1'
			await persistence.save(sessionId, createMockSession({}))

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 10))

			const loaded = await persistence.load(sessionId)

			expect(loaded).toBeUndefined()

			// Cleanup
			indexedDB.deleteDatabase(testDbName)
		})
	})
})
