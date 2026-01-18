/**
 * @mikesaintsg/adapters
 *
 * node-llama-cpp embedding adapter.
 * Implements EmbeddingAdapterInterface for node-llama-cpp local embeddings.
 *
 * IMPORTANT: This adapter uses `import type` for node-llama-cpp to avoid
 * runtime dependencies. Consumers must have node-llama-cpp installed and
 * pass the required instances at runtime. The compiled code contains NO
 * runtime references to node-llama-cpp.
 */

import type {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
} from '@mikesaintsg/core'
import type { NodeLlamaCppEmbeddingAdapterOptions } from '../types.js'
import { NODE_LLAMA_CPP_DEFAULT_EMBEDDING_MODEL_NAME } from '../constants.js'
import { AdapterError } from '../errors.js'

/**
 * Create a node-llama-cpp embedding adapter.
 *
 * This adapter allows generating embeddings using locally running models
 * via node-llama-cpp. The consumer must provide an initialized
 * LlamaEmbeddingContext.
 *
 * IMPORTANT: node-llama-cpp is NOT a runtime dependency of this package.
 * Consumers must install node-llama-cpp themselves and pass the required
 * instances. This design allows consumers who don't use node-llama-cpp
 * to avoid installing it.
 *
 * @param options - Adapter options including the initialized embedding context
 * @returns An embedding adapter for node-llama-cpp
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
 * import { createNodeLlamaCppEmbeddingAdapter } from '@mikesaintsg/adapters'
 *
 * // Consumer initializes node-llama-cpp
 * const llama = await getLlama()
 * const model = await llama.loadModel({ modelPath: './embedding-model.gguf' })
 * const embeddingContext = await model.createEmbeddingContext()
 *
 * // Pass to adapter
 * const adapter = createNodeLlamaCppEmbeddingAdapter({
 *   embeddingContext,
 *   modelName: 'nomic-embed-text',
 * })
 *
 * const embeddings = await adapter.embed(['Hello, world!'])
 * ```
 */
export function createNodeLlamaCppEmbeddingAdapter(
	options: NodeLlamaCppEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const embeddingContext = options.embeddingContext
	const modelName = options.modelName ?? NODE_LLAMA_CPP_DEFAULT_EMBEDDING_MODEL_NAME
	const dimensions = options.dimensions

	// Cache for detected dimensions
	let detectedDimensions: number | undefined

	return {
		async embed(
			texts: readonly string[],
			abortOptions?: AbortableOptions,
		): Promise<readonly Embedding[]> {
			if (texts.length === 0) {
				return []
			}

			// Check for abort before starting
			if (abortOptions?.signal?.aborted) {
				throw new AdapterError('TIMEOUT_ERROR', 'Request was aborted')
			}

			try {
				const embeddings: Embedding[] = []

				for (const text of texts) {
					// Check for abort between texts
					if (abortOptions?.signal?.aborted) {
						throw new AdapterError('TIMEOUT_ERROR', 'Request was aborted')
					}

					const embedding = await embeddingContext.getEmbeddingFor(text)
					const vector = new Float32Array(embedding.vector)
					embeddings.push(vector)

					// Detect dimensions from first embedding if not provided
					detectedDimensions ??= vector.length
				}

				return embeddings
			} catch (error) {
				// Re-throw AdapterErrors
				if (error instanceof AdapterError) {
					throw error
				}

				// Handle AbortError
				if (error instanceof Error && error.name === 'AbortError') {
					throw new AdapterError('TIMEOUT_ERROR', 'Request was aborted')
				}

				// Wrap unknown errors
				throw new AdapterError(
					'SERVICE_ERROR',
					error instanceof Error ? error.message : 'Unknown error',
					undefined,
					error instanceof Error ? error : undefined,
				)
			}
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return {
				provider: 'node-llama-cpp',
				model: modelName,
				dimensions: dimensions ?? detectedDimensions ?? 0,
			}
		},
	}
}
