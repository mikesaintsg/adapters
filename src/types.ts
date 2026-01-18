/**
 * @mikesaintsg/adapters
 *
 * Type definitions for the adapters package.
 * This file contains adapter-specific options and configuration types.
 *
 * Architecture:
 * - Interface definitions come from @mikesaintsg/core
 * - Message/Generation types come from @mikesaintsg/inference
 * - Options types and adapter-specific types are defined here
 *
 * Implementation Recommendations:
 * - Error mapping should be comprehensive:
 *   - Map ALL provider error codes to `AdapterErrorCode`
 *   - Include `providerCode` (original provider error code) in error data
 *   - Include `retryAfter` (milliseconds) for rate limit errors
 *   - Include `context` for debugging information
 * - Rate limiting: Per-adapter with optional shared rate limiter
 * - Retry logic: In adapters via `withRetry()` wrapper
 * - SSE parsing: Shared via helpers/sse.ts for OpenAI, Anthropic, Ollama
 * - Token counting: Model-specific via TokenCounterOptions
 */

// ============================================================================
// Imports from @mikesaintsg/core
// ============================================================================

import type {
	Embedding,
	EmbeddingAdapterInterface,
	ToolFormatAdapterInterface,
	GenerationDefaults,
	VectorStorePersistenceAdapterInterface,
	MinimalDatabaseAccess,
	// Policy adapter interfaces
	RetryAdapterInterface,
	RateLimitAdapterInterface,
	// Enhancement adapter interfaces
	EmbeddingCacheAdapterInterface,
	BatchAdapterInterface,
	SimilarityAdapterInterface,
	RerankerAdapterInterface,
	// Context builder adapter interfaces
	DeduplicationAdapterInterface,
	TruncationAdapterInterface,
	PriorityAdapterInterface,
	DeduplicationStrategy,
	// Bridge interfaces
	ToolCallBridgeInterface,
	ToolCallBridgeOptions,
	RetrievalToolOptions,
	RetrievalToolInterface,
	SessionPersistenceInterface,
	// Provider adapter interface
	ProviderAdapterInterface,
} from '@mikesaintsg/core'

// ============================================================================
// Provider Adapter Options
// ============================================================================

/** OpenAI provider adapter options */
export interface OpenAIProviderAdapterOptions {
	/** OpenAI API key */
	readonly apiKey: string
	/** Model to use (default: 'gpt-4o') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.openai.com/v1') */
	readonly baseURL?: string
	/** Organization ID */
	readonly organization?: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
}

/** Anthropic provider adapter options */
export interface AnthropicProviderAdapterOptions {
	/** Anthropic API key */
	readonly apiKey: string
	/** Model to use (default: 'claude-3-5-sonnet-20241022') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.anthropic.com') */
	readonly baseURL?: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
}

// ============================================================================
// Embedding Adapter Options
// ============================================================================

/** OpenAI embedding adapter options */
export interface OpenAIEmbeddingAdapterOptions {
	/** OpenAI API key */
	readonly apiKey: string
	/** Model to use (default: 'text-embedding-3-small') */
	readonly model?: string
	/** Output dimensions (optional, for dimension reduction) */
	readonly dimensions?: number
	/** Base URL for API */
	readonly baseURL?: string
}

/** Voyage embedding adapter options */
export interface VoyageEmbeddingAdapterOptions {
	/** Voyage API key */
	readonly apiKey: string
	/** Model to use (default: 'voyage-2') */
	readonly model?: VoyageEmbeddingModel
	/** Base URL for API (default: 'https://api.voyageai.com/v1') */
	readonly baseURL?: string
	/** Input type for embeddings */
	readonly inputType?: 'query' | 'document'
}

/** Voyage embedding model options */
export type VoyageEmbeddingModel =
	| 'voyage-3'
	| 'voyage-3-lite'
	| 'voyage-code-3'
	| 'voyage-finance-2'
	| 'voyage-law-2'
	| 'voyage-multilingual-2'
	| 'voyage-2'
	| 'voyage-code-2'
	| (string & {})

