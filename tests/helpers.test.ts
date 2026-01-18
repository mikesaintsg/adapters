/**
 * @mikesaintsg/adapters
 *
 * Tests for root helpers.ts functions.
 */

import { describe, it, expect } from 'vitest'
import {
	computeContentHash,
	serializeStoredDocument,
	deserializeStoredDocument,
	estimateEmbeddingBytes,
	createDoneIteratorResult,
	convertMessagesToChatHistory,
} from '@mikesaintsg/adapters'
import type { Message, StoredDocument } from '@mikesaintsg/core'

describe('helpers', () => {
	describe('computeContentHash', () => {
		it('computes consistent hash for same input', async() => {
			const hash1 = await computeContentHash('Hello, world!')
			const hash2 = await computeContentHash('Hello, world!')

			expect(hash1).toBe(hash2)
		})

		it('computes different hash for different input', async() => {
			const hash1 = await computeContentHash('Hello')
			const hash2 = await computeContentHash('World')

			expect(hash1).not.toBe(hash2)
		})

		it('returns hex string of correct length', async() => {
			const hash = await computeContentHash('test')

			expect(hash).toMatch(/^[a-f0-9]{64}$/)
		})

		it('handles empty string', async() => {
			const hash = await computeContentHash('')

			expect(hash).toBeTruthy()
			expect(hash.length).toBe(64)
		})

		it('handles unicode strings', async() => {
			const hash = await computeContentHash('你好世界 🌍')

			expect(hash).toMatch(/^[a-f0-9]{64}$/)
		})
	})

	describe('serializeStoredDocument', () => {
		it('converts Float32Array embedding to regular array', () => {
			const doc: StoredDocument = {
				id: 'test-id',
				content: 'test content',
				contentHash: 'abc123',
				embedding: new Float32Array([0.1, 0.2, 0.3]),
				createdAt: Date.now(),
			}

			const serialized = serializeStoredDocument(doc)

			expect(Array.isArray(serialized.embedding)).toBe(true)
			const embeddingArray = serialized.embedding as number[]
			expect(embeddingArray.length).toBe(3)
			// Float32 has limited precision, so check approximately
			expect(embeddingArray[0]).toBeCloseTo(0.1, 5)
			expect(embeddingArray[1]).toBeCloseTo(0.2, 5)
			expect(embeddingArray[2]).toBeCloseTo(0.3, 5)
		})

		it('preserves other properties', () => {
			const now = Date.now()
			const doc: StoredDocument = {
				id: 'test-id',
				content: 'test content',
				contentHash: 'abc123',
				embedding: new Float32Array([0.1]),
				createdAt: now,
				metadata: { key: 'value' },
			}

			const serialized = serializeStoredDocument(doc)

			expect(serialized.id).toBe('test-id')
			expect(serialized.content).toBe('test content')
			expect(serialized.contentHash).toBe('abc123')
			expect(serialized.createdAt).toBe(now)
			expect(serialized.metadata).toEqual({ key: 'value' })
		})
	})

	describe('deserializeStoredDocument', () => {
		it('converts array embedding to Float32Array', () => {
			const data = {
				id: 'test-id',
				content: 'test content',
				contentHash: 'abc123',
				embedding: [0.1, 0.2, 0.3],
				createdAt: Date.now(),
			}

			const doc = deserializeStoredDocument(data)

			expect(doc.embedding).toBeInstanceOf(Float32Array)
			expect(doc.embedding.length).toBe(3)
			// Float32 has limited precision, so check approximately
			expect(doc.embedding[0]).toBeCloseTo(0.1, 5)
			expect(doc.embedding[1]).toBeCloseTo(0.2, 5)
			expect(doc.embedding[2]).toBeCloseTo(0.3, 5)
		})

		it('preserves other properties', () => {
			const now = Date.now()
			const data = {
				id: 'test-id',
				content: 'test content',
				contentHash: 'abc123',
				embedding: [0.1],
				createdAt: now,
				metadata: { key: 'value' },
			}

			const doc = deserializeStoredDocument(data)

			expect(doc.id).toBe('test-id')
			expect(doc.content).toBe('test content')
			expect(doc.contentHash).toBe('abc123')
			expect(doc.createdAt).toBe(now)
			expect(doc.metadata).toEqual({ key: 'value' })
		})
	})

	describe('estimateEmbeddingBytes', () => {
		it('returns byteLength of Float32Array', () => {
			const embedding = new Float32Array([0.1, 0.2, 0.3])

			const bytes = estimateEmbeddingBytes(embedding)

			// Float32 is 4 bytes per element
			expect(bytes).toBe(12)
		})

		it('handles empty embedding', () => {
			const embedding = new Float32Array([])

			const bytes = estimateEmbeddingBytes(embedding)

			expect(bytes).toBe(0)
		})
	})

	describe('createDoneIteratorResult', () => {
		it('returns done:true result', () => {
			const result = createDoneIteratorResult<string>()

			expect(result.done).toBe(true)
		})

		it('has undefined value', () => {
			const result = createDoneIteratorResult<number>()

			expect(result.value).toBeUndefined()
		})
	})

	describe('convertMessagesToChatHistory', () => {
		it('converts system message', () => {
			const messages: Message[] = [{
				id: '1',
				role: 'system',
				content: 'You are helpful.',
				createdAt: Date.now(),
			}]

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(1)
			expect(history[0]).toEqual({ type: 'system', text: 'You are helpful.' })
		})

		it('converts user message', () => {
			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(1)
			expect(history[0]).toEqual({ type: 'user', text: 'Hello' })
		})

		it('converts assistant message', () => {
			const messages: Message[] = [{
				id: '1',
				role: 'assistant',
				content: 'Hi there!',
				createdAt: Date.now(),
			}]

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(1)
			expect(history[0]).toEqual({ type: 'model', response: ['Hi there!'] })
		})

		it('converts multiple messages in order', () => {
			const messages: Message[] = [
				{ id: '1', role: 'system', content: 'Be helpful', createdAt: Date.now() },
				{ id: '2', role: 'user', content: 'Hello', createdAt: Date.now() },
				{ id: '3', role: 'assistant', content: 'Hi!', createdAt: Date.now() },
				{ id: '4', role: 'user', content: 'Goodbye', createdAt: Date.now() },
			]

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(4)
			expect(history[0]).toEqual({ type: 'system', text: 'Be helpful' })
			expect(history[1]).toEqual({ type: 'user', text: 'Hello' })
			expect(history[2]).toEqual({ type: 'model', response: ['Hi!'] })
			expect(history[3]).toEqual({ type: 'user', text: 'Goodbye' })
		})

		it('handles empty messages array', () => {
			const messages: Message[] = []

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(0)
		})

		it('handles non-string content (returns empty string)', () => {
			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: { parts: ['Hello'] } as unknown as string,
				createdAt: Date.now(),
			}]

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(1)
			expect(history[0]).toEqual({ type: 'user', text: '' })
		})

		it('skips tool messages', () => {
			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Use a tool', createdAt: Date.now() },
				{
					id: '2',
					role: 'tool',
					content: 'Tool result',
					createdAt: Date.now(),
					toolCallId: 'call_123',
				} as Message,
				{ id: '3', role: 'assistant', content: 'Done', createdAt: Date.now() },
			]

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(2)
			expect(history[0]).toEqual({ type: 'user', text: 'Use a tool' })
			expect(history[1]).toEqual({ type: 'model', response: ['Done'] })
		})

		it('handles empty string content', () => {
			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: '',
				createdAt: Date.now(),
			}]

			const history = convertMessagesToChatHistory(messages)

			expect(history).toHaveLength(1)
			expect(history[0]).toEqual({ type: 'user', text: '' })
		})

		it('handles unicode content', () => {
			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: '你好 🌍 مرحبا',
				createdAt: Date.now(),
			}]

			const history = convertMessagesToChatHistory(messages)

			expect(history[0]).toEqual({ type: 'user', text: '你好 🌍 مرحبا' })
		})
	})
})
