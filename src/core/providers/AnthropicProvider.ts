/**
 * Anthropic Provider Adapter
 *
 * Implements ProviderAdapterInterface for Anthropic's Claude API.
 * Uses SSE streamers with event-based message format.
 */

import type {
	ProviderAdapterInterface,
	StreamHandleInterface,
	GenerationOptions,
	Message,
	ProviderCapabilities,
	FinishReason,
	StreamerAdapterInterface,
	SSEParserAdapterInterface,
	SSEEvent,
} from '@mikesaintsg/core'

import type {
	AnthropicProviderAdapterOptions,
	AnthropicMessageStreamEvent,
} from '../../types.js'

import { createAdapterError } from '../../helpers.js'
import {
	DEFAULT_ANTHROPIC_MODEL,
	DEFAULT_ANTHROPIC_BASE_URL,
	DEFAULT_TIMEOUT_MS,
	DEFAULT_ANTHROPIC_VERSION,
	DEFAULT_ANTHROPIC_MAX_TOKENS,
} from '../../constants.js'
import { createSSEParserAdapter, createStreamerAdapter } from '../../factories.js'
import { ProviderStreamHandle } from '../streamers/ProviderStreamHandle.js'

/**
 * Anthropic provider implementation.
 * Streams responses using Anthropic's SSE format.
 */
export class AnthropicProvider implements ProviderAdapterInterface {
	readonly #id: string
	readonly #apiKey: string
	readonly #model: string
	readonly #baseURL: string
	readonly #streamer: StreamerAdapterInterface
	readonly #sseParser: SSEParserAdapterInterface

