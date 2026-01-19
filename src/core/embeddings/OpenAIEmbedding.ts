/**
 * OpenAI Embedding Adapter
 *
 * Implements EmbeddingAdapterInterface for OpenAI's text-embedding API.
 * Supports text-embedding-3-small, text-embedding-3-large, and ada-002.
 */

import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
	AbortableOptions,
} from '@mikesaintsg/core'

import type {
	OpenAIEmbeddingAdapterOptions,
	OpenAIEmbeddingResponse,
	AdapterErrorCode,
} from '../../types.js'

import {
	DEFAULT_OPENAI_BASE_URL,
	DEFAULT_OPENAI_EMBEDDING_MODEL,
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
 * Get default dimensions for OpenAI embedding models.
 */
function getDefaultDimensions(model: string): number {
	if (model.includes('text-embedding-3-large')) {
		return 3072
	}
	if (model.includes('text-embedding-3-small')) {
		return 1536
	}
	if (model.includes('ada-002')) {
		return 1536
	}
	// Default fallback
	return 1536
}

/**
 * OpenAI Embedding Adapter implementation.
 */
class OpenAIEmbedding implements EmbeddingAdapterInterface {
	readonly #apiKey: string
	readonly #model: string
	readonly #baseURL: string
	readonly #dimensions: number | undefined

	constructor(options: OpenAIEmbeddingAdapterOptions) {
		this.#apiKey = options.apiKey
		this.#model = options.model ?? DEFAULT_OPENAI_EMBEDDING_MODEL
		this.#baseURL = options.baseURL ?? DEFAULT_OPENAI_BASE_URL
		this.#dimensions = options.dimensions ?? undefined
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

		// Add dimensions if specified (for text-embedding-3-* models)
		if (this.#dimensions !== undefined) {
			body.dimensions = this.#dimensions
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
			let message = `OpenAI API error: ${response.status}`
			let retryAfter: number | undefined

			try {
				const errorBody = await response.json() as { error?: { message?: string } }
				if (errorBody.error?.message) {
					message = errorBody.error.message
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

		const data = await response.json() as OpenAIEmbeddingResponse

		// Sort by index to ensure order matches input
		const sorted = [...data.data].sort((a, b) => a.index - b.index)

		// Convert to Float32Array
		return sorted.map((item) => new Float32Array(item.embedding))
	}

	getModelMetadata(): EmbeddingModelMetadata {
		const dimensions = this.#dimensions ?? getDefaultDimensions(this.#model)

		return {
			provider: 'openai',
			model: this.#model,
			dimensions,
		}
	}
}

/**
 * Create an OpenAI embedding adapter.
 *
 * @example
 * ```ts
 * const embedding = createOpenAIEmbeddingAdapter({
 *   apiKey: 'sk-...',
 *   model: 'text-embedding-3-small',
 * })
 *
 * const vectors = await embedding.embed(['Hello, world!'])
 * ```
 */
export function createOpenAIEmbeddingAdapter(
	options: OpenAIEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	return new OpenAIEmbedding(options)
}
