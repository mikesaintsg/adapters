/**
 * Ollama Provider Adapter
 *
 * Implements ProviderAdapterInterface for local Ollama models.
 * Uses NDJSON streamers (newline-delimited JSON) instead of SSE.
 */

import type {
	ProviderAdapterInterface,
	StreamHandleInterface,
	GenerationOptions,
	Message,
	ProviderCapabilities,
	FinishReason,
	StreamerAdapterInterface,
} from '@mikesaintsg/core'

import type {
	OllamaProviderAdapterOptions,
	OllamaChatStreamChunk,
} from '../../types.js'

import { createStreamerAdapter } from '../../factories.js'
import { createAdapterError, normalizeJsonSchemaTypes } from '../../helpers.js'
import {
	DEFAULT_OLLAMA_BASE_URL,
	DEFAULT_TIMEOUT_MS,
} from '../../constants.js'
import { ProviderStreamHandle } from '../streamers/ProviderStreamHandle.js'

/**
 * Ollama provider implementation.
 * Streams responses using NDJSON format.
 */
export class OllamaProvider implements ProviderAdapterInterface {
	readonly #id: string
	readonly #model: string
	readonly #baseURL: string
	readonly #keepAlive: boolean | string
	readonly #timeout: number
	readonly #streamer: StreamerAdapterInterface

	constructor(options: OllamaProviderAdapterOptions) {
		this.#id = crypto.randomUUID()
		this.#model = options.model
		this.#baseURL = options.baseURL ?? DEFAULT_OLLAMA_BASE_URL
		this.#keepAlive = options.keepAlive ?? true
		this.#timeout = options.timeout ?? DEFAULT_TIMEOUT_MS
		this.#streamer = options.streamer ?? createStreamerAdapter()
	}

	getId(): string {
		return this.#id
	}

	generate(
		messages: readonly Message[],
		options: GenerationOptions,
	): StreamHandleInterface {
		const abortController = new AbortController()
		const requestId = crypto.randomUUID()

		// Create stream handle using shared ProviderStreamHandle
		const handle = new ProviderStreamHandle(
			requestId,
			abortController,
			this.#streamer,
		)

		// Start async streamers
		void this.#executeGeneration(messages, options, handle, abortController.signal)

		return handle
	}

	supportsTools(): boolean {
		return true
	}

	supportsStreaming(): boolean {
		return true
	}

	getCapabilities(): ProviderCapabilities {
		return {
			supportsTools: true,
			supportsStreaming: true,
			supportsVision: this.#model.includes('llava') || this.#model.includes('vision'),
			supportsFunctions: true,
			models: [this.#model],
		}
	}

	async #executeGeneration(
		messages: readonly Message[],
		options: GenerationOptions,
		handle: ProviderStreamHandle,
		signal: AbortSignal,
	): Promise<void> {
		try {
			const response = await this.#fetchStream(messages, options, signal)

			if (!response.ok) {
				const error = await this.#handleErrorResponse(response)
				handle.setError(error)
				return
			}

			await this.#processStream(response, handle)
		} catch (error) {
			if (signal.aborted) {
				handle.setAborted()
			} else {
				const mappedError = this.#mapNetworkError(error instanceof Error ? error : new Error(String(error)))
				handle.setError(mappedError)
			}
		}
	}

