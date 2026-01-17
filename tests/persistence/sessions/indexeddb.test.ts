/**
 * @mikesaintsg/adapters
 *
 * Tests for IndexedDB session persistence adapter.
 */

import { describe, it, expect } from 'vitest'
import type { PersistedSession } from '@mikesaintsg/inference'
import { createIndexedDBSessionPersistence } from '../../../src/persistence/sessions/indexeddb.js'
import {
	INDEXEDDB_DEFAULT_SESSION_DATABASE,
	INDEXEDDB_DEFAULT_SESSION_STORE,
	INDEXEDDB_DEFAULT_SESSION_TTL_MS,
} from '../../../src/constants.js'

// Generate unique database names for isolation
function uniqueDbName(): string {
	return `test-sessions-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Helper to create a message with required fields
function createMessage(role: 'user' | 'assistant', content: string): PersistedSession['messages'][number] {
	return {
		id: crypto.randomUUID(),
		role,
		content,
		createdAt: Date.now(),
	}
}

// Helper to create a mock session
function createMockSession(id: string, messageCount = 1): PersistedSession {
	const now = Date.now()
	const messages: PersistedSession['messages'][number][] = []

	for (let i = 0; i < messageCount; i++) {
		messages.push(createMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1} content`))
	}

	return {
		id,
		system: undefined,
		messages,
		createdAt: now,
		updatedAt: now,
	}
}

describe('createIndexedDBSessionPersistence', () => {
	describe('factory', () => {
		it('creates a persistence adapter with default options', () => {
			const persistence = createIndexedDBSessionPersistence()
			expect(persistence).toBeDefined()
			expect(persistence.save).toBeTypeOf('function')
			expect(persistence.load).toBeTypeOf('function')
			expect(persistence.remove).toBeTypeOf('function')
			expect(persistence.all).toBeTypeOf('function')
			expect(persistence.clear).toBeTypeOf('function')
		})

		it('creates a persistence adapter with custom options', () => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
				storeName: 'custom-store',
				ttlMs: 60000,
			})
			expect(persistence).toBeDefined()
		})
	})

	describe('save and load', () => {
		it('saves and loads a session', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const session = createMockSession('test-session-1')
			await persistence.save(session)

			const loaded = await persistence.load('test-session-1')
			expect(loaded).toBeDefined()
			expect(loaded?.id).toBe('test-session-1')
			expect(loaded?.messages.length).toBe(1)
		})

		it('returns undefined for non-existent session', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const loaded = await persistence.load('non-existent')
			expect(loaded).toBeUndefined()
		})

		it('overwrites existing session on save', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const session1 = createMockSession('test-session-1', 1)
			await persistence.save(session1)

			const session2 = createMockSession('test-session-1', 3)
			await persistence.save(session2)

			const loaded = await persistence.load('test-session-1')
			expect(loaded?.messages.length).toBe(3)
		})

		it('saves session with system prompt', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const session: PersistedSession = {
				id: 'test-with-system',
				system: 'You are a helpful assistant',
				messages: [createMessage('user', 'Hello')],
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			await persistence.save(session)
			const loaded = await persistence.load('test-with-system')

			expect(loaded?.system).toBe('You are a helpful assistant')
		})
	})

	describe('TTL expiration', () => {
		it('returns undefined for expired session', async() => {
			// Use very short TTL
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
				ttlMs: 1, // 1ms TTL
			})

			const session = createMockSession('expired-session')
			await persistence.save(session)

			// Wait for expiration
			await new Promise(resolve => setTimeout(resolve, 20))

			const loaded = await persistence.load('expired-session')
			expect(loaded).toBeUndefined()
		})

		it('excludes expired sessions from all()', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
				ttlMs: 1, // 1ms TTL
			})

			const session = createMockSession('expired-session')
			await persistence.save(session)

			// Wait for expiration
			await new Promise(resolve => setTimeout(resolve, 20))

			const summaries = await persistence.all()
			expect(summaries.length).toBe(0)
		})
	})

	describe('remove', () => {
		it('removes a session by ID', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const session = createMockSession('to-remove')
			await persistence.save(session)

			await persistence.remove('to-remove')
			const loaded = await persistence.load('to-remove')
			expect(loaded).toBeUndefined()
		})

		it('does not throw when removing non-existent session', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			await expect(persistence.remove('non-existent')).resolves.not.toThrow()
		})
	})

	describe('all', () => {
		it('returns all session summaries', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			await persistence.save(createMockSession('session-1', 2))
			await persistence.save(createMockSession('session-2', 5))

			const summaries = await persistence.all()
			expect(summaries.length).toBe(2)

			const ids = summaries.map(s => s.id)
			expect(ids).toContain('session-1')
			expect(ids).toContain('session-2')
		})

		it('returns correct message counts', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			await persistence.save(createMockSession('session-count', 7))

			const summaries = await persistence.all()
			const summary = summaries.find(s => s.id === 'session-count')
			expect(summary?.messageCount).toBe(7)
		})

		it('extracts title from first user message', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const session: PersistedSession = {
				id: 'with-title',
				system: undefined,
				messages: [
					createMessage('user', 'Hello, this is my first message!'),
					createMessage('assistant', 'Hi there!'),
				],
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			await persistence.save(session)
			const summaries = await persistence.all()
			const summary = summaries.find(s => s.id === 'with-title')

			expect(summary?.title).toBe('Hello, this is my first message!')
		})

		it('truncates long titles to 50 characters', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const longContent = 'A'.repeat(100)
			const session: PersistedSession = {
				id: 'long-title',
				system: undefined,
				messages: [
					createMessage('user', longContent),
				],
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			await persistence.save(session)
			const summaries = await persistence.all()
			const summary = summaries.find(s => s.id === 'long-title')

			expect(summary?.title?.length).toBe(50)
		})

		it('returns empty array when no sessions exist', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			const summaries = await persistence.all()
			expect(summaries).toEqual([])
		})
	})

	describe('clear', () => {
		it('removes all sessions', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			await persistence.save(createMockSession('session-1'))
			await persistence.save(createMockSession('session-2'))
			await persistence.save(createMockSession('session-3'))

			await persistence.clear()
			const summaries = await persistence.all()
			expect(summaries.length).toBe(0)
		})

		it('does not throw when clearing empty store', async() => {
			const persistence = createIndexedDBSessionPersistence({
				databaseName: uniqueDbName(),
			})

			await expect(persistence.clear()).resolves.not.toThrow()
		})
	})

	describe('constants', () => {
		it('uses correct default database name', () => {
			expect(INDEXEDDB_DEFAULT_SESSION_DATABASE).toBe('mikesaintsg-sessions')
		})

		it('uses correct default store name', () => {
			expect(INDEXEDDB_DEFAULT_SESSION_STORE).toBe('sessions')
		})

		it('uses correct default TTL (7 days)', () => {
			expect(INDEXEDDB_DEFAULT_SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
		})
	})
})
