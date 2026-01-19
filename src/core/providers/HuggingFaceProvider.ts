/**
 * HuggingFace Provider Adapter
 *
 * Implements ProviderAdapterInterface for HuggingFace Transformers models.
 * Uses TextStreamer internally for token-by-token streaming.
 *
 * IMPORTANT: @huggingface/transformers is NOT a runtime dependency. The consumer
 * must install @huggingface/transformers and pass initialized pipeline instances.
 */

import type {
	ProviderAdapterInterface,
	StreamHandleInterface,
	GenerationOptions,
	GenerationResult,
	Message,
	ProviderCapabilities,
	FinishReason,
} from '@mikesaintsg/core'

import type {
	HuggingFaceProviderAdapterOptions,
	StreamerAdapterInterface,
	HuggingFaceTextGenerationPipeline,
} from '../../types.js'

import { createStreamerAdapter } from '../streaming/Streamer.js'
import { createAdapterError } from '../../helpers.js'

/**
 * HuggingFace provider implementation.
 * Streams responses using TextStreamer internally.
 */
class HuggingFaceProvider implements ProviderAdapterInterface {
	readonly #id: string
	readonly #pipeline: HuggingFaceTextGenerationPipeline
	readonly #modelName: string
	readonly #streamer: StreamerAdapterInterface

	constructor(options: HuggingFaceProviderAdapterOptions) {
		this.#id = crypto.randomUUID()
		this.#pipeline = options.pipeline
		this.#modelName = options.modelName
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

		// Create stream handle
		const handle = new HuggingFaceStreamHandle(
			requestId,
			abortController,
			this.#streamer,
		)

		// Start async generation
		void this.#executeGeneration(messages, options, handle, abortController.signal)

		return handle
	}

	supportsTools(): boolean {
		return false // HuggingFace Transformers doesn't have built-in tool support
	}

	supportsStreaming(): boolean {
		return true
	}

	getCapabilities(): ProviderCapabilities {
		return {
			supportsTools: false,
			supportsStreaming: true,
			supportsVision: false,
			supportsFunctions: false,
			models: [this.#modelName],
		}
	}

	async #executeGeneration(
		messages: readonly Message[],
		options: GenerationOptions,
		handle: HuggingFaceStreamHandle,
		signal: AbortSignal,
	): Promise<void> {
		try {
			// Build prompt from messages
			const prompt = this.#buildPrompt(messages)

			// Check if we have model and tokenizer for streaming
			if (this.#pipeline.model !== undefined && this.#pipeline.tokenizer !== undefined) {
				await this.#streamWithModel(prompt, options, handle, signal)
			} else {
				// Fallback to non-streaming generation
				await this.#generateWithPipeline(prompt, options, handle)
			}
		} catch (error) {
			if (signal.aborted) {
				handle.setAborted()
			} else {
				const mappedError = this.#mapError(error instanceof Error ? error : new Error(String(error)))
				handle.setError(mappedError)
			}
		}
	}

