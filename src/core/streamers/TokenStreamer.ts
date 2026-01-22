/**
 * Token Streamer
 *
 * Adapter for streaming generation with token emission and result collection.
 */

import type {
	GenerationResult,
	ToolCall,
	FinishReason,
	UsageStats,
	Unsubscribe,
} from '@mikesaintsg/core'
import type {
	TokenStreamerAdapterInterface,
	ToolCallAccumulator,
	ToolCallDelta,
} from '../../types.js'

/**
 * Token streamer adapter implementation.
 *
 * Manages token emission, result collection, and subscriptions.
 */
export class TokenStreamer implements TokenStreamerAdapterInterface {
	readonly requestId: string
	readonly #abortController: AbortController

	#text = ''
	#toolCalls = new Map<number, ToolCallAccumulator>()
	#finishReason: FinishReason = 'stop'
	#usage: UsageStats | undefined
	#aborted = false
	#completed = false
	#ended = false

	#tokenListeners = new Set<(token: string) => void>()
	#completeCallbacks = new Set<(result: GenerationResult) => void>()
	#errorCallbacks = new Set<(error: Error) => void>()

	#resultResolve: ((result: GenerationResult) => void) | undefined
	#resultReject: ((error: Error) => void) | undefined
	#resultPromise: Promise<GenerationResult>

	constructor(requestId?: string, abortController?: AbortController) {
		this.requestId = requestId ?? ''
		this.#abortController = abortController ?? new AbortController()

		this.#resultPromise = new Promise<GenerationResult>((resolve, reject) => {
			this.#resultResolve = resolve
			this.#resultReject = reject
		})
	}

	create(requestId: string, abortController: AbortController): TokenStreamerAdapterInterface {
		return new TokenStreamer(requestId, abortController)
	}

	// StreamHandleInterface
	[Symbol.asyncIterator](): AsyncIterator<string> {
		const tokens: string[] = []
		let resolveNext: ((value: IteratorResult<string>) => void) | undefined
		let done = false

		this.onToken((token: string) => {
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
		this.#tokenListeners.add(callback)
		return () => { this.#tokenListeners.delete(callback) }
	}

	onComplete(callback: (result: GenerationResult) => void): Unsubscribe {
		this.#completeCallbacks.add(callback)
		return () => { this.#completeCallbacks.delete(callback) }
	}

	onError(callback: (error: Error) => void): Unsubscribe {
		this.#errorCallbacks.add(callback)
		return () => { this.#errorCallbacks.delete(callback) }
	}

	// Producer methods
	emit(token: string): void {
		if (this.#ended) return
		this.#text += token
		for (const listener of this.#tokenListeners) {
			listener(token)
		}
	}

	appendText(text: string): void {
		this.#text += text
	}

	getText(): string {
		return this.#text
	}

	startToolCall(index: number, id: string, name: string): void {
		this.#toolCalls.set(index, { id, name, arguments: '' })
	}

	appendToolCallArguments(index: number, json: string): void {
		const existing = this.#toolCalls.get(index)
		if (existing !== undefined) {
			existing.arguments += json
		}
	}

	updateToolCall(index: number, delta: ToolCallDelta): void {
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

	setToolCalls(toolCalls: readonly ToolCall[]): void {
		this.#toolCalls.clear()
		for (let i = 0; i < toolCalls.length; i++) {
			const tc = toolCalls[i]
			if (tc !== undefined) {
				this.#toolCalls.set(i, {
					id: tc.id,
					name: tc.name,
					arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
				})
			}
		}
	}

	setFinishReason(reason: FinishReason): void {
		this.#finishReason = reason
	}

	setUsage(usage: UsageStats): void {
		this.#usage = usage
	}

	setError(error: Error): void {
		this.#completed = true
		this.#end()
		this.#resultReject?.(error)
		for (const callback of this.#errorCallbacks) {
			callback(error)
		}
	}

	setAborted(): void {
		this.#aborted = true
		this.#completed = true
		this.#end()
		const result = this.#buildResult()
		this.#resultResolve?.(result)
	}

	complete(): void {
		if (this.#completed) return
		this.#completed = true
		this.#end()
		const result = this.#buildResult()
		this.#resultResolve?.(result)
		for (const callback of this.#completeCallbacks) {
			callback(result)
		}
	}

	isCompleted(): boolean {
		return this.#completed
	}

	isAborted(): boolean {
		return this.#aborted
	}

	#end(): void {
		this.#ended = true
		this.#tokenListeners.clear()
	}

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