	constructor(options: AnthropicProviderAdapterOptions) {
		this.#id = crypto.randomUUID()
		this.#apiKey = options.apiKey
		this.#model = options.model ?? DEFAULT_ANTHROPIC_MODEL
		this.#baseURL = options.baseURL ?? DEFAULT_ANTHROPIC_BASE_URL
		this.#streamer = options.streamer ?? createStreamerAdapter()
		this.#sseParser = options.sseParser ?? createSSEParserAdapter()
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
			supportsVision: this.#model.includes('claude-3'),
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
		const timeout = options.timeout?.requestMs ?? DEFAULT_TIMEOUT_MS
		const timeoutId = setTimeout(() => signal.dispatchEvent(new Event('abort')), timeout)

		try {
			const body = this.#buildRequestBody(messages, options)
			const headers = this.#buildHeaders()

			const response = await fetch(`${this.#baseURL}/v1/messages`, {
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
			model: this.#model,
			messages: this.#formatMessages(messages),
			stream: true,
			max_tokens: options.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS,
		}

		// Extract system message if present
		const systemMessage = messages.find((m) => m.role === 'system')
		if (systemMessage !== undefined && typeof systemMessage.content === 'string') {
			body.system = systemMessage.content
		}

		if (options.temperature !== undefined) {
			body.temperature = options.temperature
		}

		if (options.topP !== undefined) {
			body.top_p = options.topP
		}

		if (options.stop !== undefined) {
			body.stop_sequences = options.stop
		}

		if (options.tools !== undefined && options.tools.length > 0) {
			body.tools = this.#formatTools(options.tools)
		}

		if (options.toolChoice !== undefined) {
			body.tool_choice = this.#formatToolChoice(options.toolChoice)
		}

		return body
	}

	#formatMessages(messages: readonly Message[]): readonly Record<string, unknown>[] {
		// Filter out system messages as they are handled separately
		return messages
			.filter((m) => m.role !== 'system')
			.map((msg) => {
				if (typeof msg.content === 'string') {
					return { role: this.#mapRole(msg.role), content: msg.content }
				}

				// Handle tool results
				if (typeof msg.content === 'object' && 'type' in msg.content && msg.content.type === 'tool_result') {
					const toolResult = msg.content as { callId: string; result: unknown }
					return {
						role: 'user',
						content: [{
							type: 'tool_result',
							tool_use_id: toolResult.callId,
							content: JSON.stringify(toolResult.result),
						}],
					}
				}

				// Fallback for any other content type
				return { role: this.#mapRole(msg.role), content: JSON.stringify(msg.content) }
			})
	}

	#mapRole(role: string): string {
		switch (role) {
			case 'user':
				return 'user'
			case 'assistant':
				return 'assistant'
			case 'tool':
				return 'user'
			default:
				return 'user'
		}
	}

	#formatTools(tools: readonly import('@mikesaintsg/core').ToolSchema[]): readonly Record<string, unknown>[] {
		return tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.parameters,
		}))
	}

	#formatToolChoice(choice: GenerationOptions['toolChoice']): unknown {
		if (choice === 'auto') return { type: 'auto' }
		if (choice === 'none') return { type: 'any' }
		if (choice === 'required') return { type: 'any' }
		if (typeof choice === 'object' && 'name' in choice) {
			return { type: 'tool', name: choice.name }
		}
		return { type: 'auto' }
	}

	#buildHeaders(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
			'x-api-key': this.#apiKey,
			'anthropic-version': DEFAULT_ANTHROPIC_VERSION,
		}
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
		const parser = this.#sseParser.createParser({
			onEvent: (event) => this.#handleSSEEvent(event, handle),
			onError: (error) => handle.setError(error),
			onEnd: () => handle.complete(),
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
			if (error instanceof Error && error.name === 'AbortError') {
				handle.setAborted()
			} else {
				handle.setError(error instanceof Error ? error : new Error(String(error)))
			}
		} finally {
			reader.releaseLock()
		}
	}

	#handleSSEEvent(event: SSEEvent, handle: ProviderStreamHandle): void {
		const data = event.data.trim()

		// Skip empty events
		if (data === '') return

		try {
			const parsed = JSON.parse(data) as AnthropicMessageStreamEvent

			switch (parsed.type) {
				case 'content_block_start':
					if (parsed.content_block?.type === 'tool_use') {
						handle.startToolCall(
							parsed.index ?? 0,
							parsed.content_block.id ?? '',
							parsed.content_block.name ?? '',
						)
					}
					break

				case 'content_block_delta':
					if (parsed.delta?.type === 'text_delta' && parsed.delta.text !== undefined) {
						handle.emitToken(parsed.delta.text)
					} else if (parsed.delta?.type === 'input_json_delta' && parsed.delta.partial_json !== undefined) {
						handle.appendToolCallArguments(parsed.index ?? 0, parsed.delta.partial_json)
					}
					break

				case 'content_block_stop':
					// Content block finished
					break

				case 'message_delta':
					// Handle finish reason from message_delta
					if (parsed.delta !== undefined && 'stop_reason' in parsed.delta) {
						const stopReason = (parsed.delta as { stop_reason?: string }).stop_reason
						if (stopReason !== undefined) {
							handle.setFinishReason(this.#mapFinishReason(stopReason))
						}
					}
					break

				case 'message_stop':
					handle.complete()
					break

				case 'message_start':
					// Message started, extract usage if present
					if ('message' in parsed) {
						const message = parsed as unknown as { message?: { usage?: { input_tokens?: number; output_tokens?: number } } }
						if (message.message?.usage !== undefined) {
							handle.setUsage({
								promptTokens: message.message.usage.input_tokens ?? 0,
								completionTokens: message.message.usage.output_tokens ?? 0,
								totalTokens: (message.message.usage.input_tokens ?? 0) + (message.message.usage.output_tokens ?? 0),
							})
						}
					}
					break

				case 'error':
					if ('error' in parsed) {
						const errorData = parsed as unknown as { error?: { message?: string } }
						handle.setError(createAdapterError('SERVICE_ERROR', errorData.error?.message ?? 'Unknown error'))
					}
					break
			}
		} catch {
			// Skip malformed JSON
		}
	}

	#mapFinishReason(reason: string): FinishReason {
		switch (reason) {
			case 'end_turn':
			case 'stop_sequence':
				return 'stop'
			case 'max_tokens':
				return 'length'
			case 'tool_use':
				return 'tool_calls'
			default:
				return 'stop'
		}
	}

	async #handleErrorResponse(response: Response): Promise<Error> {
		let errorMessage = `Anthropic API error: ${response.status}`
		let providerCode: string | undefined

		try {
			const errorBody = await response.json() as { error?: { message?: string; type?: string } }
			if (errorBody.error?.message !== undefined) {
				errorMessage = errorBody.error.message
			}
			providerCode = errorBody.error?.type
		} catch {
			// Use status text if JSON parsing fails
			errorMessage = response.statusText || errorMessage
		}

		// Build error data, only including defined values
		const errorData = {
			...(providerCode !== undefined && { providerCode }),
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
			case 529:
				return createAdapterError('SERVICE_ERROR', errorMessage, errorData)
			default:
				if (response.status >= 500) {
					return createAdapterError('SERVICE_ERROR', errorMessage, errorData)
				}
				return createAdapterError('UNKNOWN_ERROR', errorMessage, errorData)
		}
	}

	#mapNetworkError(error: Error): Error {
		if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
			return createAdapterError('TIMEOUT_ERROR', error.message)
		}
		if (error.name === 'AbortError') {
			return createAdapterError('NETWORK_ERROR', 'Request aborted')
		}
		return createAdapterError('NETWORK_ERROR', error.message)
	}
}
