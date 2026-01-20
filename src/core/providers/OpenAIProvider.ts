/**
 * OpenAI Provider Adapter
 *
 * Implements ProviderAdapterInterface for OpenAI API.
 * Streaming is native — uses SSE parser internally.
 */

import type {
	ProviderAdapterInterface,
	GenerationOptions,
	Message,
	StreamHandleInterface,
	ProviderCapabilities,
	FinishReason,
	StreamerAdapterInterface,
	SSEParserAdapterInterface,
	SSEEvent,
} from '@mikesaintsg/core'

import type {
	OpenAIProviderAdapterOptions,
	OpenAIChatCompletionChunk,
} from '../../types.js'

import { createStreamerAdapter, createSSEParserAdapter } from '../../factories.js'
import { createAdapterError } from '../../helpers.js'
import {
	DEFAULT_OPENAI_MODEL,
	DEFAULT_OPENAI_BASE_URL,
	DEFAULT_TIMEOUT_MS,
} from '../../constants.js'
import { ProviderStreamHandle } from '../streamers/ProviderStreamHandle.js'

/**
 *  OpenAI provider implementation
 */
export class OpenAIProvider implements ProviderAdapterInterface {
	readonly #id: string
	readonly #apiKey: string
	readonly #model: string
	readonly #baseURL: string
	readonly #organization: string | undefined
	readonly #streamer: StreamerAdapterInterface
	readonly #sseParser: SSEParserAdapterInterface
	readonly #defaultOptions: GenerationOptions | undefined

	constructor(options: OpenAIProviderAdapterOptions) {
		this.#id = crypto.randomUUID()
		this.#apiKey = options.apiKey
		this.#model = options.model ?? DEFAULT_OPENAI_MODEL
		this.#baseURL = options.baseURL ?? DEFAULT_OPENAI_BASE_URL
		this.#organization = options.organization
		this.#streamer = options.streamer ?? createStreamerAdapter()
		this.#sseParser = options.sseParser ?? createSSEParserAdapter()
		this.#defaultOptions = options.defaultOptions
	}

	getId(): string {
		return this.#id
	}

