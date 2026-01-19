/**
 * node-llama-cpp Embedding Adapter
 *
 * Implements EmbeddingAdapterInterface for local GGUF embedding models
 * using node-llama-cpp's LlamaEmbeddingContext.
 *
 * IMPORTANT: node-llama-cpp is NOT a runtime dependency.
 * Consumers must have node-llama-cpp installed and pass the required context.
 */

import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
	AbortableOptions,
} from '@mikesaintsg/core'

import type {
	NodeLlamaCppEmbeddingAdapterOptions,
	NodeLlamaCppEmbeddingContext,
} from '../../types.js'

/**
 * node-llama-cpp Embedding Adapter implementation.
 */
class NodeLlamaCppEmbedding implements EmbeddingAdapterInterface {
	readonly #embeddingContext: NodeLlamaCppEmbeddingContext
	readonly #modelName: string
	#dimensions: number | undefined

	constructor(options: NodeLlamaCppEmbeddingAdapterOptions) {
		this.#embeddingContext = options.embeddingContext
		this.#modelName = options.modelName ?? 'node-llama-cpp-embedding'
		this.#dimensions = options.dimensions ?? undefined
	}

	async embed(
		texts: readonly string[],
		options?: AbortableOptions,
	): Promise<readonly Embedding[]> {
		if (texts.length === 0) {
			return []
		}

		const embeddings: Embedding[] = []

		// Process one text at a time (no batch API in node-llama-cpp)
		for (const text of texts) {
			// Check for abort
			if (options?.signal?.aborted) {
				throw new Error('Aborted')
			}

			const result = await this.#embeddingContext.getEmbeddingFor(text)
			const embedding = new Float32Array(result.vector)
			embeddings.push(embedding)

			// Auto-detect dimensions from first embedding
			if (this.#dimensions === undefined) {
				this.#dimensions = embedding.length
			}
		}

		return embeddings
	}

	getModelMetadata(): EmbeddingModelMetadata {
		return {
			provider: 'node-llama-cpp',
			model: this.#modelName,
			dimensions: this.#dimensions ?? 0, // Will be populated after first embed
		}
	}
}

/**
 * Create a node-llama-cpp embedding adapter.
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
 * import { createNodeLlamaCppEmbeddingAdapter } from '@mikesaintsg/adapters'
 *
 * const llama = await getLlama()
 * const model = await llama.loadModel({ modelPath: './nomic-embed-text.gguf' })
 * const embeddingContext = await model.createEmbeddingContext()
 *
 * const embedding = createNodeLlamaCppEmbeddingAdapter({
 *   embeddingContext,
 *   modelName: 'nomic-embed-text',
 * })
 *
 * const vectors = await embedding.embed(['Hello, world!'])
 * ```
 */
export function createNodeLlamaCppEmbeddingAdapter(
	options: NodeLlamaCppEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	return new NodeLlamaCppEmbedding(options)
}
