/**
 * @mikesaintsg/adapters
 *
 * OpenAI provider adapter.
 * Implements ProviderAdapterInterface for OpenAI chat completions.
 */

import type { ProviderCapabilities, ToolCall, ToolSchema, Unsubscribe } from '@mikesaintsg/core'
import type {
	GenerationOptions,
	GenerationResult,
	Message,
	ProviderAdapterInterface,
	StreamHandleInterface,
} from '@mikesaintsg/inference'
import type {
	OpenAIChatCompletionChunk,
	OpenAIProviderAdapterOptions,
	OpenAIToolCallDelta,
} from '../types.js'
import { OPENAI_DEFAULT_CHAT_MODEL, OPENAI_API_BASE_URL } from '../constants.js'
import { createSSEParser } from '../helpers/sse.js'
import { mapOpenAIError, mapNetworkError } from '../helpers/error-mapping.js'
import { createDoneIteratorResult } from '../helpers.js'

/** Convert internal Message to OpenAI format */
interface OpenAIMessage {
	role: string
	content: string | null
	tool_calls?: readonly {
		id: string
		type: 'function'
		function: { name: string; arguments: string }
	}[]
	tool_call_id?: string
}

/** Accumulated tool call during streaming */
interface AccumulatedToolCall {
	id: string
	name: string
	arguments: string
}

/**
 * Create an OpenAI provider adapter.
 *
 * @param options - Adapter options
 * @returns A provider adapter for OpenAI
 *
 * @example
 * ```ts
 * const adapter = createOpenAIProviderAdapter({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4o',
 * })
 *
 * const handle = adapter.generate([
 *   { role: 'user', content: 'Hello!' }
 * ], {})
 *
 * for await (const chunk of handle) {
 *   console.log(chunk)
 * }
 * ```
 */
