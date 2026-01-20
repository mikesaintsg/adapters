/**
 * Cohere reranker adapter implementation.
 * Implements RerankerAdapterInterface using Cohere API.
 */

import type { RerankerAdapterInterface, ScoredResult } from '@mikesaintsg/core'

import type {
	CohereRerankerAdapterOptions,
	CohereRerankResponse,
} from '../../types.js'
import { createAdapterError } from '../../helpers.js'
import {
	DEFAULT_COHERE_RERANK_MODEL,
	DEFAULT_COHERE_BASE_URL,
} from '../../constants.js'

/**
 * Cohere reranker adapter.
 * Uses Cohere's rerank API to reorder documents by relevance to a query.
 */
export class CohereReranker implements RerankerAdapterInterface {
	readonly #apiKey: string
	readonly #model: string
	readonly #baseURL: string

	constructor(options: CohereRerankerAdapterOptions) {
		this.#apiKey = options.apiKey
		this.#model = options.model ?? DEFAULT_COHERE_RERANK_MODEL
		this.#baseURL = options.baseURL ?? DEFAULT_COHERE_BASE_URL
	}

	async rerank(
		query: string,
		docs: readonly ScoredResult[],
	): Promise<readonly ScoredResult[]> {
		if (docs.length === 0) {
			return []
		}

		// Extract document content for reranking
		const documents = docs.map((doc) => doc.content)

		const response = await fetch(`${this.#baseURL}/rerank`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.#apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.#model,
				query,
				documents,
				top_n: docs.length,
				return_documents: false,
			}),
		})

		if (!response.ok) {
			throw this.#handleError(response.status)
		}

		const data = await response.json() as CohereRerankResponse

		// Map reranked results back to ScoredResult with updated scores
		return data.results.map((result) => {
			const original = docs[result.index]
			if (!original) {
				throw new Error(`Invalid index ${result.index} from Cohere rerank`)
			}
			return {
				...original,
				score: result.relevance_score,
			}
		})
	}

	getModelId(): string {
		return this.#model
	}

	#handleError(status: number): Error {
		switch (status) {
			case 401:
			case 403:
				return createAdapterError('AUTHENTICATION_ERROR', 'Invalid Cohere API key', {
					providerCode: String(status),
				})
			case 429:
				return createAdapterError('RATE_LIMIT_ERROR', 'Cohere rate limit exceeded')
			case 400:
				return createAdapterError('INVALID_REQUEST_ERROR', 'Invalid rerank request')
			case 404:
				return createAdapterError('MODEL_NOT_FOUND_ERROR', `Model ${this.#model} not found`)
			default:
				return createAdapterError('SERVICE_ERROR', `Cohere API error: ${status}`)
		}
	}
}
