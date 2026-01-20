/**
 * NodeLlamaCpp Provider Tests
 */

import { describe, it, expect } from 'vitest'
import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/core'
import { createMockNodeLlamaCppContext } from '../../setup.js'

describe('NodeLlamaCppProvider', () => {
	describe('createNodeLlamaCppProviderAdapter', () => {
		it('creates a provider adapter', () => {
			const mockContext = createMockNodeLlamaCppContext([1, 2, 3])

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
			const mockContext1 = createMockNodeLlamaCppContext([])
			const mockContext2 = createMockNodeLlamaCppContext([])

			const provider1 = createNodeLlamaCppProviderAdapter({ context: mockContext1 })
			const provider2 = createNodeLlamaCppProviderAdapter({ context: mockContext2 })

			expect(provider1.getId()).not.toBe(provider2.getId())
		})
	})

	describe('getCapabilities', () => {
		it('returns capabilities', () => {
			const mockContext = createMockNodeLlamaCppContext([])

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
			const mockContext = createMockNodeLlamaCppContext([])

			const provider = createNodeLlamaCppProviderAdapter({
				context: mockContext,
			})

			expect(provider.supportsTools()).toBe(false)
		})
	})

	describe('generate', () => {
		it('streams tokens from context', async() => {
			// Mock sequence that returns tokens
			const mockContext = createMockNodeLlamaCppContext([1, 2, 3, 999])

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
			const mockContext = createMockNodeLlamaCppContext([1, 2, 3])

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
			const mockContext = createMockNodeLlamaCppContext([1, 999])

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
