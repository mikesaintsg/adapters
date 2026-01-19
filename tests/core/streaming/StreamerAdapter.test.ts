import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
	createStreamerAdapter,
	StreamerAdapter,
} from '@mikesaintsg/adapters'
import type { StreamerEmitterInterface } from '@mikesaintsg/adapters'

describe('StreamerAdapter', () => {
	let adapter: StreamerEmitterInterface

	beforeEach(() => {
		adapter = createStreamerAdapter()
	})

	describe('createStreamerAdapter', () => {
		it('returns a StreamerAdapter instance', () => {
			expect(adapter).toBeInstanceOf(StreamerAdapter)
		})

		it('supports streaming by default', () => {
			expect(adapter.supportsStreaming()).toBe(true)
		})
	})

	describe('onToken', () => {
		it('receives emitted tokens', () => {
			const tokens: string[] = []
			adapter.onToken((token) => tokens.push(token))

			adapter.emit('Hello')
			adapter.emit(' ')
			adapter.emit('world!')

			expect(tokens).toEqual(['Hello', ' ', 'world!'])
		})

		it('supports multiple listeners', () => {
			const listener1 = vi.fn()
			const listener2 = vi.fn()

			adapter.onToken(listener1)
			adapter.onToken(listener2)

			adapter.emit('test')

			expect(listener1).toHaveBeenCalledWith('test')
			expect(listener2).toHaveBeenCalledWith('test')
		})

		it('returns unsubscribe function', () => {
			const listener = vi.fn()
			const unsubscribe = adapter.onToken(listener)

			adapter.emit('first')
			unsubscribe()
			adapter.emit('second')

			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith('first')
		})

		it('removes only the unsubscribed listener', () => {
			const listener1 = vi.fn()
			const listener2 = vi.fn()

			const unsubscribe1 = adapter.onToken(listener1)
			adapter.onToken(listener2)

			adapter.emit('first')
			unsubscribe1()
			adapter.emit('second')

			expect(listener1).toHaveBeenCalledTimes(1)
			expect(listener2).toHaveBeenCalledTimes(2)
		})
	})

	describe('emit', () => {
		it('emits tokens to all listeners', () => {
			const results: string[] = []
			adapter.onToken((token) => results.push(`A:${token}`))
			adapter.onToken((token) => results.push(`B:${token}`))

			adapter.emit('test')

			expect(results).toContain('A:test')
			expect(results).toContain('B:test')
		})

		it('does not emit after end() is called', () => {
			const listener = vi.fn()
			adapter.onToken(listener)

			adapter.emit('before')
			adapter.end()
			adapter.emit('after')

			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith('before')
		})
	})

	describe('end', () => {
		it('prevents further emissions', () => {
			const listener = vi.fn()
			adapter.onToken(listener)

			adapter.end()
			adapter.emit('test')

			expect(listener).not.toHaveBeenCalled()
		})

		it('clears all listeners', () => {
			const listener = vi.fn()
			adapter.onToken(listener)
			adapter.end()

			// Re-add listener after end
			const newListener = vi.fn()
			adapter.onToken(newListener)

			// Emit should not work since adapter is ended
			adapter.emit('test')

			expect(listener).not.toHaveBeenCalled()
			expect(newListener).not.toHaveBeenCalled()
		})
	})

	describe('supportsStreaming', () => {
		it('returns true', () => {
			expect(adapter.supportsStreaming()).toBe(true)
		})
	})
})