	async #streamWithModel(
		prompt: string,
		options: GenerationOptions,
		handle: HuggingFaceStreamHandle,
		signal: AbortSignal,
	): Promise<void> {
		const model = this.#pipeline.model
		const tokenizer = this.#pipeline.tokenizer

		if (model === undefined || tokenizer === undefined) {
			throw new Error('Model or tokenizer not available for streaming')
		}

		// Encode input
		const encodedInput = tokenizer(prompt)

		// Create internal streamer that emits to our streamer
		const internalStreamer = this.#createStreamer(tokenizer, handle, signal)

		// Generate with streaming - only include defined values
		await model.generate({
			inputs: encodedInput.input_ids,
			generation_config: {
				max_new_tokens: options.maxTokens ?? 256,
				...(options.temperature !== undefined && { temperature: options.temperature }),
				...(options.topP !== undefined && { top_p: options.topP }),
				do_sample: options.temperature !== undefined && options.temperature > 0,
			},
			streamer: internalStreamer,
		})

		handle.complete()
	}

	#createStreamer(
		tokenizer: NonNullable<HuggingFaceTextGenerationPipeline['tokenizer']>,
		handle: HuggingFaceStreamHandle,
		signal: AbortSignal,
	): { put: (value: readonly (readonly bigint[])[]) => void; end: () => void } {
		return {
			put: (value: readonly (readonly bigint[])[]) => {
				if (signal.aborted) return

				// Decode each batch of tokens
				for (const tokenIds of value) {
					const text = tokenizer.decode(tokenIds, { skip_special_tokens: true })
					if (text !== '' && text !== undefined) {
						handle.appendText(text)
						this.#streamer.emit(text)
					}
				}
			},
			end: () => {
				// Streaming complete
			},
		}
	}

	async #generateWithPipeline(
		prompt: string,
		options: GenerationOptions,
		handle: HuggingFaceStreamHandle,
	): Promise<void> {
		// Non-streaming fallback - only include defined values
		const result = await this.#pipeline(prompt, {
			max_new_tokens: options.maxTokens ?? 256,
			...(options.temperature !== undefined && { temperature: options.temperature }),
			...(options.topP !== undefined && { top_p: options.topP }),
			do_sample: options.temperature !== undefined && options.temperature > 0,
			return_full_text: false,
		})

		// Handle result (can be array or single output)
		const outputs = Array.isArray(result) ? result : [result]
		for (const output of outputs) {
			const text = (output as { generated_text?: string }).generated_text
			if (typeof text === 'string') {
				handle.appendText(text)
				this.#streamer.emit(text)
			}
		}

		handle.complete()
	}

	#buildPrompt(messages: readonly Message[]): string {
		// Simple chat format - could be customized per model
		return messages
			.map((m) => {
				const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
				switch (m.role) {
					case 'system':
						return `System: ${content}`
					case 'user':
						return `User: ${content}`
					case 'assistant':
						return `Assistant: ${content}`
					default:
						return content
				}
			})
			.join('\n')
			+ '\nAssistant:'
	}

	#mapError(error: Error): Error {
		if (error.name === 'AbortError' || error.message.includes('aborted')) {
			return createAdapterError('NETWORK_ERROR', 'Generation aborted')
		}
		if (error.message.includes('memory') || error.message.includes('OOM')) {
			return createAdapterError('CONTEXT_LENGTH_ERROR', error.message)
		}
		if (error.message.includes('model') || error.message.includes('load')) {
			return createAdapterError('MODEL_NOT_FOUND_ERROR', error.message)
		}
		return createAdapterError('SERVICE_ERROR', error.message)
	}
}

/**
 * Stream handle for HuggingFace responses.
 * Implements StreamHandleInterface for async iteration and result collection.
 */
class HuggingFaceStreamHandle implements StreamHandleInterface {
	readonly requestId: string
	readonly #abortController: AbortController
	readonly #streamer: StreamerAdapterInterface

	#text = ''
	#finishReason: FinishReason = 'stop'
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

	setFinishReason(reason: FinishReason): void {
		this.#finishReason = reason
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
		return {
			text: this.#text,
			toolCalls: [], // HuggingFace doesn't support tool calls
			finishReason: this.#finishReason,
			aborted: this.#aborted,
		}
	}
}

/**
 * Creates a HuggingFace provider adapter.
 *
 * @param options - HuggingFace provider options
 * @returns Provider adapter instance
 *
 * @example
 * ```ts
 * import { pipeline } from '@huggingface/transformers'
 * import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
 *
 * const generator = await pipeline('text-generation', 'Xenova/gpt2')
 *
 * const provider = createHuggingFaceProviderAdapter({
 *   pipeline: generator,
 *   modelName: 'gpt2',
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
export function createHuggingFaceProviderAdapter(
	options: HuggingFaceProviderAdapterOptions,
): ProviderAdapterInterface {
	return new HuggingFaceProvider(options)
}
