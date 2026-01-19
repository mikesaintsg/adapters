/**
 * @mikesaintsg/adapters
 *
 * HuggingFace Transformers provider adapter.
 * Implements ProviderAdapterInterface for HuggingFace Transformers text generation.
 *
 * IMPORTANT: This adapter uses `import type` for @huggingface/transformers to avoid
 * runtime dependencies. Consumers must have @huggingface/transformers installed and
 * pass the required pipeline at runtime. The compiled code contains NO
 * runtime references to @huggingface/transformers.
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
import type { HuggingFaceProviderAdapterOptions, HuggingFaceTextGenerationOutput } from '../types.js'
import { createDoneIteratorResult } from '../helpers.js'
import { AdapterError } from '../errors.js'

/**
 * Create a HuggingFace Transformers provider adapter.
 *
 * This adapter allows using HuggingFace models for text generation locally
 * in the browser or Node.js. The consumer must provide an initialized
 * TextGenerationPipeline.
 *
 * IMPORTANT: @huggingface/transformers is NOT a runtime dependency of this package.
 * Consumers must install @huggingface/transformers themselves and pass the required
 * pipeline. This design allows consumers who don't use HuggingFace to avoid installing it.
 *
 * @param options - Adapter options including the initialized pipeline
 * @returns A provider adapter for HuggingFace Transformers
 *
 * @example
 * ```ts
 * import { pipeline } from '@huggingface/transformers'
 * import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
 *
 * // Consumer initializes the pipeline
 * const generator = await pipeline('text-generation', 'Xenova/gpt2')
 *
 * // Pass to adapter
 * const adapter = createHuggingFaceProviderAdapter({
 *   pipeline: generator,
 *   modelName: 'gpt2',
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
export function createHuggingFaceProviderAdapter(
	options: HuggingFaceProviderAdapterOptions,
): ProviderAdapterInterface {
	const pipeline = options.pipeline
	const modelName = options.modelName
	const defaultOptions = options.defaultOptions

	if (!pipeline) {
		throw new AdapterError(
			'INVALID_REQUEST_ERROR',
			'HuggingFace pipeline is required. Create with: await pipeline("text-generation", modelName)',
		)
	}

	if (!modelName) {
		throw new AdapterError(
			'INVALID_REQUEST_ERROR',
			'Model name is required for HuggingFace adapter',
		)
	}

	return {
		getId(): string {
			return `huggingface:${modelName}`
		},

		supportsTools(): boolean {
			// HuggingFace text generation doesn't natively support tools
			return false
		},

		supportsStreaming(): boolean {
			// Text generation pipeline doesn't support streaming
			return false
		},

		getCapabilities(): ProviderCapabilities {
			return {
				supportsStreaming: false,
				supportsTools: false,
				supportsVision: false,
				supportsFunctions: false,
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

			// Start generation
			void runGeneration()

			async function runGeneration(): Promise<void> {
				let generatedText = ''
				const toolCalls: ToolCall[] = []
				const finishReason: GenerationResult['finishReason'] = 'stop'

				try {
					// Convert messages to a prompt string
					const prompt = formatMessagesAsPrompt(messages)

					// Build generation options
					const pipelineOptions = {
						max_new_tokens: generationOptions.maxTokens ?? defaultOptions?.maxTokens ?? 100,
						temperature: generationOptions.temperature ?? defaultOptions?.temperature ?? 1.0,
						do_sample: (generationOptions.temperature ?? defaultOptions?.temperature ?? 1.0) > 0,
						return_full_text: false,
						...(generationOptions.topP !== undefined ? { top_p: generationOptions.topP } : {}),
					}

					// Check if aborted before starting
					if (abortController.signal.aborted) {
						const result: GenerationResult = {
							text: '',
							toolCalls: [],
							finishReason: 'stop',
							aborted: true,
						}
						handleComplete(result)
						return
					}

					// Call the pipeline
					const output = await pipeline(prompt, pipelineOptions)

					// Handle aborted case
					if (abortController.signal.aborted) {
						const result: GenerationResult = {
							text: '',
							toolCalls: [],
							finishReason: 'stop',
							aborted: true,
						}
						handleComplete(result)
						return
					}

					// Extract generated text from output
					if (Array.isArray(output)) {
						// Multiple outputs - take the first one
						const firstOutput = output[0] as HuggingFaceTextGenerationOutput | undefined
						if (firstOutput && 'generated_text' in firstOutput) {
							generatedText = firstOutput.generated_text
						}
					} else if (output && 'generated_text' in output) {
						generatedText = output.generated_text
					}

					// Emit the text as a single token (since we don't have streaming)
					if (generatedText) {
						emitToken(generatedText)
					}

					const result: GenerationResult = {
						text: generatedText,
						toolCalls,
						finishReason,
						aborted: false,
					}

					handleComplete(result)
				} catch (error) {
					if (error instanceof Error && error.name === 'AbortError') {
						const result: GenerationResult = {
							text: generatedText,
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
								error instanceof Error ? error.message : 'HuggingFace generation failed',
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
							const nextToken = tokenQueue.shift()
							if (nextToken !== undefined) {
								return Promise.resolve({
									value: nextToken,
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
 * Format messages as a simple prompt string for text generation.
 *
 * @param messages - The messages to format
 * @returns A formatted prompt string
 */
function formatMessagesAsPrompt(messages: readonly Message[]): string {
	const parts: string[] = []

	for (const msg of messages) {
		const content = typeof msg.content === 'string' ? msg.content : ''

		switch (msg.role) {
			case 'system':
				parts.push(`System: ${content}`)
				break
			case 'user':
				parts.push(`User: ${content}`)
				break
			case 'assistant':
				parts.push(`Assistant: ${content}`)
				break
		}
	}

	// Add prompt for assistant response
	parts.push('Assistant:')

	return parts.join('\n\n')
}
