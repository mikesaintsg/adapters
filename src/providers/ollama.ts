/**
 * @mikesaintsg/adapters
 *
 * Ollama provider adapter.
 * Implements ProviderAdapterInterface for Ollama local LLM server.
 *
 * Note: Ollama uses NDJSON streaming, not SSE.
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
	OllamaChatMessage,
	OllamaChatStreamChunk,
	OllamaProviderAdapterOptions,
	OllamaToolCall,
} from '../types.js'
import { OLLAMA_API_BASE_URL, OLLAMA_DEFAULT_TIMEOUT } from '../constants.js'
import { mapOllamaError, mapNetworkError } from '../helpers/error-mapping.js'
import { createDoneIteratorResult } from '../helpers.js'

/**
 * Create an Ollama provider adapter.
 *
 * @param options - Adapter options
 * @returns A provider adapter for Ollama
 *
 * @example
 * ```ts
 * const adapter = createOllamaProviderAdapter({
 *   model: 'llama3',
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
export function createOllamaProviderAdapter(
	options: OllamaProviderAdapterOptions,
): ProviderAdapterInterface {
	const model = options.model
	const baseURL = options.baseURL ?? OLLAMA_API_BASE_URL
	const keepAlive = options.keepAlive ?? true
	const timeout = options.timeout ?? OLLAMA_DEFAULT_TIMEOUT

	return {
		getId(): string {
			return `ollama:${model}`
		},

		supportsTools(): boolean {
			// Ollama supports tools for some models
			return true
		},

		supportsStreaming(): boolean {
			return true
		},

		getCapabilities(): ProviderCapabilities {
			return {
				supportsStreaming: true,
				supportsTools: true,
				supportsVision: false,
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

			// Convert messages to Ollama format
			const ollamaMessages: OllamaChatMessage[] = messages.map(msg => {
				if (typeof msg.content === 'string') {
					return {
						role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
						content: msg.content,
					}
				}

				// Handle tool calls from assistant (type: 'tool_calls')
				if ('type' in msg.content && msg.content.type === 'tool_calls') {
					return {
						role: 'assistant' as const,
						content: '',
						tool_calls: msg.content.toolCalls.map(tc => ({
							id: tc.id,
							type: 'function' as const,
							function: {
								name: tc.name,
								arguments: tc.arguments,
							},
						})),
					}
				}

				// Handle tool results (type: 'tool_result')
				if ('type' in msg.content && msg.content.type === 'tool_result') {
					return {
						role: 'tool' as const,
						content: JSON.stringify(msg.content.result),
					}
				}

				return {
					role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
					content: '',
				}
			})

			// Build request body
			const requestModel = generationOptions.model ?? model
			const body: Record<string, unknown> = {
				model: requestModel,
				messages: ollamaMessages,
				stream: true,
			}

			if (keepAlive !== undefined) {
				body.keep_alive = keepAlive
			}

			// Add options
			const modelOptions: Record<string, unknown> = {}
			if (generationOptions.temperature !== undefined) {
				modelOptions.temperature = generationOptions.temperature
			}
			if (generationOptions.topP !== undefined) {
				modelOptions.top_p = generationOptions.topP
			}
			if (generationOptions.maxTokens !== undefined) {
				modelOptions.num_predict = generationOptions.maxTokens
			}
			if (generationOptions.stop !== undefined) {
				modelOptions.stop = generationOptions.stop
			}
			if (Object.keys(modelOptions).length > 0) {
				body.options = modelOptions
			}

			// Add tools if provided
			if (generationOptions.tools && generationOptions.tools.length > 0) {
				body.tools = formatToolsForOllama(generationOptions.tools)
			}

			// Start streaming
			void streamGeneration()

			async function streamGeneration(): Promise<void> {
				let accumulatedText = ''
				const toolCalls: ToolCall[] = []
				let finishReason: GenerationResult['finishReason'] = 'stop'

				try {
					// Set up timeout
					const timeoutId = setTimeout(() => {
						abortController.abort()
					}, timeout)

					const response = await fetch(`${baseURL}/api/chat`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(body),
						signal: abortController.signal,
					})

					clearTimeout(timeoutId)

					if (!response.ok) {
						let errorBody: unknown
						try {
							errorBody = await response.json()
						} catch {
							errorBody = { error: response.statusText }
						}
						const error = mapOllamaError(response, errorBody)
						handleError(error)
						return
					}

					if (!response.body) {
						handleError(mapNetworkError(new Error('No response body')))
						return
					}

					const reader = response.body.getReader()
					const decoder = new TextDecoder()
					let buffer = ''

					// Read NDJSON stream
					while (true) {
						const { done, value } = await reader.read()
						if (done) break

						buffer += decoder.decode(value, { stream: true })

						// Process complete lines
						const lines = buffer.split('\n')
						buffer = lines.pop() ?? ''

						for (const line of lines) {
							if (!line.trim()) continue

							try {
								const chunk = JSON.parse(line) as OllamaChatStreamChunk
								processChunk(chunk)
							} catch {
								// Skip invalid JSON
							}
						}
					}

					// Process any remaining buffer
					if (buffer.trim()) {
						try {
							const chunk = JSON.parse(buffer) as OllamaChatStreamChunk
							processChunk(chunk)
						} catch {
							// Skip invalid JSON
						}
					}

					function processChunk(chunk: OllamaChatStreamChunk): void {
						const message = chunk.message

						// Handle text content
						if (message.content) {
							accumulatedText += message.content
							emitToken(message.content)
						}

						// Handle tool calls
						if (message.tool_calls) {
							for (const tc of message.tool_calls) {
								toolCalls.push(parseOllamaToolCall(tc))
							}
						}

						// Handle done
						if (chunk.done) {
							if (chunk.done_reason === 'length') {
								finishReason = 'length'
							} else if (toolCalls.length > 0) {
								finishReason = 'tool_calls'
							}
						}
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

/** Format tools for Ollama API */
function formatToolsForOllama(
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

/** Parse Ollama tool call to internal format */
function parseOllamaToolCall(tc: OllamaToolCall): ToolCall {
	return {
		id: tc.id ?? crypto.randomUUID(),
		name: tc.function.name,
		arguments: tc.function.arguments,
	}
}
