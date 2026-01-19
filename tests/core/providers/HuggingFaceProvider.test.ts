/**
 * HuggingFace Provider Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { createHuggingFaceProviderAdapter } from '../../../src/core/providers/HuggingFaceProvider.js'
import type { Message } from '@mikesaintsg/core'
import type { HuggingFaceTextGenerationPipeline, HuggingFaceTextGenerationOutput } from '../../../src/types.js'

// Create mock pipeline for testing
function createMockPipeline(
	outputs: readonly HuggingFaceTextGenerationOutput[],
): HuggingFaceTextGenerationPipeline {
	return vi.fn().mockResolvedValue(outputs) as unknown as HuggingFaceTextGenerationPipeline
}

describe('HuggingFaceProvider', () => {
	describe('createHuggingFaceProviderAdapter', () => {
		it('creates a provider adapter', () => {
			const mockPipeline = createMockPipeline([{ generated_text: 'Hello' }])

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			expect(provider).toBeDefined()
			expect(typeof provider.getId).toBe('function')
			expect(typeof provider.generate).toBe('function')
			expect(typeof provider.supportsTools).toBe('function')
			expect(typeof provider.supportsStreaming).toBe('function')
			expect(typeof provider.getCapabilities).toBe('function')
		})

		it('generates unique IDs', () => {
			const mockPipeline = createMockPipeline([{ generated_text: 'Hello' }])

			const provider1 = createHuggingFaceProviderAdapter({ pipeline: mockPipeline, modelName: 'gpt2' })
			const provider2 = createHuggingFaceProviderAdapter({ pipeline: mockPipeline, modelName: 'gpt2' })

			expect(provider1.getId()).not.toBe(provider2.getId())
		})
	})

	describe('getCapabilities', () => {
		it('returns capabilities', () => {
			const mockPipeline = createMockPipeline([{ generated_text: 'Hello' }])

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'Xenova/gpt2',
			})

			const capabilities = provider.getCapabilities()

			expect(capabilities.supportsTools).toBe(false)
			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsVision).toBe(false)
			expect(capabilities.supportsFunctions).toBe(false)
			expect(capabilities.models).toContain('Xenova/gpt2')
		})
	})

	describe('supportsTools', () => {
		it('returns false', () => {
			const mockPipeline = createMockPipeline([{ generated_text: 'Hello' }])

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
			})

			expect(provider.supportsTools()).toBe(false)
		})
	})

	describe('generate', () => {
		it('generates text using pipeline', async() => {
			const mockPipeline = createMockPipeline([{ generated_text: 'Hello world!' }])

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
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

			expect(result.text).toBe('Hello world!')
			expect(result.finishReason).toBe('stop')
			expect(result.aborted).toBe(false)
		})

		it('handles abort', async() => {
			const mockPipeline = createMockPipeline([{ generated_text: 'Hello' }])

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
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
			const mockPipeline = createMockPipeline([{ generated_text: 'Hello' }])

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
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

		it('handles multiple outputs', async() => {
			const mockPipeline = createMockPipeline([
				{ generated_text: 'First ' },
				{ generated_text: 'Second' },
			])

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
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

			expect(result.text).toBe('First Second')
		})
	})

	describe('error handling', () => {
		it('handles pipeline errors', async() => {
			const mockPipeline = vi.fn().mockRejectedValue(new Error('Model loading failed')) as unknown as HuggingFaceTextGenerationPipeline

			const provider = createHuggingFaceProviderAdapter({
				pipeline: mockPipeline,
				modelName: 'gpt2',
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

			await expect(stream.result()).rejects.toThrow()
		})
	})
})
