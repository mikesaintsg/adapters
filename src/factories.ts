/**
 * @mikesaintsg/adapters
 *
 * Factory functions for creating adapter instances.
 * All factories throw "Not implemented" until implementations are added.
 */

import type {
	// Transform adapter interfaces
	ToolFormatAdapterInterface,
	SimilarityAdapterInterface,
	// Persistence adapter interfaces
	VectorStorePersistenceAdapterInterface,
	SessionPersistenceInterface,
	// Bridge interfaces
	ToolCallBridgeInterface,
	ToolCallBridgeOptions,
	RetrievalToolInterface,
	RetrievalToolOptions,
	// Context builder adapter interfaces
	DeduplicationAdapterInterface,
	TruncationAdapterInterface,
	PriorityAdapterInterface,
} from '@mikesaintsg/core'

import type {
	// Transform options
	OpenAIToolFormatAdapterOptions,
	AnthropicToolFormatAdapterOptions,
	// Persistence options
	IndexedDBVectorPersistenceOptions,
	OPFSVectorPersistenceOptions,
	HTTPVectorPersistenceOptions,
	IndexedDBSessionPersistenceOptions,
	// Context builder options
	DeduplicationAdapterOptions,
	TruncationAdapterOptions,
	PriorityAdapterOptions,
} from './types.js'

// ============================================================================
// Streamer Adapter Factory
// ============================================================================

// Re-export from implementation
export { createStreamerAdapter } from './core/streaming/Streamer.js'

// ============================================================================
// Provider Adapter Factories
// ============================================================================

// Re-export from implementations
export { createOpenAIProviderAdapter } from './core/providers/OpenAIProvider.js'
export { createAnthropicProviderAdapter } from './core/providers/AnthropicProvider.js'
export { createOllamaProviderAdapter } from './core/providers/OllamaProvider.js'
export { createNodeLlamaCppProviderAdapter } from './core/providers/NodeLlamaCppProvider.js'
export { createHuggingFaceProviderAdapter } from './core/providers/HuggingFaceProvider.js'

// ============================================================================
// Embedding Adapter Factories
// ============================================================================

// Re-export from implementations
export { createOpenAIEmbeddingAdapter } from './core/embeddings/OpenAIEmbedding.js'
export { createVoyageEmbeddingAdapter } from './core/embeddings/VoyageEmbedding.js'
export { createOllamaEmbeddingAdapter } from './core/embeddings/OllamaEmbedding.js'
export { createNodeLlamaCppEmbeddingAdapter } from './core/embeddings/NodeLlamaCppEmbedding.js'
export { createHuggingFaceEmbeddingAdapter } from './core/embeddings/HuggingFaceEmbedding.js'

// ============================================================================
// Policy Adapter Factories
// ============================================================================

// Re-export from implementations
export { createExponentialRetryAdapter } from './core/policy/ExponentialRetry.js'
export { createLinearRetryAdapter } from './core/policy/LinearRetry.js'
export { createTokenBucketRateLimitAdapter } from './core/policy/TokenBucketRateLimit.js'
export { createSlidingWindowRateLimitAdapter } from './core/policy/SlidingWindowRateLimit.js'

// ============================================================================
// Enhancement Adapter Factories
// ============================================================================

// Re-export from implementations
export { createLRUCacheAdapter } from './core/enhancement/LRUCache.js'
export { createTTLCacheAdapter } from './core/enhancement/TTLCache.js'
export { createIndexedDBCacheAdapter } from './core/enhancement/IndexedDBCache.js'
export { createBatchAdapter } from './core/enhancement/Batch.js'
export { createCohereRerankerAdapter } from './core/enhancement/CohereReranker.js'
export { createCrossEncoderRerankerAdapter } from './core/enhancement/CrossEncoderReranker.js'

// ============================================================================
// Transform Adapter Factories
// ============================================================================

/**
 * Create an OpenAI tool format adapter.
 */
