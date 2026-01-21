/**
 * HuggingFace Provider Adapter
 *
 * Implements ProviderAdapterInterface for HuggingFace Transformers models.
 * Uses TextStreamer internally for token-by-token streamers.
 * Supports tool calling with Qwen and other Hermes-style models.
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
	ToolCall,
	ToolSchema,
} from '@mikesaintsg/core'

import type {
	HuggingFaceProviderAdapterOptions,
	HuggingFaceTextGenerationPipeline,
	HuggingFaceTextGenerationOutput,
	HuggingFaceChatMessage,
	HuggingFaceTool,
} from '../../types.js'

import { createAdapterError } from '../../helpers.js'
import { createStreamerAdapter } from '../../factories.js'
import { ProviderStreamHandle } from '../streamers/ProviderStreamHandle.js'

/**
 * HuggingFace provider implementation.
 * Streams responses using TextStreamer internally.
 * Supports tool calling with Qwen and Hermes-style models.
 */
export class HuggingFaceProvider implements ProviderAdapterInterface {
	readonly #id: string
	readonly #pipeline: HuggingFaceTextGenerationPipeline
	readonly #modelName: string
	readonly #streamer: StreamerAdapterInterface
	readonly #enableTools: boolean

	constructor(options: HuggingFaceProviderAdapterOptions) {
		this.#id = crypto.randomUUID()
		this.#pipeline = options.pipeline
		this.#modelName = options.modelName
		this.#streamer = options.streamer ?? createStreamerAdapter()
		this.#enableTools = options.enableTools ?? false
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
		return this.#enableTools && this.#pipeline.tokenizer?.apply_chat_template !== undefined
	}

	supportsStreaming(): boolean {
		return true
	}

	getCapabilities(): ProviderCapabilities {
		return {
			supportsTools: this.supportsTools(),
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
			const prompt = this.#buildPrompt(messages, options.tools)

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
		const internalStreamer = this.#createStreamer(tokenizer, handle, signal, options.tools)

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
		tools?: readonly ToolSchema[],
	): { put: (value: readonly (readonly bigint[])[]) => void; end: () => void } {
		let accumulatedText = ''

		return {
			put: (value: readonly (readonly bigint[])[]) => {
				if (signal.aborted) return

				// Decode each batch of tokens
				for (const tokenIds of value) {
					const text = tokenizer.decode(tokenIds, { skip_special_tokens: true })
					if (text !== '' && text !== undefined) {
						accumulatedText += text
						handle.emitToken(text)
					}
				}
			},
			end: () => {
				// If tools are enabled, try to parse tool calls from accumulated text
				if (tools !== undefined && tools.length > 0) {
					const toolCalls = this.#parseToolCalls(accumulatedText)
					if (toolCalls.length > 0) {
						handle.setToolCalls(toolCalls)
					}
				}
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
		let fullText = ''
		for (const output of outputs) {
			handle.emitToken(output.generated_text)
			fullText += output.generated_text
		}

		// Parse tool calls if tools provided
		if (options.tools !== undefined && options.tools.length > 0) {
			const toolCalls = this.#parseToolCalls(fullText)
			if (toolCalls.length > 0) {
				handle.setToolCalls(toolCalls)
			}
		}

		handle.complete()
	}

	#buildPrompt(messages: readonly Message[], tools?: readonly ToolSchema[]): string {
		const tokenizer = this.#pipeline.tokenizer

		// If we have apply_chat_template and tools, use it
		if (tokenizer?.apply_chat_template !== undefined && this.#enableTools) {
			const chatMessages = this.#convertToChatMessages(messages)
			const hfTools = tools !== undefined ? this.#convertToHFTools(tools) : undefined

			try {
				const result = tokenizer.apply_chat_template(chatMessages, {
					...(hfTools !== undefined && { tools: hfTools }),
					add_generation_prompt: true,
					tokenize: false,
				})
				if (typeof result === 'string') {
					return result
				}
			} catch {
				// Fall through to simple format if apply_chat_template fails
			}
		}

		// Fallback: Simple chat format
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
					case 'tool':
						return `Tool: ${content}`
					default:
						return content
				}
			})
			.join('\n')
			+ '\nAssistant:'
	}

	#convertToChatMessages(messages: readonly Message[]): readonly HuggingFaceChatMessage[] {
		return messages.map((m): HuggingFaceChatMessage => {
			const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
			const role = m.role === 'tool' ? 'tool' : m.role

			return {
				role,
				content,
			}
		})
	}

	#convertToHFTools(tools: readonly ToolSchema[]): readonly HuggingFaceTool[] {
		return tools.map((t): HuggingFaceTool => ({
			type: 'function',
			function: {
				name: t.name,
				description: t.description,
				parameters: {
					type: 'object',
					properties: this.#convertProperties(t.parameters?.properties ?? {}),
					required: t.parameters?.required,
				},
			},
		}))
	}

	#convertProperties(props: Record<string, unknown>): Record<string, { type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'; description?: string; enum?: readonly string[] }> {
		const result: Record<string, { type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'; description?: string; enum?: readonly string[] }> = {}

		for (const [key, value] of Object.entries(props)) {
			if (typeof value === 'object' && value !== null) {
				const prop = value as Record<string, unknown>
				const propType = prop.type as string
				const validType = this.#isValidPropertyType(propType) ? propType : 'string'
				result[key] = {
					type: validType,
					...(prop.description !== undefined && { description: prop.description as string }),
					...(prop.enum !== undefined && { enum: prop.enum as readonly string[] }),
				}
			}
		}

		return result
	}

	#isValidPropertyType(type: string): type is 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' {
		return ['string', 'number', 'integer', 'boolean', 'array', 'object'].includes(type)
	}

	/**
	 * Parse tool calls from Hermes-style output.
	 * Format: <tool_call>\n{"name": "func", "arguments": {...}}\n</tool_call>
	 */
	#parseToolCalls(text: string): readonly ToolCall[] {
		const toolCalls: ToolCall[] = []
		const toolCallRegex = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g

		let match: RegExpExecArray | null
		while ((match = toolCallRegex.exec(text)) !== null) {
			try {
				const jsonStr = match[1]
				if (jsonStr === undefined) continue

				const parsed = JSON.parse(jsonStr) as { name?: string; arguments?: Record<string, unknown> }
				if (typeof parsed.name === 'string') {
					const args = parsed.arguments
					toolCalls.push({
						id: crypto.randomUUID(),
						name: parsed.name,
						arguments: (typeof args === 'object' && args !== null) ? args as Readonly<Record<string, unknown>> : {},
					})
				}
			} catch {
				// Skip malformed tool calls
			}
		}

		return toolCalls
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
