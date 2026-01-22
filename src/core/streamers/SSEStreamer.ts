/**
 * SSE Streamer
 *
 * Implementation for parsing Server-Sent Events.
 * Used by server-side providers (OpenAI, Anthropic) for streaming responses.
 */

import type { SSEEvent } from '@mikesaintsg/core'
import type { SSEStreamerInterface, SSEStreamerOptions, MutableSSEEvent } from '../../types.js'
import {
	DEFAULT_SSE_LINE_DELIMITER,
	DEFAULT_SSE_EVENT_DELIMITER,
} from '../../constants.js'

/**
 * SSE Streamer implementation.
 *
 * Handles stateful parsing of chunked SSE data.
 * Providers use this internally to parse SSE streams from APIs.
 */
export class SSEStreamer implements SSEStreamerInterface {
	#buffer = ''
	#currentEvent: MutableSSEEvent = {}
	readonly #onEvent: (event: SSEEvent) => void
	readonly #onError: ((error: Error) => void) | undefined
	readonly #onEnd: (() => void) | undefined
	readonly #lineDelimiter: string
	readonly #eventDelimiter: string

	constructor(options: SSEStreamerOptions) {
		this.#onEvent = options.onEvent
		this.#onError = options.onError
		this.#onEnd = options.onEnd
		this.#lineDelimiter = options.lineDelimiter ?? DEFAULT_SSE_LINE_DELIMITER
		this.#eventDelimiter = options.eventDelimiter ?? DEFAULT_SSE_EVENT_DELIMITER
	}

	feed(chunk: string): void {
		this.#buffer += chunk
		this.#processBuffer()
	}

	end(): void {
		// Process any remaining buffer with event delimiters first
		if (this.#buffer.length > 0) {
			this.#processBuffer()
		}

		// Parse any remaining incomplete buffer as final event
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
		// Split by event delimiter (double newline)
		const parts = this.#buffer.split(this.#eventDelimiter)

		// Process all complete events (all but the last part)
		for (let i = 0; i < parts.length - 1; i++) {
			const eventBlock = parts[i]
			if (eventBlock !== undefined) {
				this.#parseEventBlock(eventBlock)
				if (this.#hasEventData()) {
					this.#emitEvent()
				}
			}
		}

		// Keep the last part as buffer (may be incomplete)
		this.#buffer = parts[parts.length - 1] ?? ''
	}

	#parseEventBlock(block: string): void {
		const lines = block.split(this.#lineDelimiter)
		const dataLines: string[] = []

		for (const line of lines) {
			if (line.startsWith('data:')) {
				// Handle data field - can have multiple lines
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
			// Ignore comments (lines starting with :) and unknown fields
		}

		// Join multi-line data with newlines
		if (dataLines.length > 0) {
			this.#currentEvent.data = dataLines.join('\n')
		}
	}

	#hasEventData(): boolean {
		return this.#currentEvent.data !== undefined
	}

	#emitEvent(): void {
		try {
			// Build the readonly SSEEvent from mutable internal state
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
			// Reset current event for next one
			this.#currentEvent = {}
		}
	}
}
