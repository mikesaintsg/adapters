/**
 * Ollama Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOllamaProviderAdapter } from '../../../src/core/providers/OllamaProvider.js'
import type { Message } from '@mikesaintsg/core'

// Helper to create mock NDJSON response for Ollama
function createNDJSONResponse(chunks: object[]): Response {
	const encoder = new TextEncoder()
	let chunkIndex = 0

	const stream = new ReadableStream({
		pull(controller) {
			if (chunkIndex < chunks.length) {
				controller.enqueue(encoder.encode(JSON.stringify(chunks[chunkIndex]) + '\n'))
				chunkIndex++
			} else {
				controller.close()
			}
		},
	})

	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'application/x-ndjson' },
	})
}

// Helper to create mock error response
function createErrorResponse(status: number, errorBody: unknown): Response {
	return new Response(JSON.stringify(errorBody), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('OllamaProvider', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('createOllamaProviderAdapter', () => {
		it('creates a provider adapter', () => {
			const provider = createOllamaProviderAdapter({
				model: 'llama3',
			})

			expect(provider).toBeDefined()
			expect(typeof provider.getId).toBe('function')
			expect(typeof provider.generate).toBe('function')
			expect(typeof provider.supportsTools).toBe('function')
			expect(typeof provider.supportsStreaming).toBe('function')
			expect(typeof provider.getCapabilities).toBe('function')
		})

		it('generates unique IDs', () => {
			const provider1 = createOllamaProviderAdapter({ model: 'llama3' })
			const provider2 = createOllamaProviderAdapter({ model: 'llama3' })

			expect(provider1.getId()).not.toBe(provider2.getId())
		})
	})

	describe('getCapabilities', () => {
		it('returns capabilities', () => {
			const provider = createOllamaProviderAdapter({
				model: 'llama3',
			})

			const capabilities = provider.getCapabilities()

			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsVision).toBe(false)
			expect(capabilities.supportsFunctions).toBe(true)
			expect(capabilities.models).toContain('llama3')
		})

		it('detects vision models', () => {
			const provider = createOllamaProviderAdapter({
				model: 'llava',
			})

			const capabilities = provider.getCapabilities()
			expect(capabilities.supportsVision).toBe(true)
		})
	})

	describe('generate', () => {
		it('streams tokens from NDJSON response', async() => {
			const mockResponse = createNDJSONResponse([
				{ model: 'llama3', message: { content: 'Hello' }, done: false },
				{ model: 'llama3', message: { content: ' world' }, done: false },
				{ model: 'llama3', message: { content: '' }, done: true, done_reason: 'stop' },
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOllamaProviderAdapter({
				model: 'llama3',
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

			expect(tokens).toEqual(['Hello', ' world'])
			expect(result.text).toBe('Hello world')
			expect(result.finishReason).toBe('stop')
			expect(result.aborted).toBe(false)
		})

		it('handles tool calls', async() => {
			const mockResponse = createNDJSONResponse([
				{
					model: 'llama3',
					message: {
						content: '',
						tool_calls: [{
							id: 'call_123',
							type: 'function',
							function: { name: 'get_weather', arguments: { city: 'NYC' } },
						}],
					},
					done: true,
					done_reason: 'stop',
				},
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOllamaProviderAdapter({
				model: 'llama3',
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

			expect(result.toolCalls).toHaveLength(1)
			expect(result.toolCalls[0]?.name).toBe('get_weather')
			expect(result.toolCalls[0]?.arguments).toEqual({ city: 'NYC' })
		})

		it('handles abort', async() => {
			const mockResponse = createNDJSONResponse([
				{ model: 'llama3', message: { content: 'Hello' }, done: false },
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOllamaProviderAdapter({
				model: 'llama3',
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

		it('handles usage stats', async() => {
			const mockResponse = createNDJSONResponse([
				{ model: 'llama3', message: { content: 'Hello' }, done: false },
				{
					model: 'llama3',
					message: { content: '' },
					done: true,
					done_reason: 'stop',
					prompt_eval_count: 10,
					eval_count: 5,
				},
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createOllamaProviderAdapter({
				model: 'llama3',
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

			expect(result.usage).toBeDefined()
			expect(result.usage?.promptTokens).toBe(10)
			expect(result.usage?.completionTokens).toBe(5)
			expect(result.usage?.totalTokens).toBe(15)
		})
	})

	describe('error handling', () => {
		it('maps 404 to MODEL_NOT_FOUND_ERROR', async() => {
			vi.mocked(fetch).mockResolvedValue(createErrorResponse(404, {
				error: 'model not found',
			}))

			const provider = createOllamaProviderAdapter({
				model: 'nonexistent',
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

			await expect(stream.result()).rejects.toThrow('model not found')
		})

		it('maps 400 to INVALID_REQUEST_ERROR', async() => {
			vi.mocked(fetch).mockResolvedValue(createErrorResponse(400, {
				error: 'invalid request',
			}))

			const provider = createOllamaProviderAdapter({
				model: 'llama3',
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

			await expect(stream.result()).rejects.toThrow('invalid request')
		})
	})
})
