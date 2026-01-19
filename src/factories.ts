/**
 * @mikesaintsg/adapters
 *
 * Factory functions for creating adapter instances.
 * All factories throw "Not implemented" until implementations are added.
 */

import type {
	// Provider adapter interfaces - now exported from implementations
	EmbeddingAdapterInterface,
	// Policy adapter interfaces
	RetryAdapterInterface,
	RateLimitAdapterInterface,
	// Enhancement adapter interfaces
	EmbeddingCacheAdapterInterface,
	BatchAdapterInterface,
	RerankerAdapterInterface,
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
	// Embedding options
	OpenAIEmbeddingAdapterOptions,
	VoyageEmbeddingAdapterOptions,
	OllamaEmbeddingAdapterOptions,
	NodeLlamaCppEmbeddingAdapterOptions,
	HuggingFaceEmbeddingAdapterOptions,
	// Policy options
	ExponentialRetryAdapterOptions,
	LinearRetryAdapterOptions,
	TokenBucketRateLimitAdapterOptions,
	SlidingWindowRateLimitAdapterOptions,
	// Enhancement options
	LRUCacheAdapterOptions,
	TTLCacheAdapterOptions,
	IndexedDBCacheAdapterOptions,
	BatchAdapterOptions,
	CohereRerankerAdapterOptions,
	CrossEncoderRerankerAdapterOptions,
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

/**
 * Create an OpenAI embedding adapter.
 */
export function createOpenAIEmbeddingAdapter(
	_options: OpenAIEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	throw new Error('Not implemented: createOpenAIEmbeddingAdapter')
}

/**
 * Create a Voyage embedding adapter.
 */
export function createVoyageEmbeddingAdapter(
	_options: VoyageEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	throw new Error('Not implemented: createVoyageEmbeddingAdapter')
}

/**
 * Create an Ollama embedding adapter.
 */
export function createOllamaEmbeddingAdapter(
	_options: OllamaEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	throw new Error('Not implemented: createOllamaEmbeddingAdapter')
}

/**
 * Create a node-llama-cpp embedding adapter.
 */
export function createNodeLlamaCppEmbeddingAdapter(
	_options: NodeLlamaCppEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	throw new Error('Not implemented: createNodeLlamaCppEmbeddingAdapter')
}

/**
 * Create a HuggingFace Transformers embedding adapter.
 */
export function createHuggingFaceEmbeddingAdapter(
	_options: HuggingFaceEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	throw new Error('Not implemented: createHuggingFaceEmbeddingAdapter')
}

// ============================================================================
// Policy Adapter Factories
// ============================================================================

/**
 * Create an exponential retry adapter.
 */
export function createExponentialRetryAdapter(
	_options?: ExponentialRetryAdapterOptions,
): RetryAdapterInterface {
	throw new Error('Not implemented: createExponentialRetryAdapter')
}

/**
 * Create a linear retry adapter.
 */
export function createLinearRetryAdapter(
	_options?: LinearRetryAdapterOptions,
): RetryAdapterInterface {
	throw new Error('Not implemented: createLinearRetryAdapter')
}

/**
 * Create a token bucket rate limit adapter.
 */
export function createTokenBucketRateLimitAdapter(
	_options?: TokenBucketRateLimitAdapterOptions,
): RateLimitAdapterInterface {
	throw new Error('Not implemented: createTokenBucketRateLimitAdapter')
}

/**
 * Create a sliding window rate limit adapter.
 */
export function createSlidingWindowRateLimitAdapter(
	_options?: SlidingWindowRateLimitAdapterOptions,
): RateLimitAdapterInterface {
	throw new Error('Not implemented: createSlidingWindowRateLimitAdapter')
}

// ============================================================================
// Enhancement Adapter Factories
// ============================================================================

/**
 * Create an LRU cache adapter for embeddings.
 */
export function createLRUCacheAdapter(
	_options?: LRUCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	throw new Error('Not implemented: createLRUCacheAdapter')
}

/**
 * Create a TTL cache adapter for embeddings.
 */
export function createTTLCacheAdapter(
	_options?: TTLCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	throw new Error('Not implemented: createTTLCacheAdapter')
}

/**
 * Create an IndexedDB cache adapter for embeddings.
 */
export function createIndexedDBCacheAdapter(
	_options: IndexedDBCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	throw new Error('Not implemented: createIndexedDBCacheAdapter')
}

/**
 * Create a batch adapter for embedding requests.
 */
export function createBatchAdapter(
	_options?: BatchAdapterOptions,
): BatchAdapterInterface {
	throw new Error('Not implemented: createBatchAdapter')
}

/**
 * Create a Cohere reranker adapter.
 */
export function createCohereRerankerAdapter(
	_options: CohereRerankerAdapterOptions,
): RerankerAdapterInterface {
	throw new Error('Not implemented: createCohereRerankerAdapter')
}

/**
 * Create a cross-encoder reranker adapter.
 */
export function createCrossEncoderRerankerAdapter(
	_options: CrossEncoderRerankerAdapterOptions,
): RerankerAdapterInterface {
	throw new Error('Not implemented: createCrossEncoderRerankerAdapter')
}

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
