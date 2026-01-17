/**
 * @mikesaintsg/adapters
 *
 * Tests for Anthropic provider adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAnthropicProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/inference'

describe('Anthropic Provider Adapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('createAnthropicProviderAdapter', () => {
		it('creates adapter with default model', () => {
			const adapter = createAnthropicProviderAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.getId()).toBe('anthropic:claude-3-5-sonnet-20241022')
		})

		it('creates adapter with custom model', () => {
			const adapter = createAnthropicProviderAdapter({
				apiKey: 'test-key',
				model: 'claude-3-opus-20240229',
			})

			expect(adapter.getId()).toBe('anthropic:claude-3-opus-20240229')
		})

		it('supports tools', () => {
			const adapter = createAnthropicProviderAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.supportsTools()).toBe(true)
		})

		it('supports streaming', () => {
			const adapter = createAnthropicProviderAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.supportsStreaming()).toBe(true)
		})

		it('returns correct capabilities', () => {
			const adapter = createAnthropicProviderAdapter({
				apiKey: 'test-key',
			})

			const capabilities = adapter.getCapabilities()

			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsVision).toBe(true)
			expect(capabilities.supportsFunctions).toBe(true)
		})
	})

	describe('generate', () => {
		it('returns a StreamHandle with requestId', () => {
			const adapter = createAnthropicProviderAdapter({
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
			const adapter = createAnthropicProviderAdapter({
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
			const adapter = createAnthropicProviderAdapter({
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
			const adapter = createAnthropicProviderAdapter({
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
			const adapter = createAnthropicProviderAdapter({
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
