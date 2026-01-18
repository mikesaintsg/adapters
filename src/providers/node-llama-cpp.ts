/**
 * @mikesaintsg/adapters
 *
 * node-llama-cpp provider adapter.
 * Implements ProviderAdapterInterface for node-llama-cpp local LLM.
 *
 * IMPORTANT: This adapter uses `import type` for node-llama-cpp to avoid
 * runtime dependencies. Consumers must have node-llama-cpp installed and
 * pass the required instances at runtime. The compiled code contains NO
 * runtime references to node-llama-cpp.
 */

import type {
	GenerationOptions,
	GenerationResult,
	Message,
	ProviderAdapterInterface,
	ProviderCapabilities,
	StreamHandleInterface,
	ToolCall,
	Unsubscribe,
} from '@mikesaintsg/core'
import type {
	NodeLlamaCppProviderAdapterOptions,
	NodeLlamaCppChatHistoryItem,
} from '../types.js'
import {
	NODE_LLAMA_CPP_DEFAULT_TIMEOUT,
	NODE_LLAMA_CPP_DEFAULT_MODEL_NAME,
} from '../constants.js'
import { createDoneIteratorResult } from '../helpers.js'
import { AdapterError } from '../errors.js'

/**
 * Create a node-llama-cpp provider adapter.
 *
 * This adapter allows using locally running LLaMA models via node-llama-cpp.
 * The consumer must provide initialized node-llama-cpp objects.
 *
 * IMPORTANT: node-llama-cpp is NOT a runtime dependency of this package.
 * Consumers must install node-llama-cpp themselves and pass the required
 * instances. This design allows consumers who don't use node-llama-cpp
 * to avoid installing it.
 *
 * @param options - Adapter options including the initialized context
 * @returns A provider adapter for node-llama-cpp
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
 * import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
 *
 * // Consumer initializes node-llama-cpp
 * const llama = await getLlama()
 * const model = await llama.loadModel({ modelPath: './model.gguf' })
 * const context = await model.createContext()
 *
 * // Pass to adapter
 * const adapter = createNodeLlamaCppProviderAdapter({
 *   context,
 *   modelName: 'llama3',
 * })
 *
 * const handle = adapter.generate([
 *   { id: '1', role: 'user', content: 'Hello!', createdAt: Date.now() }
 * ], {})
 *
 * for await (const chunk of handle) {
 *   console.log(chunk)
 * }
 * ```
 */
export function createNodeLlamaCppProviderAdapter(
	options: NodeLlamaCppProviderAdapterOptions,
): ProviderAdapterInterface {
	const context = options.context
	const chatWrapper = options.chatWrapper
	const defaultOptions = options.defaultOptions
	const timeout = options.timeout ?? NODE_LLAMA_CPP_DEFAULT_TIMEOUT
	const modelName = options.modelName ?? NODE_LLAMA_CPP_DEFAULT_MODEL_NAME

	return {
		getId(): string {
			return `node-llama-cpp:${modelName}`
		},

		supportsTools(): boolean {
			// node-llama-cpp supports function calling with appropriate chat wrappers
			return chatWrapper !== undefined
		},

		supportsStreaming(): boolean {
			return true
		},

		getCapabilities(): ProviderCapabilities {
			return {
				supportsStreaming: true,
				supportsTools: chatWrapper !== undefined,
				supportsVision: false,
				supportsFunctions: chatWrapper !== undefined,
				models: [modelName],
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

			// Start streaming
			void streamGeneration()

			async function streamGeneration(): Promise<void> {
				let accumulatedText = ''
				const toolCalls: ToolCall[] = []
				let finishReason: GenerationResult['finishReason'] = 'stop'
				let tokensGenerated = 0

				try {
					// Set up timeout
					const timeoutId = setTimeout(() => {
						abortController.abort()
					}, timeout)

					// Convert messages to chat history format
					const chatHistory = convertMessagesToChatHistory(messages)

					// Get the sequence for evaluation
					const sequence = context.getSequence()
					const model = context.model

					// Prepare tokens for evaluation
					let tokens: readonly number[]

					if (chatWrapper) {
						// Use chat wrapper to format messages
						const contextState = chatWrapper.generateContextState({
							chatHistory,
						})
						tokens = contextState.contextText.tokenize(model)
					} else {
						// Simple concatenation of messages
						const fullText = chatHistory
							.map(item => {
								if (item.type === 'system') return `System: ${item.text}`
								if (item.type === 'user') return `User: ${item.text}`
								if (item.type === 'model') return `Assistant: ${item.response.join('')}`
								return ''
							})
							.join('\n\n')
						tokens = model.tokenize(fullText)
					}

					// Prepare generation options
					const temperature = generationOptions.temperature ?? defaultOptions?.temperature
					const topP = generationOptions.topP ?? defaultOptions?.topP
					const maxTokens = generationOptions.maxTokens ?? defaultOptions?.maxTokens

					// Build evaluate options, only including defined values
					const evaluateOptions: {
						readonly stopOnEos: true
						readonly signal: AbortSignal
						readonly temperature?: number
						readonly topP?: number
						readonly maxTokens?: number
					} = {
						stopOnEos: true,
						signal: abortController.signal,
					}

					if (temperature !== undefined) {
						(evaluateOptions as { temperature?: number }).temperature = temperature
					}
					if (topP !== undefined) {
						(evaluateOptions as { topP?: number }).topP = topP
					}
					if (maxTokens !== undefined) {
						(evaluateOptions as { maxTokens?: number }).maxTokens = maxTokens
					}

					// Generate response
					const generator = sequence.evaluate(tokens, evaluateOptions)
					const maxTokenLimit = generationOptions.maxTokens ?? defaultOptions?.maxTokens

					for await (const token of generator) {
						if (abortController.signal.aborted) {
							finishReason = 'stop'
							break
						}

						tokensGenerated++

						// Check if we hit the max tokens limit
						if (maxTokenLimit !== undefined && tokensGenerated >= maxTokenLimit) {
							finishReason = 'length'
							break
						}

						// Detokenize the token
						const text = model.detokenize([token])
						if (text) {
							accumulatedText += text
							emitToken(text)
						}
					}

					clearTimeout(timeoutId)

					// If we didn't hit max tokens or abort, it's a natural stop (EOS)
					if (finishReason === 'stop' && !abortController.signal.aborted) {
						finishReason = 'stop'
					}

					const result: GenerationResult = {
						text: accumulatedText,
						toolCalls,
						finishReason,
						aborted: abortController.signal.aborted,
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

					handleError(
						error instanceof AdapterError
							? error
							: new AdapterError(
								'SERVICE_ERROR',
								error instanceof Error ? error.message : 'Unknown error',
								undefined,
								error instanceof Error ? error : undefined,
							),
					)
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

/**
 * Convert Message array to node-llama-cpp chat history format.
 */
function convertMessagesToChatHistory(
	messages: readonly Message[],
): NodeLlamaCppChatHistoryItem[] {
	const history: NodeLlamaCppChatHistoryItem[] = []

	for (const msg of messages) {
		const content = typeof msg.content === 'string' ? msg.content : ''

		switch (msg.role) {
			case 'system':
				history.push({ type: 'system', text: content })
				break
			case 'user':
				history.push({ type: 'user', text: content })
				break
			case 'assistant':
				history.push({ type: 'model', response: [content] })
				break
			// Tool messages are handled differently - skip for now
		}
	}

	return history
}
