/**
 * HuggingFace Provider Adapter
 *
 * Implements ProviderAdapterInterface for HuggingFace Transformers models.
 * Uses TextStreamer internally for token-by-token streamers.
 *
 * IMPORTANT: @huggingface/transformers is NOT a runtime dependency. The consumer
 * must install @huggingface/transformers and pass initialized pipeline instances.
 */

import type {
	ProviderAdapterInterface,
	StreamHandleInterface,
	GenerationOptions,
	Message,
	ProviderCapabilities,
	StreamerAdapterInterface,
} from '@mikesaintsg/core'

import type {
	HuggingFaceProviderAdapterOptions,
	HuggingFaceTextGenerationPipeline,
	HuggingFaceTextGenerationOutput,
} from '../../types.js'

import { createAdapterError } from '../../helpers.js'
import { createStreamerAdapter } from '../../factories.js'
import { ProviderStreamHandle } from '../streamers/ProviderStreamHandle.js'

/**
 * HuggingFace provider implementation.
 * Streams responses using TextStreamer internally.
 */
export class HuggingFaceProvider implements ProviderAdapterInterface {
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

		// Create stream handle using shared ProviderStreamHandle
		const handle = new ProviderStreamHandle(
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
		handle: ProviderStreamHandle,
		signal: AbortSignal,
	): Promise<void> {
		try {
			// Build prompt from messages
			const prompt = this.#buildPrompt(messages)

			// Check if we have model and tokenizer for streamers
			if (this.#pipeline.model !== undefined && this.#pipeline.tokenizer !== undefined) {
				await this.#streamWithModel(prompt, options, handle, signal)
			} else {
				// Fallback to non-streamers generation
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
		handle: ProviderStreamHandle,
		signal: AbortSignal,
	): Promise<void> {
		const model = this.#pipeline.model
		const tokenizer = this.#pipeline.tokenizer

		if (model === undefined || tokenizer === undefined) {
			throw new Error('Model or tokenizer not available for streamers')
		}

		// Encode input
		const encodedInput = tokenizer(prompt)

		// Create internal streamer that emits to our streamer
		const internalStreamer = this.#createStreamer(tokenizer, handle, signal)

		// Generate with streamers - only include defined values
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
		handle: ProviderStreamHandle,
		signal: AbortSignal,
	): { put: (value: readonly (readonly bigint[])[]) => void; end: () => void } {
		return {
			put: (value: readonly (readonly bigint[])[]) => {
				if (signal.aborted) return

				// Decode each batch of tokens
				for (const tokenIds of value) {
					const text = tokenizer.decode(tokenIds, { skip_special_tokens: true })
					if (text !== '' && text !== undefined) {
						handle.emitToken(text)
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
		handle: ProviderStreamHandle,
	): Promise<void> {
		// Non-streamers fallback - only include defined values
		const result = await this.#pipeline(prompt, {
			max_new_tokens: options.maxTokens ?? 256,
			...(options.temperature !== undefined && { temperature: options.temperature }),
			...(options.topP !== undefined && { top_p: options.topP }),
			do_sample: options.temperature !== undefined && options.temperature > 0,
			return_full_text: false,
		})

		// Handle result (can be array or single output)
		const outputs: readonly HuggingFaceTextGenerationOutput[] = Array.isArray(result) ? result : [result]
		for (const output of outputs) {
			handle.emitToken(output.generated_text)
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
