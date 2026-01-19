/**
 * @mikesaintsg/adapters
 *
 * Zero-dependency adapter implementations for the @mikesaintsg ecosystem.
 *
 * This package provides:
 * - Provider adapters for LLM text generation (OpenAI, Anthropic, Ollama, etc.)
 * - Embedding adapters for vector generation
 * - Policy adapters for retry and rate limiting
 * - Enhancement adapters for caching, batching, and reranking
 * - Transform adapters for tool format conversion and similarity scoring
 * - Persistence adapters for IndexedDB, OPFS, and HTTP storage
 * - Bridge functions for connecting inference to contextprotocol
 *
 * All provider adapters stream natively with SSE parsing built-in.
 * Streaming is not opt-in — it is the native behavior.
 */

// ============================================================================
// Types (public API)
// ============================================================================

export type {
	// Unsubscribe type
	Unsubscribe,

	// Streamer adapter interface
	StreamerAdapterInterface,

	// Error types
	AdapterErrorCode,
	AdapterErrorData,

	// Provider adapter options
	OpenAIProviderAdapterOptions,
	AnthropicProviderAdapterOptions,
	OllamaProviderAdapterOptions,
	NodeLlamaCppProviderAdapterOptions,
	HuggingFaceProviderAdapterOptions,

	// Embedding adapter options
	OpenAIEmbeddingAdapterOptions,
	VoyageEmbeddingAdapterOptions,
	OllamaEmbeddingAdapterOptions,
	NodeLlamaCppEmbeddingAdapterOptions,
	HuggingFaceEmbeddingAdapterOptions,

	// Policy adapter options
	ExponentialRetryAdapterOptions,
	LinearRetryAdapterOptions,
	TokenBucketRateLimitAdapterOptions,
	SlidingWindowRateLimitAdapterOptions,

	// Enhancement adapter options
	LRUCacheAdapterOptions,
	TTLCacheAdapterOptions,
	IndexedDBCacheAdapterOptions,
	BatchAdapterOptions,
	CohereRerankerAdapterOptions,
	CrossEncoderRerankerAdapterOptions,

	// Transform adapter options
	OpenAIToolFormatAdapterOptions,
	AnthropicToolFormatAdapterOptions,

	// Persistence adapter options
	IndexedDBVectorPersistenceOptions,
	OPFSVectorPersistenceOptions,
	HTTPVectorPersistenceOptions,
	IndexedDBSessionPersistenceOptions,

	// Context builder adapter options
	DeduplicationAdapterOptions,
	TruncationAdapterOptions,
	PriorityAdapterOptions,
	PriorityWeights,

	// Model types
	OllamaChatModel,
	OllamaEmbeddingModel,
	VoyageEmbeddingModel,
	HuggingFaceTextGenerationModel,
	HuggingFaceEmbeddingModel,
	HuggingFacePoolingStrategy,
	OpenAIToolChoice,
	AnthropicToolChoice,

	// External dependency interfaces (for consumers to implement)
	NodeLlamaCppContext,
	NodeLlamaCppContextSequence,
	NodeLlamaCppModel,
	NodeLlamaCppEmbeddingContext,
	NodeLlamaCppEmbedding,
	NodeLlamaCppChatWrapper,
	NodeLlamaCppLlamaText,
	NodeLlamaCppChatHistoryItem,
	NodeLlamaCppEvaluateOptions,
	HuggingFaceFeatureExtractionPipeline,
	HuggingFaceFeatureExtractionOptions,
	HuggingFaceTextGenerationPipeline,
	HuggingFaceTextGenerationOptions,
	HuggingFaceTextGenerationOutput,
	HuggingFaceTensor,
	HuggingFacePreTrainedModel,
	HuggingFaceGenerateOptions,
	HuggingFaceGenerationConfig,
	HuggingFaceModelOutput,
	HuggingFaceTokenizer,
	HuggingFaceEncodedInput,
	HuggingFaceBaseStreamer,

	// Factory function types
	CreateStreamerAdapter,
	CreateOpenAIProviderAdapter,
	CreateAnthropicProviderAdapter,
	CreateOllamaProviderAdapter,
	CreateNodeLlamaCppProviderAdapter,
	CreateHuggingFaceProviderAdapter,
	CreateOpenAIEmbeddingAdapter,
	CreateVoyageEmbeddingAdapter,
	CreateOllamaEmbeddingAdapter,
	CreateNodeLlamaCppEmbeddingAdapter,
	CreateHuggingFaceEmbeddingAdapter,
	CreateExponentialRetryAdapter,
	CreateLinearRetryAdapter,
	CreateTokenBucketRateLimitAdapter,
	CreateSlidingWindowRateLimitAdapter,
	CreateLRUCacheAdapter,
	CreateTTLCacheAdapter,
	CreateIndexedDBCacheAdapter,
	CreateBatchAdapter,
	CreateCohereRerankerAdapter,
	CreateCrossEncoderRerankerAdapter,
	CreateOpenAIToolFormatAdapter,
	CreateAnthropicToolFormatAdapter,
	CreateCosineSimilarityAdapter,
	CreateDotSimilarityAdapter,
	CreateEuclideanSimilarityAdapter,
	CreateIndexedDBVectorPersistence,
	CreateOPFSVectorPersistence,
	CreateHTTPVectorPersistence,
	CreateIndexedDBSessionPersistence,
	CreateToolCallBridge,
	CreateRetrievalTool,
	CreateDeduplicationAdapter,
	CreatePriorityTruncationAdapter,
	CreateFIFOTruncationAdapter,
	CreateLIFOTruncationAdapter,
	CreateScoreTruncationAdapter,
	CreatePriorityAdapter,
} from './types.js'

