/**
 * @mikesaintsg/adapters
 *
 * Tests for Ollama provider adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOllamaProviderAdapter } from '@mikesaintsg/adapters'
import type { Message } from '@mikesaintsg/inference'

describe('Ollama Provider Adapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('createOllamaProviderAdapter', () => {
		it('creates adapter with specified model', () => {
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
			})

			expect(adapter.getId()).toBe('ollama:llama3')
		})

		it('creates adapter with custom baseURL', () => {
			const adapter = createOllamaProviderAdapter({
				model: 'mistral',
				baseURL: 'http://localhost:5000',
			})

			expect(adapter.getId()).toBe('ollama:mistral')
		})

		it('supports tools', () => {
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
			})

			expect(adapter.supportsTools()).toBe(true)
		})

		it('supports streaming', () => {
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
			})

			expect(adapter.supportsStreaming()).toBe(true)
		})

		it('returns correct capabilities', () => {
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
			})

			const capabilities = adapter.getCapabilities()

			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsVision).toBe(false)
			expect(capabilities.supportsFunctions).toBe(true)
			expect(capabilities.models).toContain('llama3')
		})
	})

	describe('generate', () => {
		it('returns a StreamHandle with requestId', () => {
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
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
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
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
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
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
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
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
			const adapter = createOllamaProviderAdapter({
				model: 'llama3',
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
