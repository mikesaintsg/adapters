/**
 * OpenAI Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/core'
import { createSSEResponse, createErrorResponse } from '../../setup.js'

describe('OpenAIProvider', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('createOpenAIProviderAdapter', () => {
		it('creates a provider adapter', () => {
			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			expect(provider).toBeDefined()
			expect(typeof provider.getId).toBe('function')
			expect(typeof provider.generate).toBe('function')
			expect(typeof provider.supportsTools).toBe('function')
			expect(typeof provider.supportsStreaming).toBe('function')
			expect(typeof provider.getCapabilities).toBe('function')
		})

		it('generates unique IDs', () => {
			const provider1 = createOpenAIProviderAdapter({ apiKey: 'key1' })
			const provider2 = createOpenAIProviderAdapter({ apiKey: 'key2' })

			expect(provider1.getId()).not.toBe(provider2.getId())
		})
	})

	describe('getCapabilities', () => {
		it('returns capabilities', () => {
			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-4o',
			})

			const capabilities = provider.getCapabilities()

			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsVision).toBe(true)
			expect(capabilities.supportsFunctions).toBe(true)
			expect(capabilities.models).toContain('gpt-4o')
		})
	})

	describe('generate', () => {
		it('streams tokens from SSE response', async() => {
			const mockResponse = createSSEResponse([
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
				'data: [DONE]\n\n',
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-4o',
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

			stream.onToken((token: string) => tokens.push(token))

			const result = await stream.result()

			expect(tokens).toEqual(['Hello', ' world'])
			expect(result.text).toBe('Hello world')
			expect(result.finishReason).toBe('stop')
			expect(result.aborted).toBe(false)
		})

		it('handles tool calls', async() => {
			const mockResponse = createSSEResponse([
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather"}}]},"finish_reason":null}]}\n\n',
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"city\\":"}}]},"finish_reason":null}]}\n\n',
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"NYC\\"}"}}]},"finish_reason":null}]}\n\n',
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}\n\n',
				'data: [DONE]\n\n',
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const messages: Message[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: 'What is the weather in NYC?',
					createdAt: Date.now(),
				},
			]

			const stream = provider.generate(messages, {})
			const result = await stream.result()

			expect(result.finishReason).toBe('tool_calls')
			expect(result.toolCalls).toHaveLength(1)
			expect(result.toolCalls[0]?.name).toBe('get_weather')
			expect(result.toolCalls[0]?.arguments).toEqual({ city: 'NYC' })
		})

		it('handles abort', async() => {
			// Create a slow response
			const mockResponse = createSSEResponse([
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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
	})

	describe('error handling', () => {
		it('maps 401 to AUTHENTICATION_ERROR', async() => {
			vi.mocked(fetch).mockResolvedValue(createErrorResponse(401, {
				error: { message: 'Invalid API key', code: 'invalid_api_key' },
			}))

			const provider = createOpenAIProviderAdapter({
				apiKey: 'bad-key',
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

			await expect(stream.result()).rejects.toThrow('Invalid API key')
		})

		it('maps 429 to RATE_LIMIT_ERROR', async() => {
			vi.mocked(fetch).mockResolvedValue(createErrorResponse(429, {
				error: { message: 'Rate limit exceeded' },
			}))

			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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

			await expect(stream.result()).rejects.toThrow('Rate limit exceeded')
		})

		it('maps 404 to MODEL_NOT_FOUND_ERROR', async() => {
			vi.mocked(fetch).mockResolvedValue(createErrorResponse(404, {
				error: { message: 'Model not found' },
			}))

			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'non-existent-model',
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

			await expect(stream.result()).rejects.toThrow('Model not found')
		})
	})

	describe('async iteration', () => {
		it('supports for await...of', async() => {
			const mockResponse = createSSEResponse([
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"A"},"finish_reason":null}]}\n\n',
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"B"},"finish_reason":null}]}\n\n',
				'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"gpt-4o","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
				'data: [DONE]\n\n',
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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
			const tokens: string[] = []

			for await (const token of stream) {
				tokens.push(token)
			}

			expect(tokens).toEqual(['A', 'B'])
		})
	})
})
