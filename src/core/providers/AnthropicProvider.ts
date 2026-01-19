/**
 * Anthropic Provider Adapter
 *
 * Implements ProviderAdapterInterface for Anthropic's Claude API.
 * Uses SSE streaming with event-based message format.
 */

import type {
	ProviderAdapterInterface,
	StreamHandleInterface,
	GenerationOptions,
	GenerationResult,
	Message,
	ProviderCapabilities,
	FinishReason,
	UsageStats,
	ToolCall,
} from '@mikesaintsg/core'

import type {
	AnthropicProviderAdapterOptions,
	StreamerAdapterInterface,
	SSEParserAdapterInterface,
	SSEEvent,
	AnthropicMessageStreamEvent,
} from '../../types.js'

import { createStreamerAdapter } from '../streaming/Streamer.js'
import { createSSEParser } from '../streaming/SSEParser.js'
import { createAdapterError } from '../../helpers.js'
import {
	DEFAULT_ANTHROPIC_MODEL,
	DEFAULT_ANTHROPIC_BASE_URL,
	DEFAULT_TIMEOUT_MS,
	DEFAULT_ANTHROPIC_VERSION,
	DEFAULT_ANTHROPIC_MAX_TOKENS,
} from '../../constants.js'

/**
 * Anthropic provider implementation.
 * Streams responses using Anthropic's SSE format.
 */
class AnthropicProvider implements ProviderAdapterInterface {
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
		this.#sseParser = options.sseParser ?? createSSEParser()
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

		// Create stream handle
		const handle = new AnthropicStreamHandle(
			requestId,
			abortController,
			this.#streamer,
		)

		// Start async streaming
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
		handle: AnthropicStreamHandle,
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
		handle: AnthropicStreamHandle,
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

	#handleSSEEvent(event: SSEEvent, handle: AnthropicStreamHandle): void {
		const data = event.data.trim()

		// Skip empty events
		if (data === '') return

		try {
			const parsed = JSON.parse(data) as AnthropicMessageStreamEvent

			switch (parsed.type) {
				case 'content_block_start':
					if (parsed.content_block?.type === 'tool_use') {
						handle.startToolUse(
							parsed.index ?? 0,
							parsed.content_block.id ?? '',
							parsed.content_block.name ?? '',
						)
					}
					break

				case 'content_block_delta':
					if (parsed.delta?.type === 'text_delta' && parsed.delta.text !== undefined) {
						handle.appendText(parsed.delta.text)
						this.#streamer.emit(parsed.delta.text)
					} else if (parsed.delta?.type === 'input_json_delta' && parsed.delta.partial_json !== undefined) {
						handle.appendToolArguments(parsed.index ?? 0, parsed.delta.partial_json)
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

/**
 * Stream handle for Anthropic responses.
 * Implements StreamHandleInterface for async iteration and result collection.
 */
class AnthropicStreamHandle implements StreamHandleInterface {
	readonly requestId: string
	readonly #abortController: AbortController
	readonly #streamer: StreamerAdapterInterface

	#text = ''
	#toolCalls = new Map<number, { id: string; name: string; arguments: string }>()
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

		this.#resultPromise = new Promise((resolve, reject) => {
			this.#resultResolve = resolve
			this.#resultReject = reject
		})
	}

	// StreamHandleInterface implementation

	abort(): void {
		this.#abortController.abort()
		this.setAborted()
	}

	onToken(callback: (token: string) => void): () => void {
		return this.#streamer.onToken(callback)
	}

	onComplete(callback: (result: GenerationResult) => void): () => void {
		this.#completeCallbacks.add(callback)
		return () => this.#completeCallbacks.delete(callback)
	}

	onError(callback: (error: Error) => void): () => void {
		this.#errorCallbacks.add(callback)
		return () => this.#errorCallbacks.delete(callback)
	}

	result(): Promise<GenerationResult> {
		return this.#resultPromise
	}

	[Symbol.asyncIterator](): AsyncIterator<string> {
		const tokens: string[] = []
		let resolveNext: ((value: IteratorResult<string>) => void) | undefined
		let done = false

		this.#streamer.onToken((token) => {
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
			next: () => {
				if (tokens.length > 0) {
					return Promise.resolve({ value: tokens.shift()!, done: false })
				}
				if (done) {
					return Promise.resolve({ value: undefined as unknown as string, done: true })
				}
				return new Promise((resolve) => {
					resolveNext = resolve
				})
			},
		}
	}

	// Internal methods for provider

	appendText(text: string): void {
		this.#text += text
	}

	startToolUse(index: number, id: string, name: string): void {
		this.#toolCalls.set(index, { id, name, arguments: '' })
	}

	appendToolArguments(index: number, json: string): void {
		const toolCall = this.#toolCalls.get(index)
		if (toolCall !== undefined) {
			toolCall.arguments += json
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
		this.#streamer.end()
		this.#resultReject?.(error)
		for (const callback of this.#errorCallbacks) {
			callback(error)
		}
	}

	setAborted(): void {
		this.#aborted = true
		this.#completed = true
		this.#streamer.end()
		const result = this.#buildResult()
		this.#resultResolve?.(result)
		for (const callback of this.#completeCallbacks) {
			callback(result)
		}
	}

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

/**
 * Creates an Anthropic provider adapter.
 *
 * @param options - Anthropic provider options
 * @returns Provider adapter instance
 *
 * @example
 * ```ts
 * const provider = createAnthropicProviderAdapter({
 *   apiKey: 'sk-ant-...',
 *   model: 'claude-3-5-sonnet-20241022',
 * })
 *
 * const stream = provider.generate([
 *   { role: 'user', content: 'Hello!' }
 * ], {})
 *
 * for await (const token of stream) {
 *   console.log(token)
 * }
 * ```
 */
export function createAnthropicProviderAdapter(
	options: AnthropicProviderAdapterOptions,
): ProviderAdapterInterface {
	return new AnthropicProvider(options)
}
