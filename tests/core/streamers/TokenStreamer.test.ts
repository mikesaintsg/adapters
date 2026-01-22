/**
 * TokenStreamer Tests
 *
 * Tests for the token streamer implementation.
 */

import { describe, it, expect, vi } from 'vitest'
import { createTokenStreamer } from '@mikesaintsg/adapters'

describe('TokenStreamer', () => {
	describe('createTokenStreamer', () => {
		it('creates with requestId', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			expect(streamer.requestId).toBe('test-id')
		})

		it('starts not completed', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			expect(streamer.isCompleted()).toBe(false)
			expect(streamer.isAborted()).toBe(false)
		})
	})

	describe('emit', () => {
		it('accumulates text', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.emit('Hello')
			streamer.emit(' world')

			expect(streamer.getText()).toBe('Hello world')
		})

		it('emits to token subscribers', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const tokens: string[] = []

			streamer.onToken((token: string) => tokens.push(token))
			streamer.emit('Hello')
			streamer.emit(' world')

			expect(tokens).toEqual(['Hello', ' world'])
		})

		it('supports multiple subscribers', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const tokens1: string[] = []
			const tokens2: string[] = []

			streamer.onToken((token: string) => tokens1.push(token))
			streamer.onToken((token: string) => tokens2.push(token))
			streamer.emit('test')

			expect(tokens1).toEqual(['test'])
			expect(tokens2).toEqual(['test'])
		})

		it('returns unsubscribe function', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const tokens: string[] = []

			const unsub = streamer.onToken((token: string) => tokens.push(token))
			streamer.emit('Hello')
			unsub()
			streamer.emit(' world')

			expect(tokens).toEqual(['Hello'])
		})
	})

	describe('appendText', () => {
		it('appends without emitting', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const tokens: string[] = []

			streamer.onToken((token: string) => tokens.push(token))
			streamer.appendText('Silent text')

			expect(streamer.getText()).toBe('Silent text')
			expect(tokens).toEqual([])
		})
	})

	describe('tool calls', () => {
		it('starts and accumulates tool call', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.startToolCall(0, 'call-1', 'myFunction')
			streamer.appendToolCallArguments(0, '{"key"')
			streamer.appendToolCallArguments(0, ':"value"}')
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls).toEqual([
				{ id: 'call-1', name: 'myFunction', arguments: { key: 'value' } },
			])
		})

		it('updates tool call incrementally', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.updateToolCall(0, { id: 'call-1', name: 'func' })
			streamer.updateToolCall(0, { arguments: '{"a":' })
			streamer.updateToolCall(0, { arguments: '1}' })
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls).toEqual([
				{ id: 'call-1', name: 'func', arguments: { a: 1 } },
			])
		})

		it('handles multiple tool calls', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.startToolCall(0, 'call-1', 'func1')
			streamer.appendToolCallArguments(0, '{}')
			streamer.startToolCall(1, 'call-2', 'func2')
			streamer.appendToolCallArguments(1, '{}')
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls).toEqual([
				{ id: 'call-1', name: 'func1', arguments: {} },
				{ id: 'call-2', name: 'func2', arguments: {} },
			])
		})

		it('skips malformed tool call JSON', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.startToolCall(0, 'call-1', 'func')
			streamer.appendToolCallArguments(0, 'invalid json')
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls).toEqual([])
		})
	})

	describe('finish reason and usage', () => {
		it('sets finish reason', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.setFinishReason('length')
			streamer.complete()

			const result = await streamer.result()
			expect(result.finishReason).toBe('length')
		})

		it('sets usage stats', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.setUsage({
				promptTokens: 10,
				completionTokens: 20,
				totalTokens: 30,
			})
			streamer.complete()

			const result = await streamer.result()
			expect(result.usage).toEqual({
				promptTokens: 10,
				completionTokens: 20,
				totalTokens: 30,
			})
		})
	})

	describe('completion', () => {
		it('calls onComplete callbacks', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const callback = vi.fn()

			streamer.onComplete(callback)
			streamer.emit('test')
			streamer.complete()

			await streamer.result()
			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(expect.objectContaining({ text: 'test' }))
		})

		it('resolves result promise', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.emit('Hello')
			streamer.complete()

			const result = await streamer.result()
			expect(result.text).toBe('Hello')
			expect(result.aborted).toBe(false)
		})

		it('completes only once', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const callback = vi.fn()

			streamer.onComplete(callback)
			streamer.complete()
			streamer.complete()

			expect(callback).toHaveBeenCalledTimes(1)
		})

		it('sets completed flag', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.complete()

			expect(streamer.isCompleted()).toBe(true)
		})
	})

	describe('error handling', () => {
		it('calls onError callbacks', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const callback = vi.fn()

			streamer.onError(callback)
			streamer.setError(new Error('Test error'))

			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(expect.any(Error))

			await expect(streamer.result()).rejects.toThrow()
		})

		it('rejects result promise', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.setError(new Error('Test error'))

			await expect(streamer.result()).rejects.toThrow('Test error')
		})

		it('sets completed flag', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.setError(new Error('Test error'))

			expect(streamer.isCompleted()).toBe(true)

			await expect(streamer.result()).rejects.toThrow()
		})
	})

	describe('abort', () => {
		it('aborts the abort controller', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.abort()

			expect(abortController.signal.aborted).toBe(true)
		})

		it('sets aborted flag', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.abort()

			expect(streamer.isAborted()).toBe(true)
			expect(streamer.isCompleted()).toBe(true)
		})

		it('resolves result with aborted flag', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)

			streamer.emit('Partial')
			streamer.abort()

			const result = await streamer.result()
			expect(result.aborted).toBe(true)
			expect(result.text).toBe('Partial')
		})
	})

	describe('async iterator', () => {
		it('iterates over emitted tokens', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const tokens: string[] = []

			const collectPromise = (async() => {
				for await (const token of streamer) {
					tokens.push(token)
				}
			})()

			streamer.emit('Hello')
			streamer.emit(' ')
			streamer.emit('world')
			streamer.complete()

			await collectPromise
			expect(tokens).toEqual(['Hello', ' ', 'world'])
		})

		it('stops on error', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const tokens: string[] = []

			const collectPromise = (async() => {
				for await (const token of streamer) {
					tokens.push(token)
				}
			})()

			streamer.emit('Hello')
			streamer.setError(new Error('Stop'))

			await collectPromise
			expect(tokens).toEqual(['Hello'])

			await expect(streamer.result()).rejects.toThrow()
		})
	})

	describe('subscription cleanup', () => {
		it('unsubscribes from onToken', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const tokens: string[] = []

			const unsub = streamer.onToken((token: string) => tokens.push(token))
			streamer.emit('A')
			unsub()
			streamer.emit('B')

			expect(tokens).toEqual(['A'])
		})

		it('unsubscribes from onComplete', () => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const callback = vi.fn()

			const unsub = streamer.onComplete(callback)
			unsub()
			streamer.complete()

			expect(callback).not.toHaveBeenCalled()
		})

		it('unsubscribes from onError', async() => {
			const abortController = new AbortController()
			const streamer = createTokenStreamer('test-id', abortController)
			const callback = vi.fn()

			const unsub = streamer.onError(callback)
			unsub()
			streamer.setError(new Error('Test'))

			expect(callback).not.toHaveBeenCalled()

			await expect(streamer.result()).rejects.toThrow()
		})
	})
})
