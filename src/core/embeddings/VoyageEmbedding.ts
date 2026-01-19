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
	AdapterErrorCode,
} from '../../types.js'

import {
	DEFAULT_VOYAGE_BASE_URL,
	DEFAULT_VOYAGE_EMBEDDING_MODEL,
} from '../../constants.js'

import { createAdapterError } from '../../helpers.js'

/**
 * Map HTTP status to adapter error code.
 */
function mapStatusToErrorCode(status: number): AdapterErrorCode {
	switch (status) {
		case 401:
			return 'AUTHENTICATION_ERROR'
		case 429:
			return 'RATE_LIMIT_ERROR'
		case 400:
			return 'INVALID_REQUEST_ERROR'
		case 404:
			return 'MODEL_NOT_FOUND_ERROR'
		default:
			if (status >= 500) {
				return 'SERVICE_ERROR'
			}
			return 'UNKNOWN_ERROR'
	}
}

/**
 * Get default dimensions for Voyage embedding models.
 */
function getDefaultDimensions(model: string): number {
	if (model.includes('voyage-3-lite')) {
		return 512
	}
	if (model.includes('voyage-3') || model.includes('voyage-code-3')) {
		return 1024
	}
	if (model.includes('voyage-2') || model.includes('voyage-code-2')) {
		return 1024
	}
	if (model.includes('voyage-finance-2') || model.includes('voyage-law-2')) {
		return 1024
	}
	if (model.includes('voyage-multilingual-2')) {
		return 1024
	}
	// Default fallback
	return 1024
}

/**
 * Voyage Embedding Adapter implementation.
 */
class VoyageEmbedding implements EmbeddingAdapterInterface {
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
			const errorCode = mapStatusToErrorCode(response.status)
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
			dimensions: getDefaultDimensions(this.#model),
		}
	}
}

/**
 * Create a Voyage embedding adapter.
 *
 * @example
 * ```ts
 * const embedding = createVoyageEmbeddingAdapter({
 *   apiKey: 'pa-...',
 *   model: 'voyage-3',
 *   inputType: 'document',
 * })
 *
 * const vectors = await embedding.embed(['Hello, world!'])
 * ```
 */
export function createVoyageEmbeddingAdapter(
	options: VoyageEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	return new VoyageEmbedding(options)
}