export function createOpenAIProviderAdapter(
	options: OpenAIProviderAdapterOptions,
): ProviderAdapterInterface {
	const apiKey = options.apiKey
	const model = options.model ?? OPENAI_DEFAULT_CHAT_MODEL
	const baseURL = options.baseURL ?? OPENAI_API_BASE_URL
	const organization = options.organization

	return {
		getId(): string {
			return `openai:${model}`
		},

		supportsTools(): boolean {
			return true
		},

		supportsStreaming(): boolean {
			return true
		},

		getCapabilities(): ProviderCapabilities {
			return {
				supportsStreaming: true,
				supportsTools: true,
				supportsVision: model.includes('vision') || model.includes('gpt-4o'),
				supportsFunctions: true,
				models: [model],
			}
		},

		generate(
			messages: readonly Message[],
			generationOptions: GenerationOptions,
		): StreamHandleInterface {
			const requestId = crypto.randomUUID()
			const abortController = new AbortController()
			const tokenCallbacks = new Set<(token: string) => void>()
			const completeCallbacks = new Set<(result: GenerationResult) => void>()
			const errorCallbacks = new Set<(error: Error) => void>()

			let resolveResult: ((result: GenerationResult) => void) | undefined
			let rejectResult: ((error: Error) => void) | undefined

			// Token queue for async iteration
			const tokenQueue: string[] = []
			let iteratorResolve: ((value: IteratorResult<string>) => void) | undefined
			let iteratorDone = false
			let iteratorError: Error | undefined

			// Create promise for result
			const resultPromise = new Promise<GenerationResult>((resolve, reject) => {
				resolveResult = resolve
				rejectResult = reject
			})

			// Convert messages to OpenAI format
			const openaiMessages: OpenAIMessage[] = messages.map(msg => {
				const content = typeof msg.content === 'string' ? msg.content : null
				const base: OpenAIMessage = {
					role: msg.role,
					content,
				}

				// Handle tool call content (type: 'tool_calls')
				if (typeof msg.content === 'object' && 'type' in msg.content && msg.content.type === 'tool_calls') {
					return {
						...base,
						role: 'assistant',
						tool_calls: msg.content.toolCalls.map(tc => ({
							id: tc.id,
							type: 'function' as const,
							function: {
								name: tc.name,
								arguments: JSON.stringify(tc.arguments),
							},
						})),
					}
				}

				// Handle tool result content (type: 'tool_result')
				if (typeof msg.content === 'object' && 'type' in msg.content && msg.content.type === 'tool_result') {
					return {
						role: 'tool',
						content: JSON.stringify(msg.content.result),
						tool_call_id: msg.content.callId,
					}
				}

				return base
			})

			// Build request body
			const requestModel = generationOptions.model ?? model
			const body: Record<string, unknown> = {
				model: requestModel,
				messages: openaiMessages,
				stream: true,
			}

			if (generationOptions.temperature !== undefined) {
				body.temperature = generationOptions.temperature
			}
			if (generationOptions.maxTokens !== undefined) {
				body.max_tokens = generationOptions.maxTokens
			}
			if (generationOptions.topP !== undefined) {
				body.top_p = generationOptions.topP
			}
			if (generationOptions.stop !== undefined) {
				body.stop = generationOptions.stop
			}
			if (generationOptions.tools && generationOptions.tools.length > 0) {
				body.tools = formatToolsForOpenAI(generationOptions.tools)
				if (generationOptions.toolChoice) {
					body.tool_choice = formatToolChoiceForOpenAI(generationOptions.toolChoice)
				}
			}

			// Start streaming
			void streamGeneration()

			async function streamGeneration(): Promise<void> {
				let accumulatedText = ''
				const accumulatedToolCalls = new Map<number, AccumulatedToolCall>()
				let finishReason: GenerationResult['finishReason'] = 'stop'

				try {
					const headers: Record<string, string> = {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${apiKey}`,
					}
					if (organization) {
						headers['OpenAI-Organization'] = organization
					}

					const response = await fetch(`${baseURL}/chat/completions`, {
						method: 'POST',
						headers,
						body: JSON.stringify(body),
						signal: abortController.signal,
					})

					if (!response.ok) {
						let errorBody: unknown
						try {
							errorBody = await response.json()
						} catch {
							errorBody = { message: response.statusText }
						}
						const error = mapOpenAIError(response, errorBody)
						handleError(error)
						return
					}

					if (!response.body) {
						handleError(mapNetworkError(new Error('No response body')))
						return
					}

					const reader = response.body.getReader()
					const decoder = new TextDecoder()

					const parser = createSSEParser({
						onEvent(event) {
							if (event.data === '[DONE]') {
								return
							}

							try {
								const chunk = JSON.parse(event.data) as OpenAIChatCompletionChunk
								processChunk(chunk)
							} catch {
								// Skip invalid JSON
							}
						},
					})

					function processChunk(chunk: OpenAIChatCompletionChunk): void {
						const choice = chunk.choices[0]
						if (!choice) return

						const delta = choice.delta

						// Handle text content
						if (delta.content) {
							accumulatedText += delta.content
							emitToken(delta.content)
						}

						// Handle tool calls
						if (delta.tool_calls) {
							for (const tc of delta.tool_calls) {
								processToolCallDelta(tc, accumulatedToolCalls)
							}
						}

						// Handle finish reason
						if (choice.finish_reason) {
							finishReason = mapFinishReason(choice.finish_reason)
						}
					}

					// Read stream
					while (true) {
						const { done, value } = await reader.read()
						if (done) break

						const text = decoder.decode(value, { stream: true })
						parser.feed(text)
					}

					parser.end()

					// Build final result
					const toolCalls: ToolCall[] = []
					for (const [, tc] of accumulatedToolCalls) {
						let args: Record<string, unknown> = {}
						try {
							const parsed = JSON.parse(tc.arguments) as unknown
							if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
								args = parsed as Record<string, unknown>
							}
						} catch {
							// Keep empty args
						}
						toolCalls.push({
							id: tc.id,
							name: tc.name,
							arguments: args,
						})
					}

					const result: GenerationResult = {
						text: accumulatedText,
						toolCalls,
						finishReason,
						aborted: false,
					}

					handleComplete(result)
				} catch (error) {
					if (error instanceof Error && error.name === 'AbortError') {
						const result: GenerationResult = {
							text: accumulatedText,
							toolCalls: [],
							finishReason: 'stop',
							aborted: true,
						}
						handleComplete(result)
						return
					}

					handleError(mapNetworkError(error instanceof Error ? error : new Error(String(error))))
				}
			}

			function emitToken(token: string): void {
				for (const cb of tokenCallbacks) {
					cb(token)
				}
				// Add to queue for async iteration
				if (iteratorResolve) {
					iteratorResolve({ value: token, done: false })
					iteratorResolve = undefined
				} else {
					tokenQueue.push(token)
				}
			}

			function handleComplete(result: GenerationResult): void {
				iteratorDone = true
				if (iteratorResolve) {
					iteratorResolve(createDoneIteratorResult<string>())
				}
				for (const cb of completeCallbacks) {
					cb(result)
				}
				resolveResult?.(result)
			}

			function handleError(error: Error): void {
				iteratorDone = true
				iteratorError = error
				if (iteratorResolve) {
					iteratorResolve(createDoneIteratorResult<string>())
				}
				for (const cb of errorCallbacks) {
					cb(error)
				}
				rejectResult?.(error)
			}

			return {
				requestId,

				[Symbol.asyncIterator](): AsyncIterator<string> {
					return {
						next(): Promise<IteratorResult<string>> {
							if (iteratorError) {
								return Promise.reject(iteratorError)
							}
							if (tokenQueue.length > 0) {
								return Promise.resolve({
									value: tokenQueue.shift()!,
									done: false,
								})
							}
							if (iteratorDone) {
								return Promise.resolve(createDoneIteratorResult<string>())
							}
							return new Promise(resolve => {
								iteratorResolve = resolve
							})
						},
					}
				},

				result(): Promise<GenerationResult> {
					return resultPromise
				},

				abort(): void {
					abortController.abort()
				},

				onToken(callback: (token: string) => void): Unsubscribe {
					tokenCallbacks.add(callback)
					return () => tokenCallbacks.delete(callback)
				},

				onComplete(callback: (result: GenerationResult) => void): Unsubscribe {
					completeCallbacks.add(callback)
					return () => completeCallbacks.delete(callback)
				},

				onError(callback: (error: Error) => void): Unsubscribe {
					errorCallbacks.add(callback)
					return () => errorCallbacks.delete(callback)
				},
			}
		},
	}
}

/** Process tool call delta during streaming */
function processToolCallDelta(
	delta: OpenAIToolCallDelta,
	accumulated: Map<number, AccumulatedToolCall>,
): void {
	const index = delta.index
	let toolCall = accumulated.get(index)

	if (!toolCall) {
		toolCall = {
			id: delta.id ?? '',
			name: delta.function?.name ?? '',
			arguments: '',
		}
		accumulated.set(index, toolCall)
	}

	if (delta.id) {
		toolCall.id = delta.id
	}
	if (delta.function?.name) {
		toolCall.name = delta.function.name
	}
	if (delta.function?.arguments) {
		toolCall.arguments += delta.function.arguments
	}
}

/** Format tools for OpenAI API */
function formatToolsForOpenAI(
	tools: readonly ToolSchema[],
): readonly { type: 'function'; function: { name: string; description: string; parameters: unknown } }[] {
	return tools.map(tool => ({
		type: 'function' as const,
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	}))
}

/** Format tool choice for OpenAI API */
function formatToolChoiceForOpenAI(
	choice: GenerationOptions['toolChoice'],
): unknown {
	if (!choice) return undefined
	if (typeof choice === 'string') return choice
	return {
		type: 'function',
		function: { name: choice.name },
	}
}

/** Map OpenAI finish reason to internal format */
function mapFinishReason(reason: string): GenerationResult['finishReason'] {
	switch (reason) {
		case 'stop':
			return 'stop'
		case 'length':
			return 'length'
		case 'tool_calls':
			return 'tool_calls'
		case 'content_filter':
			return 'content_filter'
		default:
			return 'stop'
	}
}