/**
 * Anthropic embedding adapter options (placeholder).
 *
 * NOTE: Anthropic does not currently offer a public embedding API.
 * Voyage AI (https://www.voyageai.com/) is the recommended alternative,
 * as it has a partnership relationship with Anthropic.
 *
 * Use `VoyageEmbeddingAdapterOptions` instead for production embeddings.
 * This interface is reserved for future use if Anthropic releases an embedding API.
 */
export interface AnthropicEmbeddingAdapterOptions {
	/** Anthropic API key */
	readonly apiKey: string
	/** Model to use (reserved for future API) */
	readonly model?: string
	/** Base URL for API */
	readonly baseURL?: string
}

// ============================================================================
// Ollama Adapter Options (Local Development / Testing)
// ============================================================================

/**
 * Ollama provider adapter options.
 *
 * Ollama is the recommended way to test adapters during development
 * without incurring API costs. It runs models locally.
 *
 * @see https://ollama.ai/
 */
export interface OllamaProviderAdapterOptions {
	/** Base URL for Ollama API (default: 'http://localhost:11434') */
	readonly baseURL?: string
	/** Model to use (e.g., 'llama2', 'mistral', 'codellama') */
	readonly model: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
	/** Keep model loaded in memory (default: true) */
	readonly keepAlive?: boolean | string
	/** Request timeout in ms (default: 120000) */
	readonly timeout?: number
}

/**
 * Ollama embedding adapter options.
 *
 * Ollama supports local embedding generation for development/testing.
 */
export interface OllamaEmbeddingAdapterOptions {
	/** Base URL for Ollama API (default: 'http://localhost:11434') */
	readonly baseURL?: string
	/** Model to use for embeddings (e.g., 'nomic-embed-text', 'mxbai-embed-large') */
	readonly model: string
	/** Request timeout in ms (default: 60000) */
	readonly timeout?: number
}

/** Common Ollama embedding models */
export type OllamaEmbeddingModel =
	| 'nomic-embed-text'
	| 'mxbai-embed-large'
	| 'all-minilm'
	| 'snowflake-arctic-embed'
	| (string & {})

/** Common Ollama chat models */
export type OllamaChatModel =
	| 'llama2'
	| 'llama2:13b'
	| 'llama2:70b'
	| 'llama3'
	| 'llama3:8b'
	| 'llama3:70b'
	| 'mistral'
	| 'mixtral'
	| 'codellama'
	| 'deepseek-coder'
	| 'phi'
	| 'qwen'
	| 'gemma'
	| 'gemma2'
	| (string & {})

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limiter interface.
 * Allows coordinated rate limiting across adapters.
 */
export interface RateLimiterInterface {
	/** Acquire a slot, returns when available */
	acquire(): Promise<void>
	/** Release a slot */
	release(): void
	/** Get current state */
	getState(): RateLimiterState
	/** Set rate limit dynamically (e.g., from Retry-After header) */
	setLimit(requestsPerMinute: number): void
}

/** Rate limiter state */
export interface RateLimiterState {
	/** Current number of active requests */
	readonly activeRequests: number
	/** Maximum concurrent requests */
	readonly maxConcurrent: number
	/** Requests made in current window */
	readonly requestsInWindow: number
	/** Requests allowed per minute */
	readonly requestsPerMinute: number
	/** Time until window resets (ms) */
	readonly windowResetIn: number
}

/** Rate limiter options */
export interface RateLimiterOptions {
	/** Maximum requests per minute (default: 60) */
	readonly requestsPerMinute?: number
	/** Maximum concurrent requests (default: 10) */
	readonly maxConcurrent?: number
	/** Window size in ms (default: 60000) */
	readonly windowMs?: number
}

