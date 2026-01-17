/**
 * @mikesaintsg/adapters
 *
 * Tests for OpenAI provider adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/inference'

describe('OpenAI Provider Adapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('createOpenAIProviderAdapter', () => {
		it('creates adapter with default model', () => {
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.getId()).toBe('openai:gpt-4o')
		})

		it('creates adapter with custom model', () => {
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-3.5-turbo',
			})

			expect(adapter.getId()).toBe('openai:gpt-3.5-turbo')
		})

		it('supports tools', () => {
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.supportsTools()).toBe(true)
		})

		it('supports streaming', () => {
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.supportsStreaming()).toBe(true)
		})

		it('returns correct capabilities', () => {
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-4o',
			})

			const capabilities = adapter.getCapabilities()

			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsVision).toBe(true)
			expect(capabilities.supportsFunctions).toBe(true)
			expect(capabilities.models).toContain('gpt-4o')
		})

		it('returns vision capability based on model', () => {
			const gpt35Adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-3.5-turbo',
			})

			expect(gpt35Adapter.getCapabilities().supportsVision).toBe(false)

			const visionAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-4-vision-preview',
			})

			expect(visionAdapter.getCapabilities().supportsVision).toBe(true)
		})
	})

	describe('generate', () => {
		it('returns a StreamHandle with requestId', () => {
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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
			const adapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
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
	})
})
