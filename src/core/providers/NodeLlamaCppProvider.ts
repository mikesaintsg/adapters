/**
 * node-llama-cpp Provider Adapter
 *
 * Implements ProviderAdapterInterface for local LLaMA models via node-llama-cpp.
 * Uses token-by-token streaming via the LlamaContext evaluate method.
 *
 * IMPORTANT: node-llama-cpp is NOT a runtime dependency. The consumer must
 * install node-llama-cpp and pass initialized context instances.
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
	NodeLlamaCppProviderAdapterOptions,
	StreamerAdapterInterface,
	NodeLlamaCppContext,
	NodeLlamaCppChatWrapper,
	NodeLlamaCppChatHistoryItem,
} from '../../types.js'

import { createStreamerAdapter } from '../streaming/Streamer.js'
import { createAdapterError } from '../../helpers.js'
import { DEFAULT_TIMEOUT_MS } from '../../constants.js'

/**
 * node-llama-cpp provider implementation.
 * Streams responses using token-by-token evaluation.
 */
class NodeLlamaCppProvider implements ProviderAdapterInterface {
	readonly #id: string
	readonly #context: NodeLlamaCppContext
	readonly #chatWrapper: NodeLlamaCppChatWrapper | undefined
	readonly #modelName: string
	readonly #timeout: number
	readonly #streamer: StreamerAdapterInterface

	constructor(options: NodeLlamaCppProviderAdapterOptions) {
		this.#id = crypto.randomUUID()
		this.#context = options.context
		this.#chatWrapper = options.chatWrapper
		this.#modelName = options.modelName ?? 'node-llama-cpp'
		this.#timeout = options.timeout ?? DEFAULT_TIMEOUT_MS
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
		const handle = new NodeLlamaCppStreamHandle(
			requestId,
			abortController,
			this.#streamer,
		)

		// Start async generation
		void this.#executeGeneration(messages, options, handle, abortController.signal)

		return handle
	}

	supportsTools(): boolean {
		return false // node-llama-cpp doesn't have built-in tool support
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
		handle: NodeLlamaCppStreamHandle,
		signal: AbortSignal,
	): Promise<void> {
		try {
			// Tokenize input
			const tokens = this.#tokenizeMessages(messages)

			// Set up timeout - use signal from parameters
			const timeout = options.timeout?.requestMs ?? this.#timeout
			const timeoutId = setTimeout(() => {
				handle.abort()
			}, timeout)

			// Get evaluation options - only include defined values
			const evalOptions = {
				...(options.temperature !== undefined && { temperature: options.temperature }),
				...(options.topP !== undefined && { topP: options.topP }),
				...(options.maxTokens !== undefined && { maxTokens: options.maxTokens }),
				signal,
			}

			// Generate tokens
			let generatedCount = 0
			const maxTokens = options.maxTokens ?? 2048
			const sequence = this.#context.getSequence()

			for await (const tokenId of sequence.evaluate(tokens, evalOptions)) {
				if (signal.aborted) {
					handle.setAborted()
					clearTimeout(timeoutId)
					return
				}

				// Detokenize the token
				const tokenText = this.#context.model.detokenize([tokenId])

				// Emit token
				handle.appendText(tokenText)
				this.#streamer.emit(tokenText)

				generatedCount++

				// Check for EOS token
				if (this.#context.model.tokens.eos !== undefined && tokenId === this.#context.model.tokens.eos) {
					handle.setFinishReason('stop')
					break
				}

				// Check max tokens
				if (generatedCount >= maxTokens) {
					handle.setFinishReason('length')
					break
				}
			}

			clearTimeout(timeoutId)
			handle.complete()
		} catch (error) {
			if (signal.aborted) {
				handle.setAborted()
			} else {
				const mappedError = this.#mapError(error instanceof Error ? error : new Error(String(error)))
				handle.setError(mappedError)
			}
		}
	}

	#tokenizeMessages(messages: readonly Message[]): readonly number[] {
		// If we have a chat wrapper, use it for proper formatting
		if (this.#chatWrapper !== undefined) {
			const chatHistory = this.#messagesToChatHistory(messages)
			const { contextText } = this.#chatWrapper.generateContextState({
				chatHistory,
			})
			return contextText.tokenize(this.#context.model)
		}

		// Fallback: simple concatenation
		const text = messages
			.map((m) => {
				if (typeof m.content === 'string') {
					return `${m.role}: ${m.content}`
				}
				return `${m.role}: ${JSON.stringify(m.content)}`
			})
			.join('\n')
			+ '\nassistant:'

		return this.#context.model.tokenize(text)
	}

	#messagesToChatHistory(messages: readonly Message[]): readonly NodeLlamaCppChatHistoryItem[] {
		const history: NodeLlamaCppChatHistoryItem[] = []

		for (const msg of messages) {
			const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)

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
			}
		}

		return history
	}

	#mapError(error: Error): Error {
		if (error.name === 'AbortError' || error.message.includes('aborted')) {
			return createAdapterError('NETWORK_ERROR', 'Generation aborted')
		}
		if (error.message.includes('context') || error.message.includes('memory')) {
			return createAdapterError('CONTEXT_LENGTH_ERROR', error.message)
		}
		if (error.message.includes('model') || error.message.includes('load')) {
			return createAdapterError('MODEL_NOT_FOUND_ERROR', error.message)
		}
		return createAdapterError('SERVICE_ERROR', error.message)
	}
}

/**
 * Stream handle for node-llama-cpp responses.
 * Implements StreamHandleInterface for async iteration and result collection.
 */
class NodeLlamaCppStreamHandle implements StreamHandleInterface {
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
			toolCalls: [], // node-llama-cpp doesn't support tool calls
			finishReason: this.#finishReason,
			aborted: this.#aborted,
		}
	}
}

/**
 * Creates a node-llama-cpp provider adapter.
 *
 * @param options - node-llama-cpp provider options
 * @returns Provider adapter instance
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
 * import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
 *
 * const llama = await getLlama()
 * const model = await llama.loadModel({ modelPath: './llama-3-8b.gguf' })
 * const context = await model.createContext()
 *
 * const provider = createNodeLlamaCppProviderAdapter({
 *   context,
 *   modelName: 'llama3',
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
export function createNodeLlamaCppProviderAdapter(
	options: NodeLlamaCppProviderAdapterOptions,
): ProviderAdapterInterface {
	return new NodeLlamaCppProvider(options)
}
