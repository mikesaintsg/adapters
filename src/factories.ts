/**
 * @mikesaintsg/adapters
 *
 * Factory functions for creating adapter instances.
 */

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

// Re-export from implementations
export { createOpenAIToolFormatAdapter } from './core/transform/OpenAIToolFormat.js'
export { createAnthropicToolFormatAdapter } from './core/transform/AnthropicToolFormat.js'
export { createCosineSimilarityAdapter } from './core/transform/CosineSimilarity.js'
export { createDotSimilarityAdapter } from './core/transform/DotSimilarity.js'
export { createEuclideanSimilarityAdapter } from './core/transform/EuclideanSimilarity.js'

// ============================================================================
// Persistence Adapter Factories
// ============================================================================

// Re-export from implementations
export { createIndexedDBVectorPersistenceAdapter } from './core/persistence/IndexedDBVectorPersistence.js'
export { createOPFSVectorPersistenceAdapter } from './core/persistence/OPFSVectorPersistence.js'
export { createHTTPVectorPersistenceAdapter } from './core/persistence/HTTPVectorPersistence.js'
export { createIndexedDBSessionPersistenceAdapter } from './core/persistence/IndexedDBSessionPersistence.js'

// ============================================================================
// Bridge Factories
// ============================================================================

// Re-export Phase 6 factories from their implementation files
export { createToolCallBridge } from './core/bridge/ToolCallBridge.js'
export { createRetrievalTool } from './core/bridge/RetrievalTool.js'

// ============================================================================
// Context Builder Adapter Factories
// ============================================================================

// Re-export from implementation files
export { createDeduplicationAdapter } from './core/contextbuilder/Deduplication.js'
export { createPriorityTruncationAdapter } from './core/contextbuilder/PriorityTruncation.js'
export { createFIFOTruncationAdapter } from './core/contextbuilder/FIFOTruncation.js'
export { createLIFOTruncationAdapter } from './core/contextbuilder/LIFOTruncation.js'
export { createScoreTruncationAdapter } from './core/contextbuilder/ScoreTruncation.js'
export { createPriorityAdapter } from './core/contextbuilder/Priority.js'
