/**
 * @mikesaintsg/adapters
 *
 * Anthropic provider adapter.
 * Implements ProviderAdapterInterface for Anthropic Claude models.
 */

import type { ProviderCapabilities, ToolCall, ToolSchema, Unsubscribe } from '@mikesaintsg/core'
import type {
	GenerationOptions,
	GenerationResult,
	Message,
	ProviderAdapterInterface,
	StreamHandleInterface,
} from '@mikesaintsg/inference'
import type { AnthropicProviderAdapterOptions } from '../types.js'
import { ANTHROPIC_DEFAULT_CHAT_MODEL, ANTHROPIC_API_BASE_URL, ANTHROPIC_API_VERSION } from '../constants.js'
import { createSSEParser } from '../helpers/sse.js'
import { mapAnthropicError, mapNetworkError } from '../helpers/error-mapping.js'
import { createDoneIteratorResult } from '../helpers.js'

/** Anthropic message format */
interface AnthropicMessage {
	role: 'user' | 'assistant'
	content: string | readonly AnthropicContentBlock[]
}

/** Anthropic content block */
interface AnthropicContentBlock {
	type: 'text' | 'tool_use' | 'tool_result'
	text?: string
	id?: string
	name?: string
	input?: unknown
	tool_use_id?: string
	content?: string
	is_error?: boolean
}

/** Accumulated tool use during streaming */
interface AccumulatedToolUse {
	id: string
	name: string
	input: string
}

