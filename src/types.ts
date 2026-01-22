/**
 * @mikesaintsg/adapters
 *
 * Type definitions for the adapters package.
 * This file contains adapter-specific options and configuration types.
 *
 * Organization:
 * 1. Core Imports from @mikesaintsg/core
 * 2. Error Types
 * 3. Provider Adapter Options
 * 4. Embedding Adapter Options
 * 5. Policy Adapter Options
 * 6. Enhancement Adapter Options
 * 7. Transform Adapter Options
 * 8. Persistence Adapter Options
 * 9. Context Builder Adapter Options
 * 10. Streaming Adapter Options
 * 11. External Dependency Interfaces (Minimal)
 * 12. API Response Types (Internal)
 * 13. Factory Function Types
 */

// ============================================================================
// 1. Imports from @mikesaintsg/core
// ============================================================================

import type {
	Embedding,
	EmbeddingAdapterInterface,
	ToolFormatAdapterInterface,
	GenerationDefaults,
	VectorStorePersistenceAdapterInterface,
	MinimalDatabaseAccess,
	MinimalDirectoryAccess,
	RetryAdapterInterface,
	RateLimitAdapterInterface,
	EmbeddingCacheAdapterInterface,
	BatchAdapterInterface,
	SimilarityAdapterInterface,
	RerankerAdapterInterface,
	DeduplicationAdapterInterface,
	TruncationAdapterInterface,
	PriorityAdapterInterface,
	DeduplicationStrategy,
	FramePriority,
	SessionPersistenceInterface,
	ProviderAdapterInterface,
	StreamerAdapterInterface,
	SSEParserAdapterInterface,
	SerializedSession,
	EventStorePersistenceAdapterInterface,
	WeightPersistenceAdapterInterface,
	ExportedPredictiveGraph,
	CircuitBreakerAdapterInterface,
	CircuitBreakerConfig,
	TelemetryAdapterInterface,
	LogLevel,
} from '@mikesaintsg/core'

// ============================================================================
// 2. Error Types
// ============================================================================

/** Cache statistics */
export interface CacheStats {
	readonly hits: number
	readonly misses: number
	readonly size: number
	readonly maxSize?: number
}

/** Adapter error codes for standardized error handling */
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

/** Adapter error data for structured error information */
export interface AdapterErrorData {
	readonly code: AdapterErrorCode
	readonly providerCode?: string
	readonly retryAfter?: number
	readonly context?: Readonly<Record<string, unknown>>
}

// ============================================================================
// 3. Provider Adapter Options
// ============================================================================

/** OpenAI provider adapter options */
export interface OpenAIProviderAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
	readonly organization?: string
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: StreamerAdapterInterface
	readonly sseParser?: SSEParserAdapterInterface
}

/** Anthropic provider adapter options */
export interface AnthropicProviderAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: StreamerAdapterInterface
	readonly sseParser?: SSEParserAdapterInterface
}

/** Ollama provider adapter options */
export interface OllamaProviderAdapterOptions {
	readonly model: string
	readonly baseURL?: string
	readonly keepAlive?: boolean | string
	readonly timeout?: number
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: StreamerAdapterInterface
}

/** Common Ollama chat models */
export type OllamaChatModel =
	| 'llama2' | 'llama2:13b' | 'llama2:70b'
	| 'llama3' | 'llama3:8b' | 'llama3:70b'
	| 'mistral' | 'mixtral' | 'codellama'
	| 'deepseek-coder' | 'phi' | 'qwen' | 'gemma' | 'gemma2'
	| (string & {})

// ============================================================================
// 4. Embedding Adapter Options
// ============================================================================

/** OpenAI embedding adapter options */
export interface OpenAIEmbeddingAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly dimensions?: number
	readonly baseURL?: string
}

/** Voyage embedding adapter options */
export interface VoyageEmbeddingAdapterOptions {
	readonly apiKey: string
	readonly model?: VoyageEmbeddingModel
	readonly baseURL?: string
	readonly inputType?: 'query' | 'document'
}

