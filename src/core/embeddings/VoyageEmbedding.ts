/**
 * Voyage Embedding Adapter
 *
 * Implements EmbeddingAdapterInterface for Voyage AI's embedding API.
 * Supports voyage-3, voyage-3-lite, voyage-code-3, and other models.
 */

import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
	AbortableOptions,
} from '@mikesaintsg/core'

import type {
	VoyageEmbeddingAdapterOptions,
	VoyageEmbeddingResponse,
} from '../../types.js'

import {
	DEFAULT_VOYAGE_BASE_URL, DEFAULT_VOYAGE_EMBEDDING_DIMENSIONS,
	DEFAULT_VOYAGE_EMBEDDING_MODEL, DEFAULT_VOYAGE_EMBEDDING_MODELS_DIMENSIONS,
} from '../../constants.js'

import { createAdapterError, mapHttpStatusToErrorCode } from '../../helpers.js'

/**
 * Voyage Embedding Adapter implementation.
 */
export class VoyageEmbedding implements EmbeddingAdapterInterface {
	readonly #apiKey: string
	readonly #model: string
	readonly #baseURL: string
	readonly #inputType: 'query' | 'document' | undefined

	constructor(options: VoyageEmbeddingAdapterOptions) {
		this.#apiKey = options.apiKey
		this.#model = options.model ?? DEFAULT_VOYAGE_EMBEDDING_MODEL
		this.#baseURL = options.baseURL ?? DEFAULT_VOYAGE_BASE_URL
		this.#inputType = options.inputType ?? undefined
	}

	async embed(
		texts: readonly string[],
		options?: AbortableOptions,
	): Promise<readonly Embedding[]> {
		if (texts.length === 0) {
			return []
		}

		const body: Record<string, unknown> = {
			model: this.#model,
			input: texts,
		}

		// Add input_type if specified
		if (this.#inputType !== undefined) {
			body.input_type = this.#inputType
		}

		let response: Response

		try {
			response = await fetch(`${this.#baseURL}/embeddings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.#apiKey}`,
				},
				body: JSON.stringify(body),
				...(options?.signal ? { signal: options.signal } : {}),
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw error
			}
			throw createAdapterError(
				'NETWORK_ERROR',
				`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}

		if (!response.ok) {
			const errorCode = mapHttpStatusToErrorCode(response.status)
			let message = `Voyage API error: ${response.status}`
			let retryAfter: number | undefined

			try {
				const errorBody = await response.json() as { detail?: string }
				if (errorBody.detail) {
					message = errorBody.detail
				}
			} catch {
				// Ignore JSON parse errors
			}

			if (response.status === 429) {
				const retryHeader = response.headers.get('retry-after')
				if (retryHeader) {
					retryAfter = parseInt(retryHeader, 10) * 1000
				}
			}

			if (retryAfter !== undefined) {
				throw createAdapterError(errorCode, message, { retryAfter })
			}
			throw createAdapterError(errorCode, message)
		}

		const data = await response.json() as VoyageEmbeddingResponse

		// Sort by index to ensure order matches input
		const sorted = [...data.data].sort((a, b) => a.index - b.index)

		// Convert to Float32Array
		return sorted.map((item) => new Float32Array(item.embedding))
	}

	getModelMetadata(): EmbeddingModelMetadata {
		return {
			provider: 'voyage',
			model: this.#model,
			dimensions: DEFAULT_VOYAGE_EMBEDDING_MODELS_DIMENSIONS[this.#model] ?? DEFAULT_VOYAGE_EMBEDDING_DIMENSIONS,
		}
	}
}
