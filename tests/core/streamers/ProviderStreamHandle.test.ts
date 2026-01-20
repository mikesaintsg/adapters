/**
 * ProviderStreamHandle Tests
 *
 * Tests for the provider stream handle implementation.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	createProviderStreamHandle,
	createStreamerAdapter,
} from '@mikesaintsg/adapters'

describe('ProviderStreamHandle', () => {
	describe('construction', () => {
		it('creates with requestId', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			expect(handle.requestId).toBe('test-id')
		})

		it('starts not completed', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			expect(handle.isCompleted()).toBe(false)
			expect(handle.isAborted()).toBe(false)
		})
	})

	describe('emitToken', () => {
		it('accumulates text', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.emitToken('Hello')
			handle.emitToken(' world')

			expect(handle.getText()).toBe('Hello world')
		})

		it('emits to streamer subscribers', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const tokens: string[] = []

			handle.onToken((token) => tokens.push(token))
			handle.emitToken('Hello')
			handle.emitToken(' world')

			expect(tokens).toEqual(['Hello', ' world'])
		})
	})

	describe('appendText', () => {
		it('appends without emitting', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const tokens: string[] = []

			handle.onToken((token) => tokens.push(token))
			handle.appendText('Silent text')

			expect(handle.getText()).toBe('Silent text')
			expect(tokens).toEqual([])
		})
	})

	describe('tool calls', () => {
		it('starts and accumulates tool call', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.startToolCall(0, 'call-1', 'myFunction')
			handle.appendToolCallArguments(0, '{"key"')
			handle.appendToolCallArguments(0, ':"value"}')
			handle.complete()

			const result = await handle.result()
			expect(result.toolCalls).toEqual([
				{ id: 'call-1', name: 'myFunction', arguments: { key: 'value' } },
			])
		})

		it('updates tool call incrementally', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.updateToolCall(0, { id: 'call-1', name: 'func' })
			handle.updateToolCall(0, { arguments: '{"a":' })
			handle.updateToolCall(0, { arguments: '1}' })
			handle.complete()

			const result = await handle.result()
			expect(result.toolCalls).toEqual([
				{ id: 'call-1', name: 'func', arguments: { a: 1 } },
			])
		})

		it('handles multiple tool calls', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.startToolCall(0, 'call-1', 'func1')
			handle.appendToolCallArguments(0, '{}')
			handle.startToolCall(1, 'call-2', 'func2')
			handle.appendToolCallArguments(1, '{}')
			handle.complete()

			const result = await handle.result()
			expect(result.toolCalls).toEqual([
				{ id: 'call-1', name: 'func1', arguments: {} },
				{ id: 'call-2', name: 'func2', arguments: {} },
			])
		})

		it('skips malformed tool call JSON', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.startToolCall(0, 'call-1', 'func')
			handle.appendToolCallArguments(0, 'invalid json')
			handle.complete()

			const result = await handle.result()
			expect(result.toolCalls).toEqual([])
		})
	})

	describe('finish reason and usage', () => {
		it('sets finish reason', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.setFinishReason('length')
			handle.complete()

			const result = await handle.result()
			expect(result.finishReason).toBe('length')
		})

		it('sets usage stats', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.setUsage({
				promptTokens: 10,
				completionTokens: 20,
				totalTokens: 30,
			})
			handle.complete()

			const result = await handle.result()
			expect(result.usage).toEqual({
				promptTokens: 10,
				completionTokens: 20,
				totalTokens: 30,
			})
		})
	})

	describe('completion', () => {
		it('calls onComplete callbacks', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const callback = vi.fn()

			handle.onComplete(callback)
			handle.emitToken('test')
			handle.complete()

			await handle.result()
			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(expect.objectContaining({ text: 'test' }))
		})

		it('resolves result promise', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.emitToken('Hello')
			handle.complete()

			const result = await handle.result()
			expect(result.text).toBe('Hello')
			expect(result.aborted).toBe(false)
		})

		it('completes only once', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const callback = vi.fn()

			handle.onComplete(callback)
			handle.complete()
			handle.complete()

			expect(callback).toHaveBeenCalledTimes(1)
		})

		it('sets completed flag', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.complete()

			expect(handle.isCompleted()).toBe(true)
		})
	})

	describe('error handling', () => {
		it('calls onError callbacks', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const callback = vi.fn()

			handle.onError(callback)
			handle.setError(new Error('Test error'))

			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(expect.any(Error))

			// Catch the rejected promise to prevent unhandled rejection
			await expect(handle.result()).rejects.toThrow()
		})

		it('rejects result promise', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.setError(new Error('Test error'))

			await expect(handle.result()).rejects.toThrow('Test error')
		})

		it('sets completed flag', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.setError(new Error('Test error'))

			expect(handle.isCompleted()).toBe(true)

			// Catch the rejected promise
			await expect(handle.result()).rejects.toThrow()
		})
	})

	describe('abort', () => {
		it('aborts the abort controller', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.abort()

			expect(abortController.signal.aborted).toBe(true)
		})

		it('sets aborted flag', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.abort()

			expect(handle.isAborted()).toBe(true)
			expect(handle.isCompleted()).toBe(true)
		})

		it('resolves result with aborted flag', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)

			handle.emitToken('Partial')
			handle.abort()

			const result = await handle.result()
			expect(result.aborted).toBe(true)
			expect(result.text).toBe('Partial')
		})
	})

	describe('async iterator', () => {
		it('iterates over emitted tokens', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const tokens: string[] = []

			// Start collecting tokens asynchronously
			const collectPromise = (async() => {
				for await (const token of handle) {
					tokens.push(token)
				}
			})()

			// Emit tokens
			handle.emitToken('Hello')
			handle.emitToken(' ')
			handle.emitToken('world')
			handle.complete()

			await collectPromise
			expect(tokens).toEqual(['Hello', ' ', 'world'])
		})

		it('stops on error', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const tokens: string[] = []

			const collectPromise = (async() => {
				for await (const token of handle) {
					tokens.push(token)
				}
			})()

			handle.emitToken('Hello')
			handle.setError(new Error('Stop'))

			await collectPromise
			expect(tokens).toEqual(['Hello'])

			// Catch the rejected promise
			await expect(handle.result()).rejects.toThrow()
		})
	})

	describe('subscription cleanup', () => {
		it('unsubscribes from onToken', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const tokens: string[] = []

			const unsub = handle.onToken((token) => tokens.push(token))
			handle.emitToken('A')
			unsub()
			handle.emitToken('B')

			expect(tokens).toEqual(['A'])
		})

		it('unsubscribes from onComplete', () => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const callback = vi.fn()

			const unsub = handle.onComplete(callback)
			unsub()
			handle.complete()

			expect(callback).not.toHaveBeenCalled()
		})

		it('unsubscribes from onError', async() => {
			const streamer = createStreamerAdapter()
			const abortController = new AbortController()
			const handle = createProviderStreamHandle('test-id', abortController, streamer)
			const callback = vi.fn()

			const unsub = handle.onError(callback)
			unsub()
			handle.setError(new Error('Test'))

			expect(callback).not.toHaveBeenCalled()

			// Catch the rejected promise
			await expect(handle.result()).rejects.toThrow()
		})
	})
})
