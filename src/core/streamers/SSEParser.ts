/**
 * SSE Parser
 *
 * Implementation for parsing Server-Sent Events.
 * Used by server-side providers (OpenAI, Anthropic) for streaming responses.
 */

import type { SSEEvent } from '@mikesaintsg/core'
import type { SSEParserAdapterInterface, SSEParserOptions, MutableSSEEvent } from '../../types.js'
import {
	DEFAULT_SSE_LINE_DELIMITER,
	DEFAULT_SSE_EVENT_DELIMITER,
} from '../../constants.js'

/**
 * SSE parser adapter implementation.
 *
 * Handles stateful parsing of chunked SSE data.
 */
export class SSEParser implements SSEParserAdapterInterface {
	#buffer = ''
	#currentEvent: MutableSSEEvent = {}
	readonly #onEvent: (event: SSEEvent) => void
	readonly #onError: ((error: Error) => void) | undefined
	readonly #onEnd: (() => void) | undefined
	readonly #lineDelimiter: string
	readonly #eventDelimiter: string

	constructor(options?: SSEParserOptions) {
		this.#onEvent = options?.onEvent ?? (() => { /* empty */ })
		this.#onError = options?.onError
		this.#onEnd = options?.onEnd
		this.#lineDelimiter = options?.lineDelimiter ?? DEFAULT_SSE_LINE_DELIMITER
		this.#eventDelimiter = options?.eventDelimiter ?? DEFAULT_SSE_EVENT_DELIMITER
	}

	create(options: SSEParserOptions): SSEParserAdapterInterface {
		return new SSEParser(options)
	}

	feed(chunk: string): void {
		this.#buffer += chunk
		this.#processBuffer()
	}

	end(): void {
		if (this.#buffer.length > 0) {
			this.#processBuffer()
		}

		if (this.#buffer.trim().length > 0) {
			this.#parseEventBlock(this.#buffer)
			if (this.#hasEventData()) {
				this.#emitEvent()
			}
			this.#buffer = ''
		}

		this.#onEnd?.()
	}

	reset(): void {
		this.#buffer = ''
		this.#currentEvent = {}
	}

	#processBuffer(): void {
		const parts = this.#buffer.split(this.#eventDelimiter)

		for (let i = 0; i < parts.length - 1; i++) {
			const eventBlock = parts[i]
			if (eventBlock !== undefined) {
				this.#parseEventBlock(eventBlock)
				if (this.#hasEventData()) {
					this.#emitEvent()
				}
			}
		}

		this.#buffer = parts[parts.length - 1] ?? ''
	}

	#parseEventBlock(block: string): void {
		const lines = block.split(this.#lineDelimiter)
		const dataLines: string[] = []

		for (const line of lines) {
			if (line.startsWith('data:')) {
				const value = line.slice(5).trimStart()
				dataLines.push(value)
			} else if (line.startsWith('event:')) {
				this.#currentEvent.event = line.slice(6).trimStart()
			} else if (line.startsWith('id:')) {
				this.#currentEvent.id = line.slice(3).trimStart()
			} else if (line.startsWith('retry:')) {
				const retryValue = line.slice(6).trimStart()
				const parsed = parseInt(retryValue, 10)
				if (!Number.isNaN(parsed)) {
					this.#currentEvent.retry = parsed
				}
			}
		}

		if (dataLines.length > 0) {
			this.#currentEvent.data = dataLines.join('\n')
		}
	}

	#hasEventData(): boolean {
		return this.#currentEvent.data !== undefined
	}

	#emitEvent(): void {
		try {
			const event: SSEEvent = {
				data: this.#currentEvent.data ?? '',
				...(this.#currentEvent.event !== undefined && { event: this.#currentEvent.event }),
				...(this.#currentEvent.id !== undefined && { id: this.#currentEvent.id }),
				...(this.#currentEvent.retry !== undefined && { retry: this.#currentEvent.retry }),
			}
			this.#onEvent(event)
		} catch (error) {
			if (this.#onError !== undefined && error instanceof Error) {
				this.#onError(error)
			}
		} finally {
			this.#currentEvent = {}
		}
	}
}
