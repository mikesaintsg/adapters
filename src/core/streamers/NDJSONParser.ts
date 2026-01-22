/**
 * NDJSON Parser
 *
 * Implementation for parsing Newline-Delimited JSON streams.
 * Used by providers like Ollama that stream responses as NDJSON.
 */

import type { NDJSONParserAdapterInterface, NDJSONParserOptions } from '../../types.js'

/**
 * NDJSON parser adapter implementation.
 *
 * Handles stateful parsing of chunked NDJSON data.
 */
export class NDJSONParser implements NDJSONParserAdapterInterface {
	#buffer = ''
	readonly #onObject: (obj: unknown) => void
	readonly #onError: ((error: Error) => void) | undefined
	readonly #onEnd: (() => void) | undefined

	constructor(options?: NDJSONParserOptions) {
		this.#onObject = options?.onObject ?? (() => { /* empty */ })
		this.#onError = options?.onError
		this.#onEnd = options?.onEnd
	}

	create(options: NDJSONParserOptions): NDJSONParserAdapterInterface {
		return new NDJSONParser(options)
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
			this.#parseLine(this.#buffer.trim())
			this.#buffer = ''
		}

		this.#onEnd?.()
	}

	reset(): void {
		this.#buffer = ''
	}

	#processBuffer(): void {
		const lines = this.#buffer.split('\n')

		for (let i = 0; i < lines.length - 1; i++) {
			const line = lines[i]?.trim()
			if (line !== undefined && line.length > 0) {
				this.#parseLine(line)
			}
		}

		this.#buffer = lines[lines.length - 1] ?? ''
	}

	#parseLine(line: string): void {
		try {
			const obj = JSON.parse(line) as unknown
			this.#onObject(obj)
		} catch (error) {
			if (this.#onError !== undefined && error instanceof Error) {
				this.#onError(new Error(`Failed to parse NDJSON line: ${error.message}`))
			}
		}
	}
}
