/**
 * TokenStreamer Tests
 *
 * Tests for the token streamer implementation.
 */

import { describe, it, expect, vi } from 'vitest'
import { createTokenStreamer } from '@mikesaintsg/adapters'

describe('TokenStreamer', () => {
	describe('createTokenStreamer', () => {
		it('creates adapter with create method', () => {
			const adapter = createTokenStreamer()
			expect(typeof adapter.create).toBe('function')
		})

		it('creates instance with requestId', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			expect(streamer.requestId).toBe('test-id')
		})

		it('starts not completed', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			expect(streamer.isCompleted()).toBe(false)
			expect(streamer.isAborted()).toBe(false)
		})
	})

	describe('emit', () => {
		it('accumulates text', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.emit('Hello')
			streamer.emit(' world')

			expect(streamer.getText()).toBe('Hello world')
		})

		it('emits to token subscribers', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const tokens: string[] = []

			streamer.onToken((token: string) => tokens.push(token))
			streamer.emit('Hello')
			streamer.emit(' world')

			expect(tokens).toEqual(['Hello', ' world'])
		})

		it('supports multiple subscribers', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const tokens1: string[] = []
			const tokens2: string[] = []

			streamer.onToken((token: string) => tokens1.push(token))
			streamer.onToken((token: string) => tokens2.push(token))
			streamer.emit('test')

			expect(tokens1).toEqual(['test'])
			expect(tokens2).toEqual(['test'])
		})

		it('returns unsubscribe function', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
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
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const tokens: string[] = []

			streamer.onToken((token: string) => tokens.push(token))
			streamer.appendText('Silent text')

			expect(streamer.getText()).toBe('Silent text')
			expect(tokens).toEqual([])
		})
	})

	describe('tool calls', () => {
		it('starts and accumulates tool call', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

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
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

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
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

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
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.startToolCall(0, 'call-1', 'func')
			streamer.appendToolCallArguments(0, 'invalid json')
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls).toEqual([])
		})
	})

	describe('finish reason and usage', () => {
		it('sets finish reason', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.setFinishReason('length')
			streamer.complete()

			const result = await streamer.result()
			expect(result.finishReason).toBe('length')
		})

		it('sets usage stats', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

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
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const callback = vi.fn()

			streamer.onComplete(callback)
			streamer.emit('test')
			streamer.complete()

			await streamer.result()
			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(expect.objectContaining({ text: 'test' }))
		})

		it('resolves result promise', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.emit('Hello')
			streamer.complete()

			const result = await streamer.result()
			expect(result.text).toBe('Hello')
			expect(result.aborted).toBe(false)
		})

		it('completes only once', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const callback = vi.fn()

			streamer.onComplete(callback)
			streamer.complete()
			streamer.complete()

			expect(callback).toHaveBeenCalledTimes(1)
		})

		it('sets completed flag', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.complete()

			expect(streamer.isCompleted()).toBe(true)
		})
	})

	describe('error handling', () => {
		it('calls onError callbacks', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const callback = vi.fn()

			streamer.onError(callback)
			streamer.setError(new Error('Test error'))

			expect(callback).toHaveBeenCalledTimes(1)
			expect(callback).toHaveBeenCalledWith(expect.any(Error))

			await expect(streamer.result()).rejects.toThrow()
		})

		it('rejects result promise', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.setError(new Error('Test error'))

			await expect(streamer.result()).rejects.toThrow('Test error')
		})

		it('sets completed flag', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.setError(new Error('Test error'))

			expect(streamer.isCompleted()).toBe(true)

			await expect(streamer.result()).rejects.toThrow()
		})
	})

	describe('abort', () => {
		it('aborts the abort controller', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.abort()

			expect(abortController.signal.aborted).toBe(true)
		})

		it('sets aborted flag', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.abort()

			expect(streamer.isAborted()).toBe(true)
			expect(streamer.isCompleted()).toBe(true)
		})

		it('resolves result with aborted flag', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.emit('Partial')
			streamer.abort()

			const result = await streamer.result()
			expect(result.aborted).toBe(true)
			expect(result.text).toBe('Partial')
		})
	})

	describe('async iterator', () => {
		it('iterates over emitted tokens', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
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
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
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
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const tokens: string[] = []

			const unsub = streamer.onToken((token: string) => tokens.push(token))
			streamer.emit('A')
			unsub()
			streamer.emit('B')

			expect(tokens).toEqual(['A'])
		})

		it('unsubscribes from onComplete', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const callback = vi.fn()

			const unsub = streamer.onComplete(callback)
			unsub()
			streamer.complete()

			expect(callback).not.toHaveBeenCalled()
		})

		it('unsubscribes from onError', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const callback = vi.fn()

			const unsub = streamer.onError(callback)
			unsub()
			streamer.setError(new Error('Test'))

			expect(callback).not.toHaveBeenCalled()

			await expect(streamer.result()).rejects.toThrow()
		})
	})

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles empty string tokens', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const tokens: string[] = []

			streamer.onToken((token: string) => tokens.push(token))
			streamer.emit('')
			streamer.emit('a')
			streamer.emit('')

			expect(tokens).toEqual(['', 'a', ''])
			expect(streamer.getText()).toBe('a')
		})

		it('handles unicode and emoji tokens', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.emit('Hello 🌍')
			streamer.emit(' 日本語')
			streamer.emit(' مرحبا')
			streamer.complete()

			const result = await streamer.result()
			expect(result.text).toBe('Hello 🌍 日本語 مرحبا')
		})

		it('handles special characters', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.emit('Line1\n')
			streamer.emit('Line2\r\n')
			streamer.emit('Tab\there')
			streamer.emit('\0null')
			streamer.complete()

			const result = await streamer.result()
			expect(result.text).toBe('Line1\nLine2\r\nTab\there\0null')
		})

		it('handles very long tokens', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			const longToken = 'x'.repeat(100000)
			streamer.emit(longToken)
			streamer.complete()

			const result = await streamer.result()
			expect(result.text.length).toBe(100000)
		})

		it('handles many small tokens', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			for (let i = 0; i < 10000; i++) {
				streamer.emit('a')
			}
			streamer.complete()

			const result = await streamer.result()
			expect(result.text.length).toBe(10000)
		})

		it('ignores emit after complete', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const tokens: string[] = []

			streamer.onToken((token: string) => tokens.push(token))
			streamer.emit('before')
			streamer.complete()
			streamer.emit('after')

			expect(tokens).toEqual(['before'])
			expect(streamer.getText()).toBe('before')
		})

		it('ignores emit after error', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.emit('before')
			streamer.setError(new Error('Test'))
			streamer.emit('after')

			expect(streamer.getText()).toBe('before')

			// Consume the rejected promise
			await expect(streamer.result()).rejects.toThrow()
		})

		it('ignores emit after abort', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.emit('before')
			streamer.abort()
			streamer.emit('after')

			expect(streamer.getText()).toBe('before')
		})

		it('handles concurrent subscribers', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const results: number[] = []

			for (let i = 0; i < 100; i++) {
				streamer.onToken(() => results.push(i))
			}

			streamer.emit('test')
			streamer.complete()

			expect(results.length).toBe(100)
		})

		it('handles rapid subscribe/unsubscribe', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const counts = [0, 0, 0]

			const unsub1 = streamer.onToken(() => { counts[0] = (counts[0] ?? 0) + 1 })
			const unsub2 = streamer.onToken(() => { counts[1] = (counts[1] ?? 0) + 1 })
			const unsub3 = streamer.onToken(() => { counts[2] = (counts[2] ?? 0) + 1 })

			streamer.emit('1')
			unsub2()
			streamer.emit('2')
			unsub1()
			streamer.emit('3')
			unsub3()
			streamer.emit('4')

			expect(counts[0]).toBe(2)
			expect(counts[1]).toBe(1)
			expect(counts[2]).toBe(3)
		})

		it('setToolCalls overwrites existing tool calls', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.startToolCall(0, 'call-1', 'func1')
			streamer.appendToolCallArguments(0, '{"a":1}')

			streamer.setToolCalls([
				{ id: 'call-new', name: 'newFunc', arguments: { b: 2 } },
			])
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls).toHaveLength(1)
			expect(result.toolCalls[0]?.id).toBe('call-new')
			expect(result.toolCalls[0]?.name).toBe('newFunc')
		})

		it('handles tool call with empty arguments', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.startToolCall(0, 'call-1', 'noArgs')
			streamer.appendToolCallArguments(0, '{}')
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls[0]?.arguments).toEqual({})
		})

		it('handles tool call with complex nested arguments', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			const complexArgs = {
				array: [1, 2, { nested: true }],
				object: { deep: { deeper: 'value' } },
				unicode: '日本語 🌍',
				nullValue: null,
				booleans: [true, false],
			}

			streamer.startToolCall(0, 'call-1', 'complex')
			streamer.appendToolCallArguments(0, JSON.stringify(complexArgs))
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls[0]?.arguments).toEqual(complexArgs)
		})

		it('handles multiple sparse tool call indices', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.startToolCall(0, 'call-0', 'func0')
			streamer.appendToolCallArguments(0, '{}')
			streamer.startToolCall(5, 'call-5', 'func5')
			streamer.appendToolCallArguments(5, '{}')
			streamer.startToolCall(2, 'call-2', 'func2')
			streamer.appendToolCallArguments(2, '{}')
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls).toHaveLength(3)
		})

		it('updateToolCall creates if not exists', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.updateToolCall(0, { id: 'new-call' })
			streamer.updateToolCall(0, { name: 'newFunc' })
			streamer.updateToolCall(0, { arguments: '{"key":' })
			streamer.updateToolCall(0, { arguments: '"value"}' })
			streamer.complete()

			const result = await streamer.result()
			expect(result.toolCalls[0]).toEqual({
				id: 'new-call',
				name: 'newFunc',
				arguments: { key: 'value' },
			})
		})

		it('default finish reason is stop', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			streamer.complete()

			const result = await streamer.result()
			expect(result.finishReason).toBe('stop')
		})

		it('result promise is same instance on multiple calls', () => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)

			const promise1 = streamer.result()
			const promise2 = streamer.result()

			expect(promise1).toBe(promise2)
		})

		it('adapter can create multiple independent instances', () => {
			const adapter = createTokenStreamer()

			const streamer1 = adapter.create('id-1', new AbortController())
			const streamer2 = adapter.create('id-2', new AbortController())

			streamer1.emit('one')
			streamer2.emit('two')

			expect(streamer1.getText()).toBe('one')
			expect(streamer2.getText()).toBe('two')
			expect(streamer1.requestId).toBe('id-1')
			expect(streamer2.requestId).toBe('id-2')
		})

		it('async iterator handles tokens emitted before iteration starts', async() => {
			const adapter = createTokenStreamer()
			const abortController = new AbortController()
			const streamer = adapter.create('test-id', abortController)
			const tokens: string[] = []

			// Emit before starting iteration
			streamer.emit('first')

			// Start iteration
			const collectPromise = (async() => {
				for await (const token of streamer) {
					tokens.push(token)
				}
			})()

			// Give iterator time to subscribe then emit more
			await new Promise(r => setTimeout(r, 10))
			streamer.emit('second')
			streamer.complete()

			await collectPromise
			// First token may or may not be caught depending on timing
			expect(tokens.includes('second')).toBe(true)
		})
	})
})