export function createOpenAIToolFormatAdapter(
	_options?: OpenAIToolFormatAdapterOptions,
): ToolFormatAdapterInterface {
	throw new Error('Not implemented: createOpenAIToolFormatAdapter')
}

/**
 * Create an Anthropic tool format adapter.
 */
export function createAnthropicToolFormatAdapter(
	_options?: AnthropicToolFormatAdapterOptions,
): ToolFormatAdapterInterface {
	throw new Error('Not implemented: createAnthropicToolFormatAdapter')
}

/**
 * Create a cosine similarity adapter.
 */
export function createCosineSimilarityAdapter(): SimilarityAdapterInterface {
	throw new Error('Not implemented: createCosineSimilarityAdapter')
}

/**
 * Create a dot product similarity adapter.
 */
export function createDotSimilarityAdapter(): SimilarityAdapterInterface {
	throw new Error('Not implemented: createDotSimilarityAdapter')
}

/**
 * Create a euclidean similarity adapter.
 */
export function createEuclideanSimilarityAdapter(): SimilarityAdapterInterface {
	throw new Error('Not implemented: createEuclideanSimilarityAdapter')
}

// ============================================================================
// Persistence Adapter Factories
// ============================================================================

/**
 * Create an IndexedDB vector persistence adapter.
 */
export function createIndexedDBVectorPersistenceAdapter(
	_options: IndexedDBVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	throw new Error('Not implemented: createIndexedDBVectorPersistenceAdapter')
}

/**
 * Create an OPFS vector persistence adapter.
 */
export function createOPFSVectorPersistenceAdapter(
	_options: OPFSVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	throw new Error('Not implemented: createOPFSVectorPersistenceAdapter')
}

/**
 * Create an HTTP vector persistence adapter.
 */
export function createHTTPVectorPersistenceAdapter(
	_options: HTTPVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	throw new Error('Not implemented: createHTTPVectorPersistenceAdapter')
}

/**
 * Create an IndexedDB session persistence adapter.
 */
export function createIndexedDBSessionPersistenceAdapter(
	_options?: IndexedDBSessionPersistenceOptions,
): SessionPersistenceInterface {
	throw new Error('Not implemented: createIndexedDBSessionPersistenceAdapter')
}

// ============================================================================
// Bridge Factories
// ============================================================================

/**
 * Create a tool call bridge for connecting inference to contextprotocol.
 */
export function createToolCallBridge(
	_options: ToolCallBridgeOptions,
): ToolCallBridgeInterface {
	throw new Error('Not implemented: createToolCallBridge')
}

/**
 * Create a retrieval tool for vector store queries.
 */
export function createRetrievalTool(
	_options: RetrievalToolOptions,
): RetrievalToolInterface {
	throw new Error('Not implemented: createRetrievalTool')
}

// ============================================================================
// Context Builder Adapter Factories
// ============================================================================

/**
 * Create a deduplication adapter for context building.
 */
export function createDeduplicationAdapter(
	_options?: DeduplicationAdapterOptions,
): DeduplicationAdapterInterface {
	throw new Error('Not implemented: createDeduplicationAdapter')
}

/**
 * Create a priority-based truncation adapter.
 */
export function createPriorityTruncationAdapter(
	_options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	throw new Error('Not implemented: createPriorityTruncationAdapter')
}

/**
 * Create a FIFO truncation adapter (oldest first).
 */
export function createFIFOTruncationAdapter(
	_options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	throw new Error('Not implemented: createFIFOTruncationAdapter')
}

/**
 * Create a LIFO truncation adapter (newest first).
 */
export function createLIFOTruncationAdapter(
	_options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	throw new Error('Not implemented: createLIFOTruncationAdapter')
}

/**
 * Create a score-based truncation adapter.
 */
export function createScoreTruncationAdapter(
	_options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	throw new Error('Not implemented: createScoreTruncationAdapter')
}

/**
 * Create a priority adapter for context building.
 */
export function createPriorityAdapter(
	_options?: PriorityAdapterOptions,
): PriorityAdapterInterface {
	throw new Error('Not implemented: createPriorityAdapter')
}
