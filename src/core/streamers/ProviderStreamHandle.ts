/**
 * Provider Stream Handle
 *
 * A reusable stream handle implementation for provider adapters.
 * Handles token streaming, result collection, and subscription management.
 */

import type {
	StreamHandleInterface,
	StreamerAdapterInterface,
	GenerationResult,
	ToolCall,
	FinishReason,
	UsageStats,
	Unsubscribe,
} from '@mikesaintsg/core'
import type { ToolCallAccumulator } from '../../types.js'

/**
 * Provider stream handle implementation.
 *
 * This class provides a reusable stream handle that can be used by any
 * provider adapter. It handles:
 * - Token accumulation and emission via streamer
 * - Tool call accumulation (for providers that support tool calling)
 * - Finish reason and usage stats tracking
 * - Subscription management for onToken, onComplete, onError
 * - AsyncIterator implementation for for-await-of loops
 * - Result promise for await handle.result()
 */
export class ProviderStreamHandle implements StreamHandleInterface {
	readonly requestId: string
	readonly #abortController: AbortController
	readonly #streamer: StreamerAdapterInterface

	#text = ''
	#toolCalls = new Map<number, ToolCallAccumulator>()
	#finishReason: FinishReason = 'stop'
	#usage: UsageStats | undefined
	#aborted = false
	#completed = false

	#resultResolve: ((result: GenerationResult) => void) | undefined
	#resultReject: ((error: Error) => void) | undefined
	#resultPromise: Promise<GenerationResult>

	#completeCallbacks = new Set<(result: GenerationResult) => void>()
	#errorCallbacks = new Set<(error: Error) => void>()

	constructor(
		requestId: string,
		abortController: AbortController,
		streamer: StreamerAdapterInterface,
	) {
		this.requestId = requestId
		this.#abortController = abortController
		this.#streamer = streamer

		this.#resultPromise = new Promise<GenerationResult>((resolve, reject) => {
			this.#resultResolve = resolve
			this.#resultReject = reject
		})
	}

	// ========================================================================
	// StreamHandleInterface Implementation
	// ========================================================================

	[Symbol.asyncIterator](): AsyncIterator<string> {
		const tokens: string[] = []
		let resolveNext: ((value: IteratorResult<string>) => void) | undefined
		let done = false

		this.#streamer.onToken((token: string) => {
			if (resolveNext !== undefined) {
				resolveNext({ value: token, done: false })
				resolveNext = undefined
			} else {
				tokens.push(token)
			}
		})

		this.onComplete(() => {
			done = true
			if (resolveNext !== undefined) {
				resolveNext({ value: undefined as unknown as string, done: true })
			}
		})

		this.onError(() => {
			done = true
			if (resolveNext !== undefined) {
				resolveNext({ value: undefined as unknown as string, done: true })
			}
		})

		return {
			next: (): Promise<IteratorResult<string>> => {
				const token = tokens.shift()
				if (typeof token === 'string') {
					return Promise.resolve({ value: token, done: false } as IteratorResult<string>)
				}
				if (done) {
					return Promise.resolve({ value: '', done: true } as IteratorResult<string>)
				}
				return new Promise((resolve) => {
					resolveNext = resolve
				})
			},
		}
	}

	result(): Promise<GenerationResult> {
		return this.#resultPromise
	}

	abort(): void {
		this.#abortController.abort()
		this.setAborted()
	}

	onToken(callback: (token: string) => void): Unsubscribe {
		return this.#streamer.onToken(callback)
	}

	onComplete(callback: (result: GenerationResult) => void): Unsubscribe {
		this.#completeCallbacks.add(callback)
		return () => { this.#completeCallbacks.delete(callback) }
	}

	onError(callback: (error: Error) => void): Unsubscribe {
		this.#errorCallbacks.add(callback)
		return () => { this.#errorCallbacks.delete(callback) }
	}

	// ========================================================================
	// Methods for Provider to Call
	// ========================================================================

	/**
	 * Emit a token to all subscribers and accumulate in result text.
	 */
	emitToken(token: string): void {
		this.#text += token
		this.#streamer.emit(token)
	}

	/**
	 * Append text without emitting (for non-streaming accumulation).
	 */
	appendText(text: string): void {
		this.#text += text
	}

	/**
	 * Get the accumulated text.
	 */
	getText(): string {
		return this.#text
	}

	/**
	 * Start a new tool call at the given index.
	 */
	startToolCall(index: number, id: string, name: string): void {
		this.#toolCalls.set(index, { id, name, arguments: '' })
	}

	/**
	 * Append arguments to a tool call at the given index.
	 */
	appendToolCallArguments(index: number, json: string): void {
		const existing = this.#toolCalls.get(index)
		if (existing !== undefined) {
			existing.arguments += json
		}
	}

	/**
	 * Update tool call with incremental delta (OpenAI-style).
	 */
	updateToolCall(index: number, delta: {
		readonly id?: string | undefined
		readonly name?: string | undefined
		readonly arguments?: string | undefined
	}): void {
		const existing = this.#toolCalls.get(index)
		if (existing === undefined) {
			this.#toolCalls.set(index, {
				id: delta.id ?? '',
				name: delta.name ?? '',
				arguments: delta.arguments ?? '',
			})
		} else {
			if (delta.id !== undefined) existing.id = delta.id
			if (delta.name !== undefined) existing.name = delta.name
			if (delta.arguments !== undefined) existing.arguments += delta.arguments
		}
	}

	/**
	 * Set the finish reason.
	 */
	setFinishReason(reason: FinishReason): void {
		this.#finishReason = reason
	}

	/**
	 * Set usage statistics.
	 */
	setUsage(usage: UsageStats): void {
		this.#usage = usage
	}

	/**
	 * Signal an error occurred.
	 */
	setError(error: Error): void {
		this.#completed = true
		this.#streamer.end()
		this.#resultReject?.(error)
		for (const callback of this.#errorCallbacks) {
			callback(error)
		}
	}

	/**
	 * Signal the request was aborted.
	 */
	setAborted(): void {
		this.#aborted = true
		this.#completed = true
		this.#streamer.end()
		const result = this.#buildResult()
		this.#resultResolve?.(result)
	}

	/**
	 * Signal generation is complete.
	 */
	complete(): void {
		if (this.#completed) return
		this.#completed = true
		this.#streamer.end()
		const result = this.#buildResult()
		this.#resultResolve?.(result)
		for (const callback of this.#completeCallbacks) {
			callback(result)
		}
	}

	/**
	 * Check if generation is completed.
	 */
	isCompleted(): boolean {
		return this.#completed
	}

	/**
	 * Check if generation was aborted.
	 */
	isAborted(): boolean {
		return this.#aborted
	}

	// ========================================================================
	// Private Methods
	// ========================================================================

	#buildResult(): GenerationResult {
		const toolCalls: ToolCall[] = []
		for (const [, tc] of this.#toolCalls) {
			try {
				toolCalls.push({
					id: tc.id,
					name: tc.name,
					arguments: JSON.parse(tc.arguments) as Record<string, unknown>,
				})
			} catch {
				// Skip malformed tool calls
			}
		}

		return {
			text: this.#text,
			toolCalls,
			finishReason: this.#finishReason,
			...(this.#usage !== undefined && { usage: this.#usage }),
			aborted: this.#aborted,
		}
	}
}
