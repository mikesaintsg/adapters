/**
 * @mikesaintsg/adapters
 *
 * Tests for HuggingFace Transformers provider adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/core'
import type {
	HuggingFaceTextGenerationPipeline,
	HuggingFaceTextGenerationOutput,
} from '@mikesaintsg/adapters'

/**
 * Create a mock HuggingFace text generation pipeline for testing.
 */
function createMockPipeline(options?: {
	generatedText?: string
	shouldError?: boolean
	errorMessage?: string
}): HuggingFaceTextGenerationPipeline {
	const generatedText = options?.generatedText ?? 'Hello! How can I help you today?'
	const shouldError = options?.shouldError ?? false
	const errorMessage = options?.errorMessage ?? 'Pipeline error'

	const mockPipeline = vi.fn().mockImplementation((): Promise<HuggingFaceTextGenerationOutput[]> => {
		if (shouldError) {
			return Promise.reject(new Error(errorMessage))
		}
		return Promise.resolve([{ generated_text: generatedText }])
	}) as unknown as HuggingFaceTextGenerationPipeline

	return mockPipeline
}

describe('HuggingFace Provider Adapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('createHuggingFaceProviderAdapter', () => {
		it('creates adapter with required options', () => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			expect(adapter.getId()).toBe('huggingface:gpt2')
		})

		it('throws error when pipeline is not provided', () => {
			expect(() =>
				createHuggingFaceProviderAdapter({
					pipeline: undefined as unknown as HuggingFaceTextGenerationPipeline,
					modelName: 'gpt2',
				}),
			).toThrow('HuggingFace pipeline is required')
		})

		it('throws error when modelName is not provided', () => {
			const mockPipeline = createMockPipeline()
			expect(() =>
				createHuggingFaceProviderAdapter({
					pipeline: mockPipeline,
					modelName: '',
				}),
			).toThrow('Model name is required')
		})

		it('does not support tools', () => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			expect(adapter.supportsTools()).toBe(false)
		})

		it('does not support streaming', () => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			expect(adapter.supportsStreaming()).toBe(false)
		})

		it('returns correct capabilities', () => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const capabilities = adapter.getCapabilities()
			expect(capabilities.supportsStreaming).toBe(false)
			expect(capabilities.supportsTools).toBe(false)
			expect(capabilities.supportsVision).toBe(false)
			expect(capabilities.supportsFunctions).toBe(false)
			expect(capabilities.models).toEqual(['gpt2'])
		})
	})

	describe('generate', () => {
		it('generates text from messages', async() => {
			const mockPipeline = createMockPipeline({ generatedText: 'Generated response' })
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			const result = await handle.result()

			expect(result.text).toBe('Generated response')
			expect(result.finishReason).toBe('stop')
			expect(result.aborted).toBe(false)
		})

		it('calls pipeline with formatted prompt', async() => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'system', content: 'You are helpful.', createdAt: Date.now() },
				{ id: '2', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			await handle.result()

			expect(mockPipeline).toHaveBeenCalledWith(
				expect.stringContaining('System: You are helpful.'),
				expect.any(Object),
			)
			expect(mockPipeline).toHaveBeenCalledWith(
				expect.stringContaining('User: Hello!'),
				expect.any(Object),
			)
			expect(mockPipeline).toHaveBeenCalledWith(
				expect.stringContaining('Assistant:'),
				expect.any(Object),
			)
		})

		it('passes generation options to pipeline', async() => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {
				maxTokens: 50,
				temperature: 0.7,
				topP: 0.9,
			})
			await handle.result()

			expect(mockPipeline).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					max_new_tokens: 50,
					temperature: 0.7,
					top_p: 0.9,
					do_sample: true,
					return_full_text: false,
				}),
			)
		})

		it('uses default options when not provided', async() => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
				defaultOptions: {
					maxTokens: 200,
					temperature: 0.5,
				},
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			await handle.result()

			expect(mockPipeline).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					max_new_tokens: 200,
					temperature: 0.5,
				}),
			)
		})

		it('supports async iteration', async() => {
			const mockPipeline = createMockPipeline({ generatedText: 'Test output' })
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			const chunks: string[] = []

			for await (const chunk of handle) {
				chunks.push(chunk)
			}

			expect(chunks).toEqual(['Test output'])
		})

		it('supports onToken callback', async() => {
			const mockPipeline = createMockPipeline({ generatedText: 'Callback test' })
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			const tokens: string[] = []

			handle.onToken(token => tokens.push(token))
			await handle.result()

			expect(tokens).toEqual(['Callback test'])
		})

		it('supports onComplete callback', async() => {
			const mockPipeline = createMockPipeline({ generatedText: 'Complete test' })
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})

			const completePromise = new Promise<string>(resolve => {
				handle.onComplete(result => resolve(result.text))
			})

			const text = await completePromise
			expect(text).toBe('Complete test')
		})

		it('supports onError callback', async() => {
			const mockPipeline = createMockPipeline({
				shouldError: true,
				errorMessage: 'Test error',
			})
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})

			const errorPromise = new Promise<Error>(resolve => {
				handle.onError(error => resolve(error))
			})

			const error = await errorPromise
			expect(error.message).toBe('Test error')

			// Also catch the rejection to prevent unhandled rejection
			await expect(handle.result()).rejects.toThrow('Test error')
		})

		it('handles pipeline errors gracefully', async() => {
			const mockPipeline = createMockPipeline({
				shouldError: true,
				errorMessage: 'Pipeline failed',
			})
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})

			await expect(handle.result()).rejects.toThrow('Pipeline failed')
		})

		it('has a unique requestId', () => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle1 = adapter.generate(messages, {})
			const handle2 = adapter.generate(messages, {})

			expect(handle1.requestId).toBeDefined()
			expect(handle2.requestId).toBeDefined()
			expect(handle1.requestId).not.toBe(handle2.requestId)
		})

		it('can be aborted', async() => {
			// Create a slow pipeline
			let aborted = false
			const slowPipeline = vi.fn().mockImplementation(async() => {
				await new Promise(resolve => setTimeout(resolve, 100))
				if (aborted) {
					return [{ generated_text: '' }]
				}
				return [{ generated_text: 'Too slow' }]
			}) as unknown as HuggingFaceTextGenerationPipeline

			const adapter = createHuggingFaceProviderAdapter({
				pipeline: slowPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})

			// Abort immediately
			handle.abort()
			aborted = true

			const result = await handle.result()
			// When aborted, text may be empty
			expect(result.aborted).toBe(true)
		})

		it('handles single output format', async() => {
			// Some pipelines return a single object instead of array
			const singleOutputPipeline = vi.fn().mockResolvedValue({
				generated_text: 'Single output',
			}) as unknown as HuggingFaceTextGenerationPipeline

			const adapter = createHuggingFaceProviderAdapter({
				pipeline: singleOutputPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			const result = await handle.result()

			expect(result.text).toBe('Single output')
		})

		it('handles assistant messages in conversation', async() => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
				{ id: '2', role: 'assistant', content: 'Hi there!', createdAt: Date.now() },
				{ id: '3', role: 'user', content: 'How are you?', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			await handle.result()

			expect(mockPipeline).toHaveBeenCalledWith(
				expect.stringContaining('Assistant: Hi there!'),
				expect.any(Object),
			)
		})

		it('returns empty toolCalls array', async() => {
			const mockPipeline = createMockPipeline()
			const adapter = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			const messages: Message[] = [
				{ id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() },
			]

			const handle = adapter.generate(messages, {})
			const result = await handle.result()

			expect(result.toolCalls).toEqual([])
		})
	})
})
