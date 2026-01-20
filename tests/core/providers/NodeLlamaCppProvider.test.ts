/**
 * NodeLlamaCpp Provider Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/core'
import type { NodeLlamaCppContext, NodeLlamaCppContextSequence, NodeLlamaCppModel } from '@mikesaintsg/adapters'

// Create mock context for testing
function createMockContext(tokens: number[]): NodeLlamaCppContext {
	const mockSequence: NodeLlamaCppContextSequence = {
		// eslint-disable-next-line @typescript-eslint/require-await
		async *evaluate(): AsyncGenerator<number, void, unknown> {
			for (const token of tokens) {
				yield token
			}
		},
	}

	const mockModel: NodeLlamaCppModel = {
		tokenize: vi.fn().mockReturnValue([1, 2, 3]),
		detokenize: vi.fn().mockImplementation((ids: readonly number[]) => {
			// Return text based on token ID
			return ids.map((id) => {
				if (id === 1) return 'Hello'
				if (id === 2) return ' '
				if (id === 3) return 'world'
				if (id === 999) return ''
				return String(id)
			}).join('')
		}),
		tokens: {
			bos: 0,
			eos: 999,
		},
	}

	return {
		getSequence: vi.fn().mockReturnValue(mockSequence),
		model: mockModel,
	}
}

describe('NodeLlamaCppProvider', () => {
	describe('createNodeLlamaCppProviderAdapter', () => {
		it('creates a provider adapter', () => {
			const mockContext = createMockContext([1, 2, 3])

			const provider = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			expect(provider).toBeDefined()
			expect(typeof provider.getId).toBe('function')
			expect(typeof provider.generate).toBe('function')
			expect(typeof provider.supportsTools).toBe('function')
			expect(typeof provider.supportsStreaming).toBe('function')
			expect(typeof provider.getCapabilities).toBe('function')
		})

		it('generates unique IDs', () => {
			const mockContext1 = createMockContext([])
			const mockContext2 = createMockContext([])

			const provider1 = createNodeLlamaCppProviderAdapter({ context: mockContext1 })
			const provider2 = createNodeLlamaCppProviderAdapter({ context: mockContext2 })

			expect(provider1.getId()).not.toBe(provider2.getId())
		})
	})

	describe('getCapabilities', () => {
		it('returns capabilities', () => {
			const mockContext = createMockContext([])

			const provider = createNodeLlamaCppProviderAdapter({
				context: mockContext,
				modelName: 'llama3-8b',
			})

			const capabilities = provider.getCapabilities()

			expect(capabilities.supportsTools).toBe(false)
			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsVision).toBe(false)
			expect(capabilities.supportsFunctions).toBe(false)
			expect(capabilities.models).toContain('llama3-8b')
		})
	})

	describe('supportsTools', () => {
		it('returns false', () => {
			const mockContext = createMockContext([])

			const provider = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			expect(provider.supportsTools()).toBe(false)
		})
	})

	describe('generate', () => {
		it('streams tokens from context', async() => {
			// Mock sequence that returns tokens
			const mockContext = createMockContext([1, 2, 3, 999])

			const provider = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello',
					createdAt: Date.now(),
				},
			]

			const tokens: string[] = []
			const stream = provider.generate(messages, {})

			stream.onToken((token) => tokens.push(token))

			const result = await stream.result()

			expect(tokens).toEqual(['Hello', ' ', 'world', ''])
			expect(result.finishReason).toBe('stop')
			expect(result.aborted).toBe(false)
		})

		it('handles abort', async() => {
			const mockContext = createMockContext([1, 2, 3])

			const provider = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello',
					createdAt: Date.now(),
				},
			]

			const stream = provider.generate(messages, {})

			// Abort immediately
			stream.abort()

			const result = await stream.result()
			expect(result.aborted).toBe(true)
		})

		it('returns empty tool calls', async() => {
			const mockContext = createMockContext([1, 999])

			const provider = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello',
					createdAt: Date.now(),
				},
			]

			const stream = provider.generate(messages, {})
			const result = await stream.result()

			expect(result.toolCalls).toEqual([])
		})
	})
})