// ============================================================================
// Helpers (public API)
// ============================================================================

export {
	isAdapterError,
	createAdapterError,
	narrowUnknown,
} from './helpers.js'

export type { AdapterError } from './helpers.js'

// ============================================================================
// Constants (public API)
// ============================================================================

export {
	// Provider defaults
	DEFAULT_OPENAI_MODEL,
	DEFAULT_OPENAI_BASE_URL,
	DEFAULT_ANTHROPIC_MODEL,
	DEFAULT_ANTHROPIC_BASE_URL,
	DEFAULT_OLLAMA_BASE_URL,
	DEFAULT_VOYAGE_BASE_URL,
	DEFAULT_COHERE_BASE_URL,

	// Retry defaults
	DEFAULT_RETRY_MAX_ATTEMPTS,
	DEFAULT_RETRY_INITIAL_DELAY_MS,
	DEFAULT_RETRY_MAX_DELAY_MS,
	DEFAULT_RETRY_BACKOFF_MULTIPLIER,
	DEFAULT_RETRY_LINEAR_DELAY_MS,

	// Rate limit defaults
	DEFAULT_RATE_LIMIT_RPM,
	DEFAULT_RATE_LIMIT_MAX_CONCURRENT,
	DEFAULT_RATE_LIMIT_BURST_SIZE,
	DEFAULT_RATE_LIMIT_WINDOW_MS,

	// Cache defaults
	DEFAULT_CACHE_MAX_SIZE,
	DEFAULT_CACHE_TTL_MS,
	DEFAULT_INDEXEDDB_CACHE_TTL_MS,

	// Batch defaults
	DEFAULT_BATCH_SIZE,
	DEFAULT_BATCH_DELAY_MS,

	// Timeout defaults
	DEFAULT_TIMEOUT_MS,
	DEFAULT_OLLAMA_TIMEOUT_MS,
	DEFAULT_NODE_LLAMA_CPP_TIMEOUT_MS,

	// Embedding defaults
	DEFAULT_OPENAI_EMBEDDING_MODEL,
	DEFAULT_VOYAGE_EMBEDDING_MODEL,
	DEFAULT_COHERE_RERANKER_MODEL,

	// Persistence defaults
	DEFAULT_INDEXEDDB_DOCUMENTS_STORE,
	DEFAULT_INDEXEDDB_METADATA_STORE,
	DEFAULT_INDEXEDDB_CACHE_STORE,
	DEFAULT_INDEXEDDB_SESSION_DATABASE,
	DEFAULT_INDEXEDDB_SESSION_STORE,
	DEFAULT_SESSION_TTL_MS,
	DEFAULT_OPFS_CHUNK_SIZE,

	// Error codes
	RETRYABLE_ERROR_CODES,
} from './constants.js'

// ============================================================================
// Factory Functions (public API)
// ============================================================================

export {
	// Streamer
	createStreamerAdapter,

	// Provider adapters
	createOpenAIProviderAdapter,
	createAnthropicProviderAdapter,
	createOllamaProviderAdapter,
	createNodeLlamaCppProviderAdapter,
	createHuggingFaceProviderAdapter,

	// Embedding adapters
	createOpenAIEmbeddingAdapter,
	createVoyageEmbeddingAdapter,
	createOllamaEmbeddingAdapter,
	createNodeLlamaCppEmbeddingAdapter,
	createHuggingFaceEmbeddingAdapter,

	// Policy adapters
	createExponentialRetryAdapter,
	createLinearRetryAdapter,
	createTokenBucketRateLimitAdapter,
	createSlidingWindowRateLimitAdapter,

	// Enhancement adapters
	createLRUCacheAdapter,
	createTTLCacheAdapter,
	createIndexedDBCacheAdapter,
	createBatchAdapter,
	createCohereRerankerAdapter,
	createCrossEncoderRerankerAdapter,

	// Transform adapters
	createOpenAIToolFormatAdapter,
	createAnthropicToolFormatAdapter,
	createCosineSimilarityAdapter,
	createDotSimilarityAdapter,
	createEuclideanSimilarityAdapter,

	// Persistence adapters
	createIndexedDBVectorPersistenceAdapter,
	createOPFSVectorPersistenceAdapter,
	createHTTPVectorPersistenceAdapter,
	createIndexedDBSessionPersistenceAdapter,

	// Bridge functions
	createToolCallBridge,
	createRetrievalTool,

	// Context builder adapters
	createDeduplicationAdapter,
	createPriorityTruncationAdapter,
	createFIFOTruncationAdapter,
	createLIFOTruncationAdapter,
	createScoreTruncationAdapter,
	createPriorityAdapter,
} from './factories.js'
