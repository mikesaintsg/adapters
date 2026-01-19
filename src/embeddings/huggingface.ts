/**
 * @mikesaintsg/adapters
 *
 * HuggingFace Transformers embedding adapter for browser and Node.js.
 *
 * Uses @huggingface/transformers FeatureExtractionPipeline for generating
 * embeddings locally without API calls.
 *
 * IMPORTANT: @huggingface/transformers is a devDependency only. This adapter
 * uses minimal interfaces so consumers can pass initialized pipeline instances
 * without requiring @huggingface/transformers as a runtime dependency.
 */

import { AdapterError } from '../errors.js'
import {
	HUGGINGFACE_DEFAULT_POOLING,
	HUGGINGFACE_DEFAULT_NORMALIZE,
} from '../constants.js'
import type {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
} from '@mikesaintsg/core'
import type {
	HuggingFaceEmbeddingAdapterOptions,
	HuggingFacePoolingStrategy,
} from '../types.js'

/**
 * Create a HuggingFace Transformers embedding adapter.
 *
 * This adapter enables local embedding generation in the browser or Node.js
 * using @huggingface/transformers. The consumer must initialize the pipeline
 * and pass it to this adapter.
 *
 * @param options - HuggingFace adapter configuration
 * @returns An embedding adapter for HuggingFace Transformers
 *
 * @example
 * ```ts
 * import { pipeline } from '@huggingface/transformers'
 * import { createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'
 *
 * // Consumer initializes the pipeline (downloads model on first use)
 * const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
 *
 * // Pass to adapter
 * const embedding = createHuggingFaceEmbeddingAdapter({
 *   pipeline: extractor,
 *   modelName: 'all-MiniLM-L6-v2',
 *   dimensions: 384,
 * })
 *
 * const embeddings = await embedding.embed(['Hello, world!'])
 * // Returns Float32Array embeddings
 * ```
 */
export function createHuggingFaceEmbeddingAdapter(
	options: HuggingFaceEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		pipeline,
		modelName,
		dimensions,
		pooling = HUGGINGFACE_DEFAULT_POOLING as HuggingFacePoolingStrategy,
		normalize = HUGGINGFACE_DEFAULT_NORMALIZE,
	} = options

	if (!pipeline) {
		throw new AdapterError(
			'INVALID_REQUEST_ERROR',
			'HuggingFace pipeline is required. Create with: await pipeline("feature-extraction", modelName)',
		)
	}

	if (!modelName) {
		throw new AdapterError(
			'INVALID_REQUEST_ERROR',
			'Model name is required for HuggingFace adapter',
		)
	}

	if (!dimensions || dimensions <= 0) {
		throw new AdapterError(
			'INVALID_REQUEST_ERROR',
			'Valid dimensions are required for HuggingFace adapter',
		)
	}

	const metadata: EmbeddingModelMetadata = {
		provider: 'huggingface',
		model: modelName,
		dimensions,
	}

	return {
		async embed(texts: readonly string[], _options?: AbortableOptions): Promise<readonly Embedding[]> {
			if (texts.length === 0) {
				return []
			}

			try {
				// Call the pipeline with pooling and normalization options
				const output = await pipeline(texts, {
					pooling,
					normalize,
				})

				// Extract embeddings from tensor output
				// Output shape is [batch_size, hidden_size] when pooling is applied
				// or [batch_size, sequence_length, hidden_size] without pooling
				const outputDims = output.dims
				const outputData = output.data

				// Validate output dimensions
				if (outputDims.length < 2) {
					throw new AdapterError(
						'SERVICE_ERROR',
						`Unexpected tensor dimensions: ${outputDims.join('x')}`,
					)
				}

				const batchSize = outputDims[0] ?? 0
				const embeddings: Embedding[] = []

				// Handle different output shapes based on pooling
				if (outputDims.length === 2) {
					// Shape: [batch_size, hidden_size] - pooling was applied
					const hiddenSize = outputDims[1] ?? 0

					for (let i = 0; i < batchSize; i++) {
						const start = i * hiddenSize
						const embedding = new Float32Array(hiddenSize)
						for (let j = 0; j < hiddenSize; j++) {
							const value = outputData[start + j]
							embedding[j] = typeof value === 'bigint' ? Number(value) : (value ?? 0)
						}
						embeddings.push(embedding)
					}
				} else if (outputDims.length === 3) {
					// Shape: [batch_size, sequence_length, hidden_size] - no pooling applied
					// Apply mean pooling manually
					const seqLength = outputDims[1] ?? 0
					const hiddenSize = outputDims[2] ?? 0

					for (let i = 0; i < batchSize; i++) {
						const embedding = new Float32Array(hiddenSize)

						// Mean pool across sequence dimension
						for (let s = 0; s < seqLength; s++) {
							for (let h = 0; h < hiddenSize; h++) {
								const idx = i * seqLength * hiddenSize + s * hiddenSize + h
								const rawValue = outputData[idx]
								const value = typeof rawValue === 'bigint' ? Number(rawValue) : (rawValue ?? 0)
								embedding[h] = (embedding[h] ?? 0) + value / seqLength
							}
						}

						// Normalize if requested
						if (normalize) {
							let norm = 0
							for (let h = 0; h < hiddenSize; h++) {
								norm += (embedding[h] ?? 0) * (embedding[h] ?? 0)
							}
							norm = Math.sqrt(norm)
							if (norm > 0) {
								for (let h = 0; h < hiddenSize; h++) {
									embedding[h] = (embedding[h] ?? 0) / norm
								}
							}
						}

						embeddings.push(embedding)
					}
				} else {
					throw new AdapterError(
						'SERVICE_ERROR',
						`Unsupported tensor dimensions: ${outputDims.join('x')}`,
					)
				}

				// Dispose the tensor to free memory (if supported)
				if (typeof output.dispose === 'function') {
					output.dispose()
				}

				return embeddings
			} catch (error) {
				// Re-throw AdapterErrors
				if (error instanceof AdapterError) {
					throw error
				}

				// Wrap unknown errors
				throw new AdapterError(
					'SERVICE_ERROR',
					error instanceof Error ? error.message : 'HuggingFace embedding failed',
					undefined,
					error instanceof Error ? error : undefined,
				)
			}
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return metadata
		},
	}
}
