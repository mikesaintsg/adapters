import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	createTextStreamerAdapter,
	TextStreamerAdapter,
} from '@mikesaintsg/adapters'
import type {
	HuggingFaceBaseStreamer,
	HuggingFaceTextStreamerClass,
	HuggingFaceTokenizer,
	TextStreamerAdapterInterface,
} from '@mikesaintsg/adapters'

// Mock tokenizer
function createMockTokenizer(): HuggingFaceTokenizer {
	const tokenizer = vi.fn((_text: string) => ({
		input_ids: {
			data: new Float32Array([1, 2, 3]),
			dims: [1, 3],
			type: 'float32',
			size: 3,
			tolist: () => [[1, 2, 3]],
		},
	})) as unknown as HuggingFaceTokenizer

	tokenizer.decode = vi.fn((_tokens) => 'decoded text')
	return tokenizer
}

// Mock TextStreamer class
function createMockTextStreamerClass(): HuggingFaceTextStreamerClass {
	return class MockTextStreamer implements HuggingFaceBaseStreamer {
		#callbackFn: ((text: string) => void) | undefined

		constructor(
			tokenizer: HuggingFaceTokenizer,
			options?: { skip_prompt?: boolean; callback_function?: (text: string) => void },
		) {
			this.#callbackFn = options?.callback_function
		}

		put(_value: readonly (readonly bigint[])[]): void {
			// Simulate decoding tokens
			if (this.#callbackFn) {
				this.#callbackFn('token')
			}
		}

		end(): void {
			// No-op for mock
		}

		// Helper for testing - simulates callback
		simulateToken(token: string): void {
			if (this.#callbackFn) {
				this.#callbackFn(token)
			}
		}
	} as unknown as HuggingFaceTextStreamerClass
}

describe('TextStreamerAdapter', () => {
	describe('createTextStreamerAdapter', () => {
		it('returns a TextStreamerAdapter instance', () => {
			const adapter = createTextStreamerAdapter({
				streamerClass: createMockTextStreamerClass(),
				tokenizer: createMockTokenizer(),
			})

			expect(adapter).toBeInstanceOf(TextStreamerAdapter)
		})

		it('supports streaming by default', () => {
			const adapter = createTextStreamerAdapter({
				streamerClass: createMockTextStreamerClass(),
				tokenizer: createMockTokenizer(),
			})

			expect(adapter.supportsStreaming()).toBe(true)
		})
	})

	describe('getStreamer', () => {
		it('returns the underlying HuggingFace streamer', () => {
			const adapter = createTextStreamerAdapter({
				streamerClass: createMockTextStreamerClass(),
				tokenizer: createMockTokenizer(),
			})

			const streamer = adapter.getStreamer()
			expect(streamer).toBeDefined()
		})

		it('returns a streamer with put and end methods', () => {
			const adapter = createTextStreamerAdapter({
				streamerClass: createMockTextStreamerClass(),
				tokenizer: createMockTokenizer(),
			})

			const streamer = adapter.getStreamer()
			expect(streamer).toBeDefined()
			expect(typeof streamer?.put).toBe('function')
			expect(typeof streamer?.end).toBe('function')
		})
	})

	describe('onToken integration with HuggingFace streamer', () => {
		it('receives tokens when streamer callback is triggered', () => {
			// Create a streamer class that exposes the callback
			let capturedCallback: ((text: string) => void) | undefined

			const MockStreamerClass = class implements HuggingFaceBaseStreamer {
				constructor(
					_tokenizer: HuggingFaceTokenizer,
					options?: { callback_function?: (text: string) => void },
				) {
					capturedCallback = options?.callback_function
				}
				put(): void {}
				end(): void {}
			} as unknown as HuggingFaceTextStreamerClass

			const adapter = createTextStreamerAdapter({
				streamerClass: MockStreamerClass,
				tokenizer: createMockTokenizer(),
			})

			const tokens: string[] = []
			adapter.onToken((token) => tokens.push(token))

			// Simulate what HuggingFace TextStreamer would do
			capturedCallback?.('Hello')
			capturedCallback?.(' ')
			capturedCallback?.('world')

			expect(tokens).toEqual(['Hello', ' ', 'world'])
		})
	})

	describe('inherited StreamerAdapter behavior', () => {
		let adapter: TextStreamerAdapterInterface

		beforeEach(() => {
			adapter = createTextStreamerAdapter({
				streamerClass: createMockTextStreamerClass(),
				tokenizer: createMockTokenizer(),
			})
		})

		it('emits tokens to listeners', () => {
			const listener = vi.fn()
			adapter.onToken(listener)
			adapter.emit('test')
			expect(listener).toHaveBeenCalledWith('test')
		})

		it('stops emitting after end()', () => {
			const listener = vi.fn()
			adapter.onToken(listener)
			adapter.end()
			adapter.emit('test')
			expect(listener).not.toHaveBeenCalled()
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

		it('returns unsubscribe function from onToken', () => {
			const listener = vi.fn()
			const unsubscribe = adapter.onToken(listener)
			adapter.emit('first')
			unsubscribe()
			adapter.emit('second')
			expect(listener).toHaveBeenCalledTimes(1)
		})
	})
})
