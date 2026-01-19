/**
 * SSE Parser Adapter
 *
 * Internal implementation for parsing Server-Sent Events.
 * NOT exported from index.ts - used internally by provider adapters.
 */

import type {
	SSEEvent,
	SSEParserOptions,
	SSEParserInterface,
	SSEParserAdapterInterface,
	SSEParserAdapterOptions,
} from '../../types.js'

/**
 * Mutable internal event type for building events
 */
interface MutableSSEEvent {
	event?: string
	data?: string
	id?: string
	retry?: number
}

/**
 * Create an SSE parser adapter.
 * Internal factory - not exported publicly.
 *
 * @param options - Optional parser configuration
 * @returns An SSE parser adapter instance
 */
export function createSSEParser(
	options?: SSEParserAdapterOptions,
): SSEParserAdapterInterface {
	const lineDelimiter = options?.lineDelimiter ?? '\n'
	const eventDelimiter = options?.eventDelimiter ?? '\n\n'

	return {
		createParser(parserOptions: SSEParserOptions): SSEParserInterface {
			return new SSEParser(parserOptions, lineDelimiter, eventDelimiter)
		},
	}
}

/**
 * Internal SSE parser implementation.
 * Handles stateful parsing of chunked SSE data.
 */
class SSEParser implements SSEParserInterface {
	#buffer = ''
	#currentEvent: MutableSSEEvent = {}
	readonly #onEvent: (event: SSEEvent) => void
	readonly #onError: ((error: Error) => void) | undefined
	readonly #onEnd: (() => void) | undefined
	readonly #lineDelimiter: string
	readonly #eventDelimiter: string

	constructor(
		options: SSEParserOptions,
		lineDelimiter: string,
		eventDelimiter: string,
	) {
		this.#onEvent = options.onEvent
		this.#onError = options.onError
		this.#onEnd = options.onEnd
		this.#lineDelimiter = lineDelimiter
		this.#eventDelimiter = eventDelimiter
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