/**
 * Create an Anthropic provider adapter.
 *
 * @param options - Adapter options
 * @returns A provider adapter for Anthropic
 *
 * @example
 * ```ts
 * const adapter = createAnthropicProviderAdapter({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-3-5-sonnet-20241022',
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
export function createAnthropicProviderAdapter(
	options: AnthropicProviderAdapterOptions,
): ProviderAdapterInterface {
	const apiKey = options.apiKey
	const model = options.model ?? ANTHROPIC_DEFAULT_CHAT_MODEL
	const baseURL = options.baseURL ?? ANTHROPIC_API_BASE_URL

	return {
		getId(): string {
			return `anthropic:${model}`
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
				supportsVision: true,
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

			// Extract system prompt and convert messages
			let systemPrompt: string | undefined
			const anthropicMessages: AnthropicMessage[] = []

			for (const msg of messages) {
				if (msg.role === 'system') {
					systemPrompt = typeof msg.content === 'string' ? msg.content : undefined
					continue
				}

				if (msg.role === 'user') {
					anthropicMessages.push({
						role: 'user',
						content: typeof msg.content === 'string' ? msg.content : '',
					})
				} else if (msg.role === 'assistant') {
					// Handle tool calls from assistant (type: 'tool_calls')
					if (typeof msg.content === 'object' && 'type' in msg.content && msg.content.type === 'tool_calls') {
						const blocks: AnthropicContentBlock[] = msg.content.toolCalls.map(tc => ({
							type: 'tool_use' as const,
							id: tc.id,
							name: tc.name,
							input: tc.arguments,
						}))
						anthropicMessages.push({
							role: 'assistant',
							content: blocks,
						})
					} else {
						anthropicMessages.push({
							role: 'assistant',
							content: typeof msg.content === 'string' ? msg.content : '',
						})
					}
				} else if (msg.role === 'tool') {
					// Handle tool results - must be in user message with tool_result block
					if (typeof msg.content === 'object' && 'type' in msg.content && msg.content.type === 'tool_result') {
						const block: AnthropicContentBlock = {
							type: 'tool_result',
							tool_use_id: msg.content.callId,
							content: JSON.stringify(msg.content.result),
						}
						anthropicMessages.push({
							role: 'user',
							content: [block],
						})
					}
				}
			}

			// Build request body
			const requestModel = generationOptions.model ?? model
			const body: Record<string, unknown> = {
				model: requestModel,
				messages: anthropicMessages,
				stream: true,
				max_tokens: generationOptions.maxTokens ?? 4096,
			}

			if (systemPrompt) {
				body.system = systemPrompt
			}
			if (generationOptions.temperature !== undefined) {
				body.temperature = generationOptions.temperature
			}
			if (generationOptions.topP !== undefined) {
				body.top_p = generationOptions.topP
			}
			if (generationOptions.stop !== undefined) {
				body.stop_sequences = generationOptions.stop
			}
			if (generationOptions.tools && generationOptions.tools.length > 0) {
				body.tools = formatToolsForAnthropic(generationOptions.tools)
				if (generationOptions.toolChoice) {
					body.tool_choice = formatToolChoiceForAnthropic(generationOptions.toolChoice)
				}
			}

			// Start streaming
			void streamGeneration()

			async function streamGeneration(): Promise<void> {
				let accumulatedText = ''
				const accumulatedToolUses = new Map<number, AccumulatedToolUse>()
				let currentBlockIndex = 0
				let finishReason: GenerationResult['finishReason'] = 'stop'

				try {
					const response = await fetch(`${baseURL}/v1/messages`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-api-key': apiKey,
							'anthropic-version': ANTHROPIC_API_VERSION,
						},
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
						const error = mapAnthropicError(response, errorBody)
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
							try {
								const data = JSON.parse(event.data) as Record<string, unknown>
								processEvent(event.event ?? data.type as string, data)
							} catch {
								// Skip invalid JSON
							}
						},
					})

					function processEvent(eventType: string, data: Record<string, unknown>): void {
						switch (eventType) {
							case 'content_block_start': {
								const index = data.index as number
								const block = data.content_block as { type: string; id?: string; name?: string }
								if (block?.type === 'tool_use') {
									accumulatedToolUses.set(index, {
										id: block.id ?? '',
										name: block.name ?? '',
										input: '',
									})
								}
								currentBlockIndex = index
								break
							}
							case 'content_block_delta': {
								const delta = data.delta as { type: string; text?: string; partial_json?: string }
								if (delta?.type === 'text_delta' && delta.text) {
									accumulatedText += delta.text
									emitToken(delta.text)
								} else if (delta?.type === 'input_json_delta' && delta.partial_json) {
									const toolUse = accumulatedToolUses.get(currentBlockIndex)
									if (toolUse) {
										toolUse.input += delta.partial_json
									}
								}
								break
							}
							case 'message_delta': {
								const delta = data.delta as { stop_reason?: string }
								if (delta?.stop_reason) {
									finishReason = mapFinishReason(delta.stop_reason)
								}
								break
							}
							case 'message_stop':
							// Stream complete
								break
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
					for (const [, tu] of accumulatedToolUses) {
						let args: Record<string, unknown> = {}
						try {
							const parsed = JSON.parse(tu.input) as unknown
							if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
								args = parsed as Record<string, unknown>
							}
						} catch {
							// Keep empty args
						}
						toolCalls.push({
							id: tu.id,
							name: tu.name,
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

/** Format tools for Anthropic API */
function formatToolsForAnthropic(
	tools: readonly ToolSchema[],
): readonly { name: string; description: string; input_schema: unknown }[] {
	return tools.map(tool => ({
		name: tool.name,
		description: tool.description,
		input_schema: tool.parameters,
	}))
}

/** Format tool choice for Anthropic API */
function formatToolChoiceForAnthropic(
	choice: GenerationOptions['toolChoice'],
): unknown {
	if (!choice) return undefined
	if (choice === 'auto') return { type: 'auto' }
	if (choice === 'none') return { type: 'none' }
	if (choice === 'required') return { type: 'any' }
	if (typeof choice === 'object' && 'name' in choice) {
		return { type: 'tool', name: choice.name }
	}
	return undefined
}

/** Map Anthropic stop reason to internal format */
function mapFinishReason(reason: string): GenerationResult['finishReason'] {
	switch (reason) {
		case 'end_turn':
			return 'stop'
		case 'max_tokens':
			return 'length'
		case 'tool_use':
			return 'tool_calls'
		case 'stop_sequence':
			return 'stop'
		default:
			return 'stop'
	}
}
