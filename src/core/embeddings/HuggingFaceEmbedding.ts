/**
 * HuggingFace Transformers Embedding Adapter
 *
 * Implements EmbeddingAdapterInterface for local embedding models
 * using @huggingface/transformers FeatureExtractionPipeline.
 *
 * IMPORTANT: @huggingface/transformers is NOT a runtime dependency.
 * Consumers must have @huggingface/transformers installed and pass the pipeline.
 */

import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
	AbortableOptions,
} from '@mikesaintsg/core'

import type {
	HuggingFaceEmbeddingAdapterOptions,
	HuggingFaceFeatureExtractionPipeline,
	HuggingFacePoolingStrategy,
} from '../../types.js'

/**
 * HuggingFace Embedding Adapter implementation.
 */
class HuggingFaceEmbedding implements EmbeddingAdapterInterface {
	readonly #pipeline: HuggingFaceFeatureExtractionPipeline
	readonly #modelName: string
	readonly #dimensions: number
	readonly #pooling: HuggingFacePoolingStrategy
	readonly #normalize: boolean

	constructor(options: HuggingFaceEmbeddingAdapterOptions) {
		this.#pipeline = options.pipeline
		this.#modelName = options.modelName
		this.#dimensions = options.dimensions
		this.#pooling = options.pooling ?? 'mean'
		this.#normalize = options.normalize ?? true
	}

	async embed(
		texts: readonly string[],
		_options?: AbortableOptions,
	): Promise<readonly Embedding[]> {
		if (texts.length === 0) {
			return []
		}

		// Call the pipeline with pooling and normalization options
		const tensor = await this.#pipeline(texts as string[], {
			pooling: this.#pooling,
			normalize: this.#normalize,
		})

		// Convert tensor to embeddings
		// After pooling, tensor shape is [batch_size, hidden_size]
		const data = tensor.tolist() as number[][]

		// Dispose tensor if possible
		if (tensor.dispose) {
			tensor.dispose()
		}

		// Convert each embedding to Float32Array
		return data.map((vec) => new Float32Array(vec))
	}

	getModelMetadata(): EmbeddingModelMetadata {
		return {
			provider: 'huggingface',
			model: this.#modelName,
			dimensions: this.#dimensions,
		}
	}
}

/**
 * Create a HuggingFace Transformers embedding adapter.
 *
 * @example
 * ```ts
 * import { pipeline } from '@huggingface/transformers'
 * import { createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'
 *
 * const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
 *
 * const embedding = createHuggingFaceEmbeddingAdapter({
 *   pipeline: extractor,
 *   modelName: 'all-MiniLM-L6-v2',
 *   dimensions: 384,
 * })
 *
 * const vectors = await embedding.embed(['Hello, world!'])
 * ```
 */
export function createHuggingFaceEmbeddingAdapter(
	options: HuggingFaceEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	return new HuggingFaceEmbedding(options)
}
