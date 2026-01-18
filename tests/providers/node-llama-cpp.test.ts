/**
 * @mikesaintsg/adapters
 *
 * Tests for node-llama-cpp provider adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/core'
import type {
	NodeLlamaCppContext,
	NodeLlamaCppModel,
	NodeLlamaCppContextSequence,
	NodeLlamaCppChatWrapper,
} from '@mikesaintsg/adapters'

/**
 * Create a mock node-llama-cpp context for testing.
 */
function createMockContext(options?: {
	tokens?: number[]
}): NodeLlamaCppContext {
	const mockTokens = options?.tokens ?? [1, 2, 3]

	const mockSequence: NodeLlamaCppContextSequence = {
		evaluate: vi.fn().mockImplementation(function* () {
			for (const token of mockTokens) {
				yield token
			}
		}),
	}

	const mockModel: NodeLlamaCppModel = {
		tokenize: vi.fn().mockReturnValue([1, 2, 3, 4, 5]),
		detokenize: vi.fn().mockImplementation((tokens: readonly number[]) => {
			// Return a simple character for each token
			return tokens.map(t => String.fromCharCode(97 + (t % 26))).join('')
		}),
		tokens: {
			bos: 1,
			eos: 2,
		},
	}

	return {
		getSequence: vi.fn().mockReturnValue(mockSequence),
		model: mockModel,
	}
}

/**
 * Create a mock chat wrapper for testing.
 */
function createMockChatWrapper(): NodeLlamaCppChatWrapper {
	return {
		generateContextState: vi.fn().mockReturnValue({
			contextText: {
				tokenize: vi.fn().mockReturnValue([1, 2, 3, 4, 5]),
			},
			stopGenerationTriggers: [],
		}),
	}
}

describe('node-llama-cpp Provider Adapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('createNodeLlamaCppProviderAdapter', () => {
		it('creates adapter with required context', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			expect(adapter.getId()).toBe('node-llama-cpp:node-llama-cpp')
		})

		it('creates adapter with custom model name', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
				modelName: 'llama3',
			})

			expect(adapter.getId()).toBe('node-llama-cpp:llama3')
		})

		it('does not support tools without chat wrapper', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			expect(adapter.supportsTools()).toBe(false)
		})

		it('supports tools with chat wrapper', () => {
			const mockContext = createMockContext()
			const mockChatWrapper = createMockChatWrapper()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
				chatWrapper: mockChatWrapper,
			})

			expect(adapter.supportsTools()).toBe(true)
		})

		it('supports streaming', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			expect(adapter.supportsStreaming()).toBe(true)
		})

		it('returns correct capabilities without chat wrapper', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
				modelName: 'llama3',
			})

			const capabilities = adapter.getCapabilities()

			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsTools).toBe(false)
			expect(capabilities.supportsVision).toBe(false)
			expect(capabilities.supportsFunctions).toBe(false)
			expect(capabilities.models).toContain('llama3')
		})

		it('returns correct capabilities with chat wrapper', () => {
			const mockContext = createMockContext()
			const mockChatWrapper = createMockChatWrapper()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
				chatWrapper: mockChatWrapper,
				modelName: 'llama3',
			})

			const capabilities = adapter.getCapabilities()

			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsFunctions).toBe(true)
		})
	})

	describe('generate', () => {
		it('returns a StreamHandle with requestId', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {})

			expect(handle.requestId).toBeDefined()
			expect(typeof handle.requestId).toBe('string')

			// Abort to clean up
			handle.abort()
		})

		it('provides async iteration interface', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {})

			expect(typeof handle[Symbol.asyncIterator]).toBe('function')

			// Abort to clean up
			handle.abort()
		})

		it('provides result() method', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {})

			expect(typeof handle.result).toBe('function')
			expect(handle.result()).toBeInstanceOf(Promise)

			// Abort to clean up
			handle.abort()
		})

		it('provides subscription methods', () => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {})

			expect(typeof handle.onToken).toBe('function')
			expect(typeof handle.onComplete).toBe('function')
			expect(typeof handle.onError).toBe('function')

			// Abort to clean up
			handle.abort()
		})

		it('allows abort', async() => {
			const mockContext = createMockContext()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {})
			handle.abort()

			const result = await handle.result()

			expect(result.aborted).toBe(true)
		})

		it('generates text from tokens', async() => {
			const mockContext = createMockContext({ tokens: [0, 1, 2] })
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {})
			const result = await handle.result()

			// Should have accumulated text from detokenized tokens
			expect(result.text).toBeDefined()
			expect(result.finishReason).toBe('stop')
			expect(result.aborted).toBe(false)
		})

		it('uses chat wrapper when provided', async() => {
			const mockContext = createMockContext({ tokens: [0, 1] })
			const mockChatWrapper = createMockChatWrapper()
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
				chatWrapper: mockChatWrapper,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {})
			await handle.result()

			// Verify chat wrapper was used
			expect(mockChatWrapper.generateContextState).toHaveBeenCalled()
		})

		it('handles multiple messages', async() => {
			const mockContext = createMockContext({ tokens: [0] })
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [
				{
					id: '1',
					role: 'system',
					content: 'You are helpful.',
					createdAt: Date.now(),
				},
				{
					id: '2',
					role: 'user',
					content: 'Hello',
					createdAt: Date.now(),
				},
				{
					id: '3',
					role: 'assistant',
					content: 'Hi there!',
					createdAt: Date.now(),
				},
				{
					id: '4',
					role: 'user',
					content: 'How are you?',
					createdAt: Date.now(),
				},
			]

			const handle = adapter.generate(messages, {})
			const result = await handle.result()

			expect(result.finishReason).toBe('stop')
		})

		it('passes generation options', async() => {
			const mockContext = createMockContext({ tokens: [0] })
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const handle = adapter.generate(messages, {
				temperature: 0.7,
				topP: 0.9,
				maxTokens: 100,
			})

			await handle.result()

			// Verify sequence.evaluate was called
			const sequence = mockContext.getSequence()
			expect(sequence.evaluate).toHaveBeenCalled()
		})

		it('emits tokens via onToken callback', async() => {
			const mockContext = createMockContext({ tokens: [0, 1, 2] })
			const adapter = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			const messages: Message[] = [{
				id: '1',
				role: 'user',
				content: 'Hello',
				createdAt: Date.now(),
			}]

			const tokens: string[] = []
			const handle = adapter.generate(messages, {})

			handle.onToken((token) => {
				tokens.push(token)
			})

			await handle.result()

			// Should have received tokens
			expect(tokens.length).toBeGreaterThan(0)
		})
	})
})