	generate(
		messages: readonly Message[],
		options: GenerationOptions,
	): StreamHandleInterface {
		const requestId = crypto.randomUUID()
		const abortController = new AbortController()

		// Merge default options with provided options
		const mergedOptions = { ...this.#defaultOptions, ...options }

		// Create stream handle using shared ProviderStreamHandle
		const handle = new ProviderStreamHandle(
			requestId,
			abortController,
			this.#streamer,
		)

		// Start async generation
		void this.#executeGeneration(messages, mergedOptions, handle, abortController.signal)

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
			supportsVision: this.#model.includes('vision') || this.#model.includes('gpt-4o'),
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
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					handle.setAborted()
				} else {
					handle.setError(this.#mapNetworkError(error))
				}
			}
		}
	}

	async #fetchStream(
		messages: readonly Message[],
		options: GenerationOptions,
		signal: AbortSignal,
	): Promise<Response> {
		const timeout = options.timeout?.requestMs ?? DEFAULT_TIMEOUT_MS
		const timeoutId = setTimeout(() => signal.dispatchEvent(new Event('abort')), timeout)

		try {
			const body = this.#buildRequestBody(messages, options)
			const headers = this.#buildHeaders()

			const response = await fetch(`${this.#baseURL}/chat/completions`, {
				method: 'POST',
				headers,
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
			model: options.model ?? this.#model,
			messages: this.#formatMessages(messages),
			stream: true,
			stream_options: { include_usage: true },
		}

		if (options.temperature !== undefined) {
			body.temperature = options.temperature
		}
		if (options.maxTokens !== undefined) {
			body.max_tokens = options.maxTokens
		}
		if (options.topP !== undefined) {
			body.top_p = options.topP
		}
		if (options.stop !== undefined) {
			body.stop = options.stop
		}
		if (options.tools !== undefined && options.tools.length > 0) {
			body.tools = this.#formatTools(options.tools)
			if (options.toolChoice !== undefined) {
				body.tool_choice = this.#formatToolChoice(options.toolChoice)
			}
		}

		return body
	}

	#formatMessages(messages: readonly Message[]): readonly Record<string, unknown>[] {
		return messages.map((msg) => {
			if (typeof msg.content === 'string') {
				return {
					role: msg.role,
					content: msg.content,
				}
			}
			// Handle tool calls and results
			if ('toolCalls' in msg.content) {
				return {
					role: 'assistant',
					content: null,
					tool_calls: msg.content.toolCalls.map((tc) => ({
						id: tc.id,
						type: 'function',
						function: {
							name: tc.name,
							arguments: JSON.stringify(tc.arguments),
						},
					})),
				}
			}
			if ('toolCallId' in msg.content) {
				return {
					role: 'tool',
					tool_call_id: msg.content.toolCallId,
					content: JSON.stringify(msg.content.result),
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
				parameters: tool.parameters,
			},
		}))
	}

	#formatToolChoice(choice: GenerationOptions['toolChoice']): unknown {
		if (choice === 'auto' || choice === 'none' || choice === 'required') {
			return choice
		}
		if (typeof choice === 'object' && choice !== null && 'name' in choice) {
			return { type: 'function', function: { name: choice.name } }
		}
		return 'auto'
	}

	#buildHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${this.#apiKey}`,
		}

		if (this.#organization !== undefined) {
			headers['OpenAI-Organization'] = this.#organization
		}

		return headers
	}

	async #processStream(
		response: Response,
		handle: ProviderStreamHandle,
	): Promise<void> {
		const reader = response.body?.getReader()
		if (reader === undefined) {
			handle.setError(createAdapterError(
				'NETWORK_ERROR',
				'Response body is not readable',
			))
			return
		}

		const decoder = new TextDecoder()
		const parser = this.#sseParser.createParser({
			onEvent: (event: SSEEvent) => {
				this.#handleSSEEvent(event, handle)
			},
			onError: (error: Error) => {
				handle.setError(createAdapterError(
					'SERVICE_ERROR',
					`SSE parsing error: ${error.message}`,
				))
			},
		})

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				const chunk = decoder.decode(value, { stream: true })
				parser.feed(chunk)
			}
			parser.end()
		} catch (error) {
			if (error instanceof Error && error.name !== 'AbortError') {
				handle.setError(this.#mapNetworkError(error))
			}
		} finally {
			reader.releaseLock()
		}
	}

	#handleSSEEvent(event: SSEEvent, handle: ProviderStreamHandle): void {
		const data = event.data.trim()

		// Handle stream end
		if (data === '[DONE]') {
			handle.complete()
			return
		}

		try {
			const chunk = JSON.parse(data) as OpenAIChatCompletionChunk
			this.#processChunk(chunk, handle)
		} catch {
			// Ignore malformed JSON
		}
	}

	#processChunk(chunk: OpenAIChatCompletionChunk, handle: ProviderStreamHandle): void {
		for (const choice of chunk.choices) {
			// Handle text content
			if (choice.delta.content !== undefined && choice.delta.content !== null) {
				handle.emitToken(choice.delta.content)
			}

			// Handle tool calls
			if (choice.delta.tool_calls !== undefined) {
				for (const toolCallDelta of choice.delta.tool_calls) {
					handle.updateToolCall(toolCallDelta.index, {
						id: toolCallDelta.id,
						name: toolCallDelta.function?.name,
						arguments: toolCallDelta.function?.arguments,
					})
				}
			}

			// Handle finish reason
			if (choice.finish_reason !== null) {
				handle.setFinishReason(this.#mapFinishReason(choice.finish_reason))
			}
		}

		// Handle usage stats (usually in final chunk)
		if (chunk.usage !== undefined) {
			handle.setUsage({
				promptTokens: chunk.usage.prompt_tokens,
				completionTokens: chunk.usage.completion_tokens,
				totalTokens: chunk.usage.total_tokens,
			})
		}
	}

	#mapFinishReason(reason: string): FinishReason {
		switch (reason) {
			case 'stop': return 'stop'
			case 'length': return 'length'
			case 'tool_calls': return 'tool_calls'
			case 'content_filter': return 'content_filter'
			default: return 'stop'
		}
	}

	async #handleErrorResponse(response: Response): Promise<Error> {
		let errorMessage = `OpenAI API error: ${response.status}`
		let providerCode: string | undefined

		try {
			const errorBody = await response.json() as { error?: { message?: string; code?: string } }
			if (errorBody.error?.message !== undefined) {
				errorMessage = errorBody.error.message
			}
			providerCode = errorBody.error?.code
		} catch {
			// Use status text if JSON parsing fails
			errorMessage = response.statusText || errorMessage
		}

		const retryAfter = this.#parseRetryAfter(response.headers.get('retry-after'))

		// Build error data, only including defined values
		const errorData = {
			...(providerCode !== undefined && { providerCode }),
			...(retryAfter !== undefined && { retryAfter }),
		}

		switch (response.status) {
			case 401:
				return createAdapterError('AUTHENTICATION_ERROR', errorMessage, errorData)
			case 429:
				return createAdapterError('RATE_LIMIT_ERROR', errorMessage, errorData)
			case 400:
				return createAdapterError('INVALID_REQUEST_ERROR', errorMessage, errorData)
			case 404:
				return createAdapterError('MODEL_NOT_FOUND_ERROR', errorMessage, errorData)
			case 413:
				return createAdapterError('CONTEXT_LENGTH_ERROR', errorMessage, errorData)
			default:
				if (response.status >= 500) {
					return createAdapterError('SERVICE_ERROR', errorMessage, errorData)
				}
				return createAdapterError('UNKNOWN_ERROR', errorMessage, errorData)
		}
	}

	#parseRetryAfter(header: string | null): number | undefined {
		if (header === null) return undefined
		const seconds = parseInt(header, 10)
		if (Number.isNaN(seconds)) return undefined
		return seconds * 1000 // Convert to ms
	}

	#mapNetworkError(error: Error): Error {
		if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
			return createAdapterError('TIMEOUT_ERROR', error.message)
		}
		return createAdapterError('NETWORK_ERROR', error.message)
	}
}
