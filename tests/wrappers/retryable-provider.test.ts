/**
 * @mikesaintsg/adapters
 *
 * Tests for retryable provider adapter wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRetryableProviderAdapter, createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/inference'

describe('Retryable Provider Adapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('createRetryableProviderAdapter', () => {
		it('wraps a base adapter and preserves getId', () => {
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-4o',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
			})

			expect(adapter.getId()).toBe('openai:gpt-4o')
		})

		it('preserves supportsTools from base adapter', () => {
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
			})

			expect(adapter.supportsTools()).toBe(true)
		})

		it('preserves supportsStreaming from base adapter', () => {
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
			})

			expect(adapter.supportsStreaming()).toBe(true)
		})

		it('preserves getCapabilities from base adapter', () => {
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
				model: 'gpt-4o',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
			})

			const capabilities = adapter.getCapabilities()

			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsTools).toBe(true)
		})
	})

	describe('generate', () => {
		it('returns a StreamHandle with requestId', () => {
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
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
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
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
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
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
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
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

		it('allows abort and returns aborted result', async() => {
			const baseAdapter = createOpenAIProviderAdapter({
				apiKey: 'test-key',
			})

			const adapter = createRetryableProviderAdapter({
				adapter: baseAdapter,
				retry: { maxRetries: 3 },
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
