/**
 * Ollama Embedding Adapter
 *
 * Implements EmbeddingAdapterInterface for Ollama's local embedding API.
 * Supports nomic-embed-text, mxbai-embed-large, and other models.
 */

import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
	AbortableOptions,
} from '@mikesaintsg/core'

import type {
	OllamaEmbeddingAdapterOptions,
	OllamaEmbeddingResponse,
} from '../../types.js'

import {
	DEFAULT_OLLAMA_EMBEDDING_DIMENSIONS,
	DEFAULT_OLLAMA_EMBEDDING_MODELS_DIMENSIONS,
	DEFAULT_OLLAMA_BASE_URL,
	DEFAULT_OLLAMA_TIMEOUT_MS,
} from '../../constants.js'

import { createAdapterError, mapHttpStatusToErrorCode } from '../../helpers.js'

/**
 * Ollama Embedding Adapter implementation.
 */
export class OllamaEmbedding implements EmbeddingAdapterInterface {
	readonly #model: string
	readonly #baseURL: string
	readonly #timeout: number

	constructor(options: OllamaEmbeddingAdapterOptions) {
		this.#model = options.model
		this.#baseURL = options.baseURL ?? DEFAULT_OLLAMA_BASE_URL
		this.#timeout = options.timeout ?? DEFAULT_OLLAMA_TIMEOUT_MS
	}

	async embed(
		texts: readonly string[],
		options?: AbortableOptions,
	): Promise<readonly Embedding[]> {
		if (texts.length === 0) {
			return []
		}

		// Create abort controller for timeout
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.#timeout)

		// Link external signal if provided
		if (options?.signal) {
			options.signal.addEventListener('abort', () => controller.abort())
		}

		const body = {
			model: this.#model,
			input: texts,
		}

		let response: Response

		try {
			response = await fetch(`${this.#baseURL}/api/embed`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			})
		} catch (error) {
			clearTimeout(timeoutId)
			if (error instanceof Error && error.name === 'AbortError') {
				if (options?.signal?.aborted) {
					throw error
				}
				throw createAdapterError('TIMEOUT_ERROR', 'Request timed out')
			}
			throw createAdapterError(
				'NETWORK_ERROR',
				`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		} finally {
			clearTimeout(timeoutId)
		}

		if (!response.ok) {
			const errorCode = mapHttpStatusToErrorCode(response.status)
			let message = `Ollama API error: ${response.status}`

			try {
				const errorBody = await response.json() as { error?: string }
				if (errorBody.error) {
					message = errorBody.error
				}
			} catch {
				// Ignore JSON parse errors
			}

			throw createAdapterError(errorCode, message)
		}

		const data = await response.json() as OllamaEmbeddingResponse

		// Convert to Float32Array (Ollama returns embeddings in same order as input)
		return data.embeddings.map((embedding) => new Float32Array(embedding))
	}

	getModelMetadata(): EmbeddingModelMetadata {
		return {
			provider: 'ollama',
			model: this.#model,
			dimensions: DEFAULT_OLLAMA_EMBEDDING_MODELS_DIMENSIONS[this.#model] ?? DEFAULT_OLLAMA_EMBEDDING_DIMENSIONS,
		}
	}
}
