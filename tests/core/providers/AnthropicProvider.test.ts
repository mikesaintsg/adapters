import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAnthropicProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/core'

// Helper to create mock SSE response for Anthropic
function createSSEResponse(chunks: string[]): Response {
	const encoder = new TextEncoder()
	let chunkIndex = 0

	const stream = new ReadableStream({
		pull(controller) {
			if (chunkIndex < chunks.length) {
				controller.enqueue(encoder.encode(chunks[chunkIndex]))
				chunkIndex++
			} else {
				controller.close()
			}
		},
	})

	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	})
}

// Helper to create mock error response
function createErrorResponse(status: number, errorBody: unknown): Response {
	return new Response(JSON.stringify(errorBody), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('AnthropicProvider', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('createAnthropicProviderAdapter', () => {
		it('creates a provider adapter', () => {
			const provider = createAnthropicProviderAdapter({
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
			const provider1 = createAnthropicProviderAdapter({ apiKey: 'key1' })
			const provider2 = createAnthropicProviderAdapter({ apiKey: 'key2' })

			expect(provider1.getId()).not.toBe(provider2.getId())
		})
	})

	describe('getCapabilities', () => {
		it('returns capabilities', () => {
			const provider = createAnthropicProviderAdapter({
				apiKey: 'test-key',
				model: 'claude-3-5-sonnet-20241022',
			})

			const capabilities = provider.getCapabilities()

			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsVision).toBe(true)
			expect(capabilities.supportsFunctions).toBe(true)
			expect(capabilities.models).toContain('claude-3-5-sonnet-20241022')
		})
	})

	describe('generate', () => {
		it('streams tokens from SSE response', async() => {
			const mockResponse = createSSEResponse([
				'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","content":[],"model":"claude-3-5-sonnet-20241022"}}\n\n',
				'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
				'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
				'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n',
				'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
				'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
				'event: message_stop\ndata: {"type":"message_stop"}\n\n',
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createAnthropicProviderAdapter({
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

			const tokens: string[] = []
			const stream = provider.generate(messages, {})

			stream.onToken((token) => tokens.push(token))

			const result = await stream.result()

			expect(tokens).toEqual(['Hello', ' world'])
			expect(result.text).toBe('Hello world')
			expect(result.finishReason).toBe('stop')
			expect(result.aborted).toBe(false)
		})

		it('handles tool use', async() => {
			const mockResponse = createSSEResponse([
				'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","content":[]}}\n\n',
				'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call_123","name":"get_weather"}}\n\n',
				'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"city\\":"}}\n\n',
				'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\\"NYC\\"}"}}\n\n',
				'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
				'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\n',
				'event: message_stop\ndata: {"type":"message_stop"}\n\n',
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createAnthropicProviderAdapter({
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
			const mockResponse = createSSEResponse([
				'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
			])

			vi.mocked(fetch).mockResolvedValue(mockResponse)

			const provider = createAnthropicProviderAdapter({
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
				error: { message: 'Invalid API key', type: 'invalid_api_key' },
			}))

			const provider = createAnthropicProviderAdapter({
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

			const provider = createAnthropicProviderAdapter({
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

		it('maps 529 to SERVICE_ERROR', async() => {
			vi.mocked(fetch).mockResolvedValue(createErrorResponse(529, {
				error: { message: 'API is temporarily overloaded' },
			}))

			const provider = createAnthropicProviderAdapter({
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

			await expect(stream.result()).rejects.toThrow('API is temporarily overloaded')
		})
	})
})