/** Voyage embedding model options */
export type VoyageEmbeddingModel =
	| 'voyage-3' | 'voyage-3-lite' | 'voyage-code-3'
	| 'voyage-finance-2' | 'voyage-law-2' | 'voyage-multilingual-2'
	| 'voyage-2' | 'voyage-code-2'
	| (string & {})

/** Ollama embedding adapter options */
export interface OllamaEmbeddingAdapterOptions {
	readonly model: string
	readonly baseURL?: string
	readonly timeout?: number
}

/** Common Ollama embedding models */
export type OllamaEmbeddingModel =
	| 'nomic-embed-text' | 'mxbai-embed-large' | 'all-minilm' | 'snowflake-arctic-embed'
	| (string & {})

// ============================================================================
// 5. Policy Adapter Options
// ============================================================================

/** Exponential retry adapter options */
export interface ExponentialRetryAdapterOptions {
	readonly maxAttempts?: number
	readonly initialDelayMs?: number
	readonly maxDelayMs?: number
	readonly backoffMultiplier?: number
	readonly jitter?: boolean
	readonly retryableCodes?: readonly AdapterErrorCode[]
	readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

/** Linear retry adapter options */
export interface LinearRetryAdapterOptions {
	readonly maxAttempts?: number
	readonly delayMs?: number
	readonly retryableCodes?: readonly AdapterErrorCode[]
	readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

/** Token bucket rate limit adapter options */
export interface TokenBucketRateLimitAdapterOptions {
	readonly requestsPerMinute?: number
	readonly maxConcurrent?: number
	readonly burstSize?: number
}

/** Sliding window rate limit adapter options */
export interface SlidingWindowRateLimitAdapterOptions {
	readonly requestsPerMinute?: number
	readonly windowMs?: number
}

/** Circuit breaker adapter options */
export interface CircuitBreakerAdapterOptions {
	readonly failureThreshold?: number
	readonly successThreshold?: number
	readonly resetTimeoutMs?: number
	readonly monitorWindowMs?: number
	readonly onStateChange?: (state: 'closed' | 'open' | 'half-open', previous: 'closed' | 'open' | 'half-open') => void
}

/** Console telemetry adapter options */
export interface ConsoleTelemetryAdapterOptions {
	readonly level?: LogLevel
	readonly prefix?: string
	readonly includeTimestamp?: boolean
	readonly includeSpanId?: boolean
}

// ============================================================================
// 6. Enhancement Adapter Options
// ============================================================================

/** LRU cache adapter options */
export interface LRUCacheAdapterOptions {
	readonly maxSize?: number
	readonly ttlMs?: number
	readonly onEvict?: (text: string, embedding: Embedding) => void
}

/** TTL cache adapter options */
export interface TTLCacheAdapterOptions {
	readonly ttlMs?: number
}

/** IndexedDB cache adapter options */
export interface IndexedDBCacheAdapterOptions {
	readonly database: MinimalDatabaseAccess
	readonly storeName?: string
	readonly ttlMs?: number
}

/** Batch adapter options */
export interface BatchAdapterOptions {
	readonly batchSize?: number
	readonly delayMs?: number
	readonly deduplicate?: boolean
}

/** Cohere reranker adapter options */
export interface CohereRerankerAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
}

/** Cross-encoder reranker adapter options */
export interface CrossEncoderRerankerAdapterOptions {
	readonly model: string
	readonly modelPath?: string
}

// ============================================================================
// 7. Transform Adapter Options
// ============================================================================

/** OpenAI tool choice type */
export type OpenAIToolChoice =
	| 'auto' | 'none' | 'required'
	| { readonly type: 'function'; readonly function: { readonly name: string } }

/** OpenAI tool format adapter options */
export interface OpenAIToolFormatAdapterOptions {
	readonly toolChoice?: OpenAIToolChoice
}

/** Anthropic tool choice type */
export type AnthropicToolChoice =
	| 'auto' | 'any'
	| { readonly type: 'tool'; readonly name: string }

/** Anthropic tool format adapter options */
export interface AnthropicToolFormatAdapterOptions {
	readonly toolChoice?: AnthropicToolChoice
}

// ============================================================================
// 8. Persistence Adapter Options
// ============================================================================

/** IndexedDB vector persistence options */
export interface IndexedDBVectorPersistenceOptions {
	readonly database: MinimalDatabaseAccess
	readonly documentsStore?: string
	readonly metadataStore?: string
}

/** OPFS vector persistence options */
export interface OPFSVectorPersistenceOptions {
	readonly directory: MinimalDirectoryAccess
	readonly chunkSize?: number
}

/** HTTP vector persistence options */
export interface HTTPVectorPersistenceOptions {
	readonly baseURL: string
	readonly headers?: Readonly<Record<string, string>>
	readonly timeout?: number
}

/** IndexedDB session persistence options */
export interface IndexedDBSessionPersistenceOptions {
	readonly databaseName?: string
	readonly storeName?: string
	readonly ttlMs?: number
}

// ============================================================================
// 9. Context Builder Adapter Options
// ============================================================================

/** Deduplication adapter options */
export interface DeduplicationAdapterOptions {
	readonly strategy?: DeduplicationStrategy
}

/** Truncation adapter options */
export interface TruncationAdapterOptions {
	readonly preserveSystem?: boolean
}

/** Priority weights configuration */
export type PriorityWeights = Partial<Record<FramePriority, number>>

/** Priority adapter options */
export interface PriorityAdapterOptions {
	readonly weights?: PriorityWeights
}

// ============================================================================
// 10. Streaming Adapter Options
// ============================================================================

/** SSE parser adapter options */
export interface SSEParserAdapterOptions {
	readonly lineDelimiter?: string
	readonly eventDelimiter?: string
}

// ============================================================================
// 12. API Response Types (Internal)
// ============================================================================

// --- OpenAI Response Types ---

/** OpenAI chat completion chunk */
export interface OpenAIChatCompletionChunk {
	readonly id: string
	readonly object: 'chat.completion.chunk'
	readonly created: number
	readonly model: string
	readonly choices: readonly OpenAIChatCompletionChunkChoice[]
	readonly usage?: OpenAIUsage
}

/** OpenAI usage stats */
export interface OpenAIUsage {
	readonly prompt_tokens: number
	readonly completion_tokens: number
	readonly total_tokens: number
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
	readonly function?: { readonly name?: string; readonly arguments?: string }
}

/** OpenAI embedding response */
export interface OpenAIEmbeddingResponse {
	readonly object: 'list'
	readonly data: readonly OpenAIEmbeddingData[]
	readonly model: string
	readonly usage: { readonly prompt_tokens: number; readonly total_tokens: number }
}

/** OpenAI embedding data */
export interface OpenAIEmbeddingData {
	readonly object: 'embedding'
	readonly embedding: readonly number[]
	readonly index: number
}

/** OpenAI tool definition for function calling */
export interface OpenAITool {
	readonly type: 'function'
	readonly function: { readonly name: string; readonly description?: string; readonly parameters?: unknown }
}

/** OpenAI tool call from response */
export interface OpenAIToolCall {
	readonly id: string
	readonly type: 'function'
	readonly function: { readonly name: string; readonly arguments: string }
}

/** OpenAI message with tool calls */
export interface OpenAIToolResponseMessage {
	readonly tool_calls?: readonly OpenAIToolCall[]
}

/** OpenAI choice in response */
export interface OpenAIToolResponseChoice {
	readonly message?: OpenAIToolResponseMessage
}

/** OpenAI response with tool calls */
export interface OpenAIToolResponse {
	readonly choices?: readonly OpenAIToolResponseChoice[]
}

// --- Anthropic Response Types ---

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

/** Anthropic tool definition */
export interface AnthropicTool {
	readonly name: string
	readonly description?: string
	readonly input_schema: unknown
}

/** Anthropic tool use block in response */
export interface AnthropicToolUseBlock {
	readonly type: 'tool_use'
	readonly id: string
	readonly name: string
	readonly input: Record<string, unknown>
}

/** Anthropic tool response */
export interface AnthropicToolResponse {
	readonly content?: readonly AnthropicContentBlock[]
}

// --- Voyage Response Types ---

/** Voyage embedding response */
export interface VoyageEmbeddingResponse {
	readonly object: 'list'
	readonly data: readonly VoyageEmbeddingData[]
	readonly model: string
	readonly usage: { readonly total_tokens: number }
}

/** Voyage embedding data */
export interface VoyageEmbeddingData {
	readonly object: 'embedding'
	readonly embedding: readonly number[]
	readonly index: number
}

// --- Ollama Response Types ---

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
	readonly function: { readonly name: string; readonly arguments: Readonly<Record<string, unknown>> }
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

// --- Cohere Response Types ---

/** Cohere rerank API response */
export interface CohereRerankResponse {
	readonly id: string
	readonly results: readonly CohereRerankResult[]
	readonly meta: { readonly api_version: { readonly version: string }; readonly billed_units?: { readonly search_units?: number } }
}

/** Cohere rerank result */
export interface CohereRerankResult {
	readonly index: number
	readonly relevance_score: number
}

// --- Internal Storage Types ---

/** Stored document record for persistence */
export interface StoredDocumentRecord {
	readonly id: string
	readonly content: string
	readonly embedding: readonly number[]
	readonly metadata?: Readonly<Record<string, unknown>> | undefined
}

/** Vector store metadata record for IndexedDB persistence */
export interface VectorStoreMetadataRecord {
	readonly id: string
	readonly dimensions: number
	readonly model: string
	readonly provider: string
	readonly documentCount: number
	readonly createdAt: number
	readonly updatedAt: number
}

/** Session record for persistence */
export interface SessionRecord {
	readonly id: string
	readonly session: SerializedSession
	readonly timestamp: number
}

/** Mutable SSE event for building events */
export interface MutableSSEEvent {
	event?: string
	data?: string
	id?: string
	retry?: number
}

/** IndexedDB cache entry */
export interface IndexedDBCacheEntry {
	readonly id: string
	readonly text: string
	readonly embedding: readonly number[]
	readonly timestamp: number
}

/** LRU cache entry */
export interface LRUCacheEntry {
	readonly embedding: Embedding
	readonly timestamp: number
}

/** TTL cache entry */
export interface TTLCacheEntry {
	readonly embedding: Embedding
	readonly expiresAt: number
}

/** Tool call accumulator for building tool calls incrementally */
export interface ToolCallAccumulator {
	id: string
	name: string
	arguments: string
}

/** IndexedDB cache interface with async methods */
export interface IndexedDBCacheAdapterInterface {
	get(text: string): Promise<Embedding | undefined>
	set(text: string, embedding: Embedding): Promise<void>
	has(text: string): Promise<boolean>
	delete(text: string): Promise<boolean>
	clear(): Promise<void>
	getStats(): CacheStats
}

// ============================================================================
// 13. Factory Function Types
// ============================================================================

// --- Streaming Adapter Factories ---
export type CreateStreamerAdapter = () => StreamerAdapterInterface
export type CreateSSEParserAdapter = (options?: SSEParserAdapterOptions) => SSEParserAdapterInterface

// --- Provider Adapter Factories ---
export type CreateOpenAIProviderAdapter = (options: OpenAIProviderAdapterOptions) => ProviderAdapterInterface
export type CreateAnthropicProviderAdapter = (options: AnthropicProviderAdapterOptions) => ProviderAdapterInterface
export type CreateOllamaProviderAdapter = (options: OllamaProviderAdapterOptions) => ProviderAdapterInterface

// --- Embedding Adapter Factories ---
export type CreateOpenAIEmbeddingAdapter = (options: OpenAIEmbeddingAdapterOptions) => EmbeddingAdapterInterface
export type CreateVoyageEmbeddingAdapter = (options: VoyageEmbeddingAdapterOptions) => EmbeddingAdapterInterface
export type CreateOllamaEmbeddingAdapter = (options: OllamaEmbeddingAdapterOptions) => EmbeddingAdapterInterface

// --- Transform Adapter Factories ---
export type CreateOpenAIToolFormatAdapter = (options?: OpenAIToolFormatAdapterOptions) => ToolFormatAdapterInterface
export type CreateAnthropicToolFormatAdapter = (options?: AnthropicToolFormatAdapterOptions) => ToolFormatAdapterInterface
export type CreateCosineSimilarityAdapter = () => SimilarityAdapterInterface
export type CreateDotSimilarityAdapter = () => SimilarityAdapterInterface
export type CreateEuclideanSimilarityAdapter = () => SimilarityAdapterInterface

// --- Persistence Adapter Factories ---
export type CreateIndexedDBSessionPersistence = (options?: IndexedDBSessionPersistenceOptions) => SessionPersistenceInterface
export type CreateIndexedDBVectorPersistence = (options: IndexedDBVectorPersistenceOptions) => VectorStorePersistenceAdapterInterface
export type CreateOPFSVectorPersistence = (options: OPFSVectorPersistenceOptions) => VectorStorePersistenceAdapterInterface
export type CreateHTTPVectorPersistence = (options: HTTPVectorPersistenceOptions) => VectorStorePersistenceAdapterInterface

// --- Policy Adapter Factories ---
export type CreateExponentialRetryAdapter = (options?: ExponentialRetryAdapterOptions) => RetryAdapterInterface
export type CreateLinearRetryAdapter = (options?: LinearRetryAdapterOptions) => RetryAdapterInterface
export type CreateTokenBucketRateLimitAdapter = (options?: TokenBucketRateLimitAdapterOptions) => RateLimitAdapterInterface
export type CreateSlidingWindowRateLimitAdapter = (options?: SlidingWindowRateLimitAdapterOptions) => RateLimitAdapterInterface
export type CreateCircuitBreakerAdapter = (options?: CircuitBreakerAdapterOptions) => CircuitBreakerAdapterInterface

// --- Telemetry Adapter Factories ---
export type CreateConsoleTelemetryAdapter = (options?: ConsoleTelemetryAdapterOptions) => TelemetryAdapterInterface

// --- Enhancement Adapter Factories ---
export type CreateLRUCacheAdapter = (options?: LRUCacheAdapterOptions) => EmbeddingCacheAdapterInterface
export type CreateTTLCacheAdapter = (options?: TTLCacheAdapterOptions) => EmbeddingCacheAdapterInterface
export type CreateIndexedDBCacheAdapter = (options: IndexedDBCacheAdapterOptions) => EmbeddingCacheAdapterInterface
export type CreateBatchAdapter = (options?: BatchAdapterOptions) => BatchAdapterInterface
export type CreateCohereRerankerAdapter = (options: CohereRerankerAdapterOptions) => RerankerAdapterInterface
export type CreateCrossEncoderRerankerAdapter = (options: CrossEncoderRerankerAdapterOptions) => RerankerAdapterInterface

// --- Context Builder Adapter Factories ---
export type CreateDeduplicationAdapter = (options?: DeduplicationAdapterOptions) => DeduplicationAdapterInterface
export type CreatePriorityTruncationAdapter = (options?: TruncationAdapterOptions) => TruncationAdapterInterface
export type CreateFIFOTruncationAdapter = (options?: TruncationAdapterOptions) => TruncationAdapterInterface
export type CreateLIFOTruncationAdapter = (options?: TruncationAdapterOptions) => TruncationAdapterInterface
export type CreateScoreTruncationAdapter = (options?: TruncationAdapterOptions) => TruncationAdapterInterface
export type CreatePriorityAdapter = (options?: PriorityAdapterOptions) => PriorityAdapterInterface