	async #fetchStream(
		messages: readonly Message[],
		options: GenerationOptions,
		signal: AbortSignal,
	): Promise<Response> {
		const timeout = options.timeout?.requestMs ?? this.#timeout
		const timeoutId = setTimeout(() => signal.dispatchEvent(new Event('abort')), timeout)

		try {
			const body = this.#buildRequestBody(messages, options)

			const response = await fetch(`${this.#baseURL}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
				signal,
			})

			clearTimeout(timeoutId)
			return response
		} catch (error) {
			clearTimeout(timeoutId)
			throw error
		}
	}

	#buildRequestBody(
		messages: readonly Message[],
		options: GenerationOptions,
	): Record<string, unknown> {
		const body: Record<string, unknown> = {
			model: this.#model,
			messages: this.#formatMessages(messages),
			stream: true,
		}

		// Handle keep_alive: Ollama expects a string (e.g., "5m") or number (seconds), not boolean
		// true means keep loaded indefinitely, false means unload immediately
		if (this.#keepAlive !== undefined) {
			if (typeof this.#keepAlive === 'boolean') {
				body.keep_alive = this.#keepAlive ? -1 : 0
			} else {
				body.keep_alive = this.#keepAlive
			}
		}

		const modelOptions: Record<string, unknown> = {}

		if (options.temperature !== undefined) {
			modelOptions.temperature = options.temperature
		}

		if (options.topP !== undefined) {
			modelOptions.top_p = options.topP
		}

		if (options.maxTokens !== undefined) {
			modelOptions.num_predict = options.maxTokens
		}

		if (options.stop !== undefined) {
			modelOptions.stop = options.stop
		}

		if (Object.keys(modelOptions).length > 0) {
			body.options = modelOptions
		}

		if (options.tools !== undefined && options.tools.length > 0) {
			body.tools = this.#formatTools(options.tools)
		}

		return body
	}

	#formatMessages(messages: readonly Message[]): readonly Record<string, unknown>[] {
		return messages.map((msg) => {
			if (typeof msg.content === 'string') {
				return { role: msg.role, content: msg.content }
			}

			// Handle tool results
			if (typeof msg.content === 'object' && 'type' in msg.content && msg.content.type === 'tool_result') {
				const toolResult = msg.content as { result: unknown }
				return {
					role: 'tool',
					content: JSON.stringify(toolResult.result),
				}
			}

			// Fallback for any other content type
			return { role: msg.role, content: JSON.stringify(msg.content) }
		})
	}

	#formatTools(tools: readonly import('@mikesaintsg/core').ToolSchema[]): readonly Record<string, unknown>[] {
		return tools.map((tool) => ({
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: normalizeJsonSchemaTypes(tool.parameters),
			},
		}))
	}

	async #processStream(
		response: Response,
		handle: ProviderStreamHandle,
	): Promise<void> {
		const reader = response.body?.getReader()
		if (reader === undefined) {
			handle.setError(createAdapterError('NETWORK_ERROR', 'No response body'))
			return
		}

		const decoder = new TextDecoder()
		let buffer = ''

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })

				// Process complete lines (NDJSON format)
				const lines = buffer.split('\n')
				buffer = lines.pop() ?? ''

				for (const line of lines) {
					if (line.trim() === '') continue
					this.#processLine(line, handle)
				}
			}

			// Process any remaining buffer
			if (buffer.trim() !== '') {
				this.#processLine(buffer, handle)
			}

			handle.complete()
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				handle.setAborted()
			} else {
				handle.setError(error instanceof Error ? error : new Error(String(error)))
			}
		} finally {
			reader.releaseLock()
		}
	}

	#processLine(line: string, handle: ProviderStreamHandle): void {
		try {
			const chunk = JSON.parse(line) as OllamaChatStreamChunk

			// Handle text content
			if (chunk.message?.content !== undefined && chunk.message.content !== '') {
				handle.emitToken(chunk.message.content)
			}

			// Handle tool calls
			if (chunk.message?.tool_calls !== undefined) {
				let index = 0
				for (const toolCall of chunk.message.tool_calls) {
					if (toolCall !== undefined) {
						// Ollama sends complete tool calls, not incremental
						handle.startToolCall(
							index,
							toolCall.id ?? crypto.randomUUID(),
							toolCall.function.name,
						)
						handle.appendToolCallArguments(
							index,
							JSON.stringify(toolCall.function.arguments),
						)
						index++
					}
				}
			}

			// Handle completion
			if (chunk.done) {
				if (chunk.done_reason !== undefined) {
					handle.setFinishReason(this.#mapFinishReason(chunk.done_reason))
				}

				// Extract usage stats
				if (chunk.prompt_eval_count !== undefined || chunk.eval_count !== undefined) {
					handle.setUsage({
						promptTokens: chunk.prompt_eval_count ?? 0,
						completionTokens: chunk.eval_count ?? 0,
						totalTokens: (chunk.prompt_eval_count ?? 0) + (chunk.eval_count ?? 0),
					})
				}
			}
		} catch {
			// Skip malformed JSON lines
		}
	}

	#mapFinishReason(reason: string): FinishReason {
		switch (reason) {
			case 'stop':
				return 'stop'
			case 'length':
				return 'length'
			case 'load':
				return 'stop'
			default:
				return 'stop'
		}
	}

	async #handleErrorResponse(response: Response): Promise<Error> {
		let errorMessage = `Ollama API error: ${response.status}`

		try {
			const errorBody = await response.json() as { error?: string }
			if (errorBody.error !== undefined) {
				errorMessage = errorBody.error
			}
		} catch {
			// Use status text if JSON parsing fails
			errorMessage = response.statusText || errorMessage
		}

		switch (response.status) {
			case 404:
				return createAdapterError('MODEL_NOT_FOUND_ERROR', errorMessage)
			case 400:
				return createAdapterError('INVALID_REQUEST_ERROR', errorMessage)
			default:
				if (response.status >= 500) {
					return createAdapterError('SERVICE_ERROR', errorMessage)
				}
				return createAdapterError('UNKNOWN_ERROR', errorMessage)
		}
	}

	#mapNetworkError(error: Error): Error {
		if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
			return createAdapterError('TIMEOUT_ERROR', error.message)
		}
		if (error.name === 'AbortError') {
			return createAdapterError('NETWORK_ERROR', 'Request aborted')
		}
		if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
			return createAdapterError('NETWORK_ERROR', 'Could not connect to Ollama. Is Ollama running?')
		}
		return createAdapterError('NETWORK_ERROR', error.message)
	}
}