/** Provider-specific rate limiter options (per-adapter) */
export interface AdapterRateLimiterOptions extends RateLimiterOptions {
	/** Optional shared rate limiter (for cross-adapter coordination) */
	readonly sharedLimiter?: RateLimiterInterface
	/** Use shared limiter instead of per-adapter (default: false) */
	readonly useShared?: boolean
}

// ============================================================================
// Policy Adapter Options
// ============================================================================

/**
 * Exponential retry adapter options.
 * Creates a RetryAdapterInterface with exponential backoff.
 */
export interface ExponentialRetryAdapterOptions {
	/** Maximum number of retry attempts (default: 3) */
	readonly maxAttempts?: number
	/** Initial delay in ms (default: 1000) */
	readonly initialDelayMs?: number
	/** Maximum delay in ms (default: 30000) */
	readonly maxDelayMs?: number
	/** Exponential backoff multiplier (default: 2) */
	readonly backoffMultiplier?: number
	/** Add jitter to delays (default: true) */
	readonly jitter?: boolean
	/** Error codes that should trigger retry */
	readonly retryableCodes?: readonly AdapterErrorCode[]
	/** Called before each retry attempt */
	readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

/**
 * Linear retry adapter options.
 * Creates a RetryAdapterInterface with fixed delays.
 */
export interface LinearRetryAdapterOptions {
	/** Maximum number of retry attempts (default: 3) */
	readonly maxAttempts?: number
	/** Fixed delay in ms (default: 1000) */
	readonly delayMs?: number
	/** Error codes that should trigger retry */
	readonly retryableCodes?: readonly AdapterErrorCode[]
	/** Called before each retry attempt */
	readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

/** Default retryable error codes */
export const DEFAULT_RETRYABLE_CODES: readonly AdapterErrorCode[] = [
	'RATE_LIMIT_ERROR',
	'NETWORK_ERROR',
	'TIMEOUT_ERROR',
	'SERVICE_ERROR',
]

/**
 * Token bucket rate limit adapter options.
 * Creates a RateLimitAdapterInterface using token bucket algorithm.
 */
export interface TokenBucketRateLimitAdapterOptions {
	/** Maximum requests per minute (default: 60) */
	readonly requestsPerMinute?: number
	/** Maximum concurrent requests (default: 10) */
	readonly maxConcurrent?: number
	/** Burst size - tokens added per refill (default: 10) */
	readonly burstSize?: number
}

/**
 * Sliding window rate limit adapter options.
 * Creates a RateLimitAdapterInterface using sliding window algorithm.
 */
export interface SlidingWindowRateLimitAdapterOptions {
	/** Maximum requests per minute (default: 60) */
	readonly requestsPerMinute?: number
	/** Window size in ms (default: 60000) */
	readonly windowMs?: number
}

// ============================================================================
// Enhancement Adapter Options
// ============================================================================

/**
 * LRU cache adapter options.
 * Creates an EmbeddingCacheAdapterInterface with LRU eviction.
 */
export interface LRUCacheAdapterOptions {
	/** Maximum number of entries (default: 1000) */
	readonly maxSize?: number
	/** Time-to-live in ms (default: 3600000 = 1 hour) */
	readonly ttlMs?: number
	/** Callback when entry is evicted */
	readonly onEvict?: (text: string, embedding: Embedding) => void
}

/**
 * TTL cache adapter options.
 * Creates an EmbeddingCacheAdapterInterface with TTL-only expiration.
 */
export interface TTLCacheAdapterOptions {
	/** Time-to-live in ms (default: 3600000 = 1 hour) */
	readonly ttlMs?: number
}

/**
 * IndexedDB cache adapter options.
 * Creates a persistent EmbeddingCacheAdapterInterface using IndexedDB.
 */
export interface IndexedDBCacheAdapterOptions {
	/** Database access interface */
	readonly database: MinimalDatabaseAccess
	/** Store name for cache entries (default: 'embedding_cache') */
	readonly storeName?: string
	/** Time-to-live in ms (default: 604800000 = 7 days) */
	readonly ttlMs?: number
}

/**
 * Batch adapter options.
 * Creates a BatchAdapterInterface with standard settings.
 */
export interface BatchAdapterOptions {
	/** Maximum batch size (default: 100) */
	readonly batchSize?: number
	/** Delay between batches in ms (default: 50) */
	readonly delayMs?: number
	/** Deduplicate identical texts (default: true) */
	readonly deduplicate?: boolean
}

/**
 * Aggressive batch adapter options.
 * Creates a BatchAdapterInterface with larger batches and longer delays.
 */
export interface AggressiveBatchAdapterOptions {
	/** Maximum batch size (default: 500) */
	readonly batchSize?: number
	/** Delay between batches in ms (default: 200) */
	readonly delayMs?: number
	/** Deduplicate identical texts (default: true) */
	readonly deduplicate?: boolean
}

/**
 * Cohere reranker adapter options.
 * Creates a RerankerAdapterInterface using Cohere API.
 */
export interface CohereRerankerAdapterOptions {
	/** Cohere API key */
	readonly apiKey: string
	/** Model to use (default: 'rerank-english-v3.0') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.cohere.ai/v1') */
	readonly baseURL?: string
}

/**
 * Cross-encoder reranker adapter options.
 * Creates a RerankerAdapterInterface using a local cross-encoder model.
 */
export interface CrossEncoderRerankerAdapterOptions {
	/** Model identifier */
	readonly model: string
	/** Model path or URL */
	readonly modelPath?: string
}

// ============================================================================
// Model Multipliers (Token counting is owned by @mikesaintsg/inference)
// ============================================================================

/**
 * Model-specific token estimation multipliers.
 *
 * Token counting logic is owned by `@mikesaintsg/inference`.
 * This package provides model-specific multipliers as constants
 * that can be passed to inference's token counter for improved accuracy.
 */
export interface ModelTokenMultipliers {
	/** OpenAI models typically use ~4 chars/token */
	readonly 'gpt-4': number
	readonly 'gpt-4o': number
	readonly 'gpt-3.5-turbo': number
	/** Anthropic models may differ slightly */
	readonly 'claude-3-5-sonnet-20241022': number
	readonly 'claude-3-opus-20240229': number
	readonly 'claude-3-sonnet-20240229': number
	readonly 'claude-3-haiku-20240307': number
	/** Ollama models vary by base model */
	readonly 'llama2': number
	readonly 'llama3': number
	readonly 'mistral': number
	/** Index signature for other models */
	readonly [model: string]: number
}

/** Default model multipliers (chars per token) */
export const DEFAULT_MODEL_MULTIPLIERS: Partial<ModelTokenMultipliers> = {
	'gpt-4': 4,
	'gpt-4o': 4,
	'gpt-3.5-turbo': 4,
	'claude-3-5-sonnet-20241022': 3.5,
	'claude-3-opus-20240229': 3.5,
	'claude-3-sonnet-20240229': 3.5,
	'claude-3-haiku-20240307': 3.5,
	'llama2': 4,
	'llama3': 4,
	'mistral': 4,
}

// ============================================================================
// Tool Format Adapter Options
// ============================================================================

/** OpenAI tool choice type */
export type OpenAIToolChoice =
	| 'auto'
	| 'none'
	| 'required'
	| { readonly type: 'function'; readonly function: { readonly name: string } }

/** OpenAI tool format adapter options */
export interface OpenAIToolFormatAdapterOptions {
	/** Tool choice behavior */
	readonly toolChoice?: OpenAIToolChoice
}

/** Anthropic tool choice type */
export type AnthropicToolChoice =
	| 'auto'
	| 'any'
	| { readonly type: 'tool'; readonly name: string }

/** Anthropic tool format adapter options */
export interface AnthropicToolFormatAdapterOptions {
	/** Tool choice behavior */
	readonly toolChoice?: AnthropicToolChoice
}

// ============================================================================
// Session Persistence Options
// ============================================================================

/** IndexedDB session persistence options */
export interface IndexedDBSessionPersistenceOptions {
	/** Database name (default: 'mikesaintsg-sessions') */
	readonly databaseName?: string
	/** Store name (default: 'sessions') */
	readonly storeName?: string
	/** Time-to-live for sessions in ms (default: 7 days) */
	readonly ttlMs?: number
}

// ============================================================================
// VectorStore Persistence Options
// ============================================================================

/** IndexedDB vector persistence options */
export interface IndexedDBVectorPersistenceOptions {
	/** Database name */
	readonly databaseName: string
	/** Documents store name (default: 'documents') */
	readonly documentsStore?: string
	/** Metadata store name (default: 'metadata') */
	readonly metadataStore?: string
}

/** OPFS vector persistence options */
export interface OPFSVectorPersistenceOptions {
	/** Directory name in OPFS */
	readonly directoryName: string
	/** Chunk size for large files (default: 1MB) */
	readonly chunkSize?: number
}

/** HTTP vector persistence options */
export interface HTTPVectorPersistenceOptions {
	/** Base URL for API */
	readonly baseURL: string
	/** Additional headers */
	readonly headers?: Readonly<Record<string, string>>
	/** Request timeout in ms (default: 30000) */
	readonly timeout?: number
}

// ============================================================================
// Error Types
// ============================================================================

/** Adapter error codes */
export type AdapterErrorCode =
	| 'AUTHENTICATION_ERROR'
	| 'RATE_LIMIT_ERROR'
	| 'QUOTA_EXCEEDED_ERROR'
	| 'NETWORK_ERROR'
	| 'TIMEOUT_ERROR'
	| 'INVALID_REQUEST_ERROR'
	| 'MODEL_NOT_FOUND_ERROR'
	| 'CONTEXT_LENGTH_ERROR'
	| 'CONTENT_FILTER_ERROR'
	| 'SERVICE_ERROR'
	| 'UNKNOWN_ERROR'

/** Adapter error data */
export interface AdapterErrorData {
	/** Error code */
	readonly code: AdapterErrorCode
	/** Provider-specific error code */
	readonly providerCode?: string
	/** Retry after (for rate limits) in ms */
	readonly retryAfter?: number
	/** Additional context */
	readonly context?: Readonly<Record<string, unknown>>
}

// ============================================================================
// Factory Function Types
// ============================================================================

/** Factory function for OpenAI provider adapter */
export type CreateOpenAIProviderAdapter = (
	options: OpenAIProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for Anthropic provider adapter */
export type CreateAnthropicProviderAdapter = (
	options: AnthropicProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for OpenAI embedding adapter */
export type CreateOpenAIEmbeddingAdapter = (
	options: OpenAIEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for Voyage embedding adapter */
export type CreateVoyageEmbeddingAdapter = (
	options: VoyageEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for OpenAI tool format adapter */
export type CreateOpenAIToolFormatAdapter = (
	options?: OpenAIToolFormatAdapterOptions
) => ToolFormatAdapterInterface

/** Factory function for Anthropic tool format adapter */
export type CreateAnthropicToolFormatAdapter = (
	options?: AnthropicToolFormatAdapterOptions
) => ToolFormatAdapterInterface

/** Factory function for tool call bridge */
export type CreateToolCallBridge = (
	options: ToolCallBridgeOptions
) => ToolCallBridgeInterface

/** Factory function for retrieval tool */
export type CreateRetrievalTool = (
	options: RetrievalToolOptions
) => RetrievalToolInterface

/** Factory function for session persistence */
export type CreateIndexedDBSessionPersistence = (
	options?: IndexedDBSessionPersistenceOptions
) => SessionPersistenceInterface

/** Factory function for IndexedDB vector persistence */
export type CreateIndexedDBVectorPersistence = (
	options: IndexedDBVectorPersistenceOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for HTTP vector persistence */
export type CreateHTTPVectorPersistence = (
	options: HTTPVectorPersistenceOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for Ollama provider adapter */
export type CreateOllamaProviderAdapter = (
	options: OllamaProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for Ollama embedding adapter */
export type CreateOllamaEmbeddingAdapter = (
	options: OllamaEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for rate limiter */
export type CreateRateLimiter = (
	options?: RateLimiterOptions
) => RateLimiterInterface

// ============================================================================
// Policy Adapter Factory Types
// ============================================================================

/** Factory for exponential retry adapter */
export type CreateExponentialRetryAdapter = (
	options?: ExponentialRetryAdapterOptions
) => RetryAdapterInterface

/** Factory for linear retry adapter */
export type CreateLinearRetryAdapter = (
	options?: LinearRetryAdapterOptions
) => RetryAdapterInterface

/** Factory for no-retry adapter (explicit opt-out) */
export type CreateNoRetryAdapter = () => RetryAdapterInterface

/** Factory for token bucket rate limit adapter */
export type CreateTokenBucketRateLimitAdapter = (
	options?: TokenBucketRateLimitAdapterOptions
) => RateLimitAdapterInterface

/** Factory for sliding window rate limit adapter */
export type CreateSlidingWindowRateLimitAdapter = (
	options?: SlidingWindowRateLimitAdapterOptions
) => RateLimitAdapterInterface

/** Factory for no rate limit adapter (explicit opt-out) */
export type CreateNoRateLimitAdapter = () => RateLimitAdapterInterface

// ============================================================================
// Enhancement Adapter Factory Types
// ============================================================================

/** Factory for LRU cache adapter */
export type CreateLRUCacheAdapter = (
	options?: LRUCacheAdapterOptions
) => EmbeddingCacheAdapterInterface

/** Factory for TTL cache adapter */
export type CreateTTLCacheAdapter = (
	options?: TTLCacheAdapterOptions
) => EmbeddingCacheAdapterInterface

/** Factory for IndexedDB cache adapter */
export type CreateIndexedDBCacheAdapter = (
	options: IndexedDBCacheAdapterOptions
) => EmbeddingCacheAdapterInterface

/** Factory for no cache adapter (explicit opt-out) */
export type CreateNoCacheAdapter = () => EmbeddingCacheAdapterInterface

/** Factory for batch adapter */
export type CreateBatchAdapter = (
	options?: BatchAdapterOptions
) => BatchAdapterInterface

/** Factory for aggressive batch adapter */
export type CreateAggressiveBatchAdapter = (
	options?: AggressiveBatchAdapterOptions
) => BatchAdapterInterface

/** Factory for Cohere reranker adapter */
export type CreateCohereRerankerAdapter = (
	options: CohereRerankerAdapterOptions
) => RerankerAdapterInterface

/** Factory for cross-encoder reranker adapter */
export type CreateCrossEncoderRerankerAdapter = (
	options: CrossEncoderRerankerAdapterOptions
) => RerankerAdapterInterface

/** Factory for no reranker adapter (explicit opt-out) */
export type CreateNoRerankerAdapter = () => RerankerAdapterInterface

// ============================================================================
// Transform Adapter Factory Types
// ============================================================================

/** Factory for cosine similarity adapter */
export type CreateCosineSimilarityAdapter = () => SimilarityAdapterInterface

/** Factory for dot product similarity adapter */
export type CreateDotSimilarityAdapter = () => SimilarityAdapterInterface

/** Factory for euclidean similarity adapter */
export type CreateEuclideanSimilarityAdapter = () => SimilarityAdapterInterface

// ============================================================================
// Context Builder Adapter Factory Types
// ============================================================================

/** Deduplication adapter options */
export interface DeduplicationAdapterOptions {
	/** Strategy for selecting which frame to keep */
	readonly strategy?: DeduplicationStrategy
	/** Whether to preserve pinned frames */
	readonly preservePinned?: boolean
}

/** Factory for deduplication adapter */
export type CreateDeduplicationAdapter = (
	options?: DeduplicationAdapterOptions
) => DeduplicationAdapterInterface

/** Truncation adapter options */
export interface TruncationAdapterOptions {
	/** Whether to preserve system frames */
	readonly preserveSystem?: boolean
	/** Whether to preserve pinned frames */
	readonly preservePinned?: boolean
}

/** Factory for priority-based truncation adapter */
export type CreatePriorityTruncationAdapter = (
	options?: TruncationAdapterOptions
) => TruncationAdapterInterface

/** Factory for FIFO truncation adapter (oldest first) */
export type CreateFIFOTruncationAdapter = (
	options?: TruncationAdapterOptions
) => TruncationAdapterInterface

/** Factory for LIFO truncation adapter (newest first) */
export type CreateLIFOTruncationAdapter = (
	options?: TruncationAdapterOptions
) => TruncationAdapterInterface

/** Factory for score-based truncation adapter */
export type CreateScoreTruncationAdapter = (
	options?: TruncationAdapterOptions
) => TruncationAdapterInterface

/** Priority weights configuration */
export type PriorityWeights = Readonly<Record<string, number>>

/** Priority adapter options */
export interface PriorityAdapterOptions {
	/** Custom weights for each priority level */
	readonly weights?: PriorityWeights
}

/** Factory for priority adapter */
export type CreatePriorityAdapter = (
	options?: PriorityAdapterOptions
) => PriorityAdapterInterface

// ============================================================================
// API Response Types (Internal to Adapters)
// ============================================================================

/** OpenAI chat completion chunk */
export interface OpenAIChatCompletionChunk {
	readonly id: string
	readonly object: 'chat.completion.chunk'
	readonly created: number
	readonly model: string
	readonly choices: readonly OpenAIChatCompletionChunkChoice[]
}

/** OpenAI chat completion chunk choice */
export interface OpenAIChatCompletionChunkChoice {
	readonly index: number
	readonly delta: OpenAIChatCompletionDelta
	readonly finish_reason: string | null
}

/** OpenAI chat completion delta */
export interface OpenAIChatCompletionDelta {
	readonly role?: string
	readonly content?: string
	readonly tool_calls?: readonly OpenAIToolCallDelta[]
}

/** OpenAI tool call delta */
export interface OpenAIToolCallDelta {
	readonly index: number
	readonly id?: string
	readonly type?: 'function'
	readonly function?: {
		readonly name?: string
		readonly arguments?: string
	}
}

/** Anthropic message stream event */
export interface AnthropicMessageStreamEvent {
	readonly type: string
	readonly index?: number
	readonly content_block?: AnthropicContentBlock
	readonly delta?: AnthropicDelta
}

/** Anthropic content block */
export interface AnthropicContentBlock {
	readonly type: 'text' | 'tool_use'
	readonly text?: string
	readonly id?: string
	readonly name?: string
	readonly input?: unknown
}

/** Anthropic delta */
export interface AnthropicDelta {
	readonly type: string
	readonly text?: string
	readonly partial_json?: string
}

// ============================================================================
// Ollama API Response Types (Internal to Adapters)
// ============================================================================

/** Ollama chat completion request */
export interface OllamaChatRequest {
	readonly model: string
	readonly messages: readonly OllamaChatMessage[]
	readonly stream?: boolean
	readonly format?: 'json'
	readonly options?: OllamaModelOptions
	readonly keep_alive?: boolean | string
	readonly tools?: readonly OllamaTool[]
}

/** Ollama chat message */
export interface OllamaChatMessage {
	readonly role: 'system' | 'user' | 'assistant' | 'tool'
	readonly content: string
	readonly images?: readonly string[]
	readonly tool_calls?: readonly OllamaToolCall[]
}

/** Ollama model options */
export interface OllamaModelOptions {
	readonly temperature?: number
	readonly top_p?: number
	readonly top_k?: number
	readonly num_predict?: number
	readonly stop?: readonly string[]
	readonly seed?: number
}

/** Ollama chat completion response (non-streaming) */
export interface OllamaChatResponse {
	readonly model: string
	readonly created_at: string
	readonly message: OllamaChatMessage
	readonly done: boolean
	readonly total_duration?: number
	readonly load_duration?: number
	readonly prompt_eval_count?: number
	readonly prompt_eval_duration?: number
	readonly eval_count?: number
	readonly eval_duration?: number
}

/** Ollama chat completion chunk (streaming) */
export interface OllamaChatStreamChunk {
	readonly model: string
	readonly created_at: string
	readonly message: OllamaChatMessage
	readonly done: boolean
	readonly done_reason?: 'stop' | 'length' | 'load'
	readonly total_duration?: number
	readonly load_duration?: number
	readonly prompt_eval_count?: number
	readonly prompt_eval_duration?: number
	readonly eval_count?: number
	readonly eval_duration?: number
}

/** Ollama tool definition */
export interface OllamaTool {
	readonly type: 'function'
	readonly function: OllamaToolFunction
}

/** Ollama tool function definition */
export interface OllamaToolFunction {
	readonly name: string
	readonly description: string
	readonly parameters: unknown
}

/** Ollama tool call from response */
export interface OllamaToolCall {
	readonly id?: string
	readonly type?: 'function'
	readonly function: {
		readonly name: string
		readonly arguments: Readonly<Record<string, unknown>>
	}
}

/** Ollama embedding request */
export interface OllamaEmbeddingRequest {
	readonly model: string
	readonly input: string | readonly string[]
	readonly truncate?: boolean
	readonly keep_alive?: boolean | string
}

/** Ollama embedding response */
export interface OllamaEmbeddingResponse {
	readonly model: string
	readonly embeddings: readonly (readonly number[])[]
	readonly total_duration?: number
	readonly load_duration?: number
	readonly prompt_eval_count?: number
}

/** Ollama model info (from /api/show) */
export interface OllamaModelInfo {
	readonly modelfile: string
	readonly parameters: string
	readonly template: string
	readonly details: OllamaModelDetails
}

/** Ollama model details */
export interface OllamaModelDetails {
	readonly parent_model: string
	readonly format: string
	readonly family: string
	readonly families: readonly string[]
	readonly parameter_size: string
	readonly quantization_level: string
}

/** Ollama list models response */
export interface OllamaListModelsResponse {
	readonly models: readonly OllamaModelSummary[]
}

/** Ollama model summary */
export interface OllamaModelSummary {
	readonly name: string
	readonly model: string
	readonly modified_at: string
	readonly size: number
	readonly digest: string
	readonly details: OllamaModelDetails
}

// ============================================================================
// SSE Parsing Types (Shared across providers)
// ============================================================================

/**
 * SSE event from parsing.
 * Used by helpers/sse.ts for shared SSE parsing logic.
 */
export interface SSEEvent {
	readonly event?: string
	readonly data: string
	readonly id?: string
	readonly retry?: number
}

/**
 * SSE parser options.
 * SSE parsing is shared across OpenAI, Anthropic, and Ollama adapters.
 */
export interface SSEParserOptions {
	/** Called for each parsed event */
	readonly onEvent: (event: SSEEvent) => void
	/** Called on parse error */
	readonly onError?: (error: Error) => void
	/** Called when stream ends */
	readonly onEnd?: () => void
}

/**
 * SSE parser interface.
 * Stateful parser that handles chunked SSE data.
 */
export interface SSEParserInterface {
	/** Feed data chunk to parser */
	feed(chunk: string): void
	/** Signal end of stream */
	end(): void
	/** Reset parser state */
	reset(): void
}
