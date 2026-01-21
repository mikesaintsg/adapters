/**
 * @mikesaintsg/adapters
 *
 * Factory functions for creating adapter instances.
 */

// ============================================================================
// Type Imports
// ============================================================================

import type {
	StreamerAdapterInterface,
	SSEParserAdapterInterface,
	ProviderAdapterInterface,
	EmbeddingAdapterInterface,
	RetryAdapterInterface,
	RateLimitAdapterInterface,
	EmbeddingCacheAdapterInterface,
	BatchAdapterInterface,
	RerankerAdapterInterface,
	ToolFormatAdapterInterface,
	SimilarityAdapterInterface,
	VectorStorePersistenceAdapterInterface,
	SessionPersistenceInterface,
	DeduplicationAdapterInterface,
	PriorityAdapterInterface,
	TruncationAdapterInterface,
	SSEParserOptions,
	SSEParserInterface,
	EventStorePersistenceAdapterInterface,
	WeightPersistenceAdapterInterface,
	CircuitBreakerAdapterInterface,
	TelemetryAdapterInterface,
} from '@mikesaintsg/core'

import type {
	AnthropicProviderAdapterOptions,
	AnthropicToolFormatAdapterOptions,
	BatchAdapterOptions,
	CircuitBreakerAdapterOptions,
	CohereRerankerAdapterOptions,
	ConsoleTelemetryAdapterOptions,
	CrossEncoderRerankerAdapterOptions,
	DeduplicationAdapterOptions,
	ExponentialRetryAdapterOptions,
	HTTPVectorPersistenceOptions,
	HuggingFaceEmbeddingAdapterOptions,
	HuggingFaceProviderAdapterOptions,
	IndexedDBCacheAdapterInterface,
	IndexedDBCacheAdapterOptions,
	IndexedDBSessionPersistenceOptions,
	IndexedDBVectorPersistenceOptions,
	IndexedDBEventPersistenceOptions,
	IndexedDBWeightPersistenceOptions,
	InMemoryEventPersistenceOptions,
	LinearRetryAdapterOptions,
	LRUCacheAdapterOptions,
	NodeLlamaCppEmbeddingAdapterOptions,
	NodeLlamaCppProviderAdapterOptions,
	NoOpTelemetryAdapterOptions,
	OllamaEmbeddingAdapterOptions,
	OllamaProviderAdapterOptions,
	OpenAIEmbeddingAdapterOptions,
	OpenAIProviderAdapterOptions,
	OpenAIToolFormatAdapterOptions,
	OPFSVectorPersistenceOptions,
	PriorityAdapterOptions,
	SlidingWindowRateLimitAdapterOptions,
	SSEParserAdapterOptions,
	TokenBucketRateLimitAdapterOptions,
	TruncationAdapterOptions,
	TTLCacheAdapterOptions,
	VoyageEmbeddingAdapterOptions,
} from './types.js'

// ============================================================================
// Implementation Imports (via barrel exports)
// ============================================================================

// Streamers
import { Streamer, SSEParser, ProviderStreamHandle } from './core/streamers/index.js'

// Providers
import {
	OpenAIProvider,
	AnthropicProvider,
	OllamaProvider,
	NodeLlamaCppProvider,
	HuggingFaceProvider,
} from './core/providers/index.js'

// Embeddings
import {
	OpenAIEmbedding,
	VoyageEmbedding,
	OllamaEmbedding,
	NodeLlamaCppEmbedding,
	HuggingFaceEmbedding,
} from './core/embeddings/index.js'

// Policies
import {
	ExponentialRetry,
	LinearRetry,
	TokenBucketRateLimit,
	SlidingWindowRateLimit,
	CircuitBreaker,
	ConsoleTelemetry,
	NoOpTelemetry,
} from './core/policies/index.js'

// Enhancements
import {
	LRUCache,
	TTLCache,
	IndexedDBCache,
	Batch,
	CohereReranker,
	CrossEncoderReranker,
} from './core/enhancements/index.js'

// Transforms
import {
	OpenAIToolFormat,
	AnthropicToolFormat,
	CosineSimilarity,
	DotSimilarity,
	EuclideanSimilarity,
} from './core/transforms/index.js'

// Persistence
import {
	IndexedDBVectorPersistence,
	OPFSVectorPersistence,
	HTTPVectorPersistence,
	IndexedDBSessionPersistence,
} from './core/persistence/index.js'

// ActionLoop
import {
	IndexedDBEventPersistence,
	IndexedDBWeightPersistence,
	InMemoryEventPersistence,
	InMemoryWeightPersistence,
} from './core/actionloop/index.js'

// Context Builder
import {
	DeduplicationAdapter,
	FIFOTruncationAdapter,
	LIFOTruncationAdapter,
	PriorityAdapter,
	PriorityTruncationAdapter,
	ScoreTruncationAdapter,
} from './core/contextbuilder/index.js'

// Constants
import { DEFAULT_CACHE_STORE_NAME, DEFAULT_INDEXEDDB_CACHE_TTL_MS } from './constants.js'

// ============================================================================
// Streaming Adapter Factories
// ============================================================================

/**
 * Create a streamer adapter for token emission.
 *
 * @returns A streamer adapter instance
 *
 * @example
 * ```ts
 * const streamer = createStreamerAdapter()
 * const unsub = streamer.onToken((token) => console.log(token))
 * streamer.emit('Hello')
 * streamer.emit(' world')
 * streamer.end()
 * unsub()
 * ```
 */
export function createStreamerAdapter(): StreamerAdapterInterface {
	return new Streamer()
}

/**
 * Create an SSE parser adapter.
 *
 * @param options - Optional parser configuration
 * @returns An SSE parser adapter instance
 *
 * @example
 * ```ts
 * const sseAdapter = createSSEParserAdapter()
 *
 * const parser = sseAdapter.createParser({
 *   onEvent: (event) => console.log(event.data),
 *   onEnd: () => console.log('Done'),
 * })
 *
 * parser.feed('data: {"content": "Hello"}\n\n')
 * parser.end()
 * ```
 */
export function createSSEParserAdapter(
	options?: SSEParserAdapterOptions,
): SSEParserAdapterInterface {
	const lineDelimiter = options?.lineDelimiter ?? '\n'
	const eventDelimiter = options?.eventDelimiter ?? '\n\n'

	return {
		createParser(parserOptions: SSEParserOptions): SSEParserInterface {
			return new SSEParser(parserOptions, lineDelimiter, eventDelimiter)
		},
	}
}

/**
 * Create a provider stream handle for managing streaming generation.
 *
 * @param requestId - Unique request identifier
 * @param abortController - Abort controller for cancellation
 * @param streamer - Streamer adapter for token emission
 * @returns ProviderStreamHandle instance
 *
 * @example
 * ```ts
 * const handle = createProviderStreamHandle(
 *   crypto.randomUUID(),
 *   new AbortController(),
 *   createStreamerAdapter(),
 * )
 *
 * handle.emitToken('Hello')
 * handle.emitToken(' world')
 * handle.complete()
 * ```
 */
export function createProviderStreamHandle(
	requestId: string,
	abortController: AbortController,
	streamer: StreamerAdapterInterface,
): ProviderStreamHandle {
	return new ProviderStreamHandle(requestId, abortController, streamer)
}

// ============================================================================
// Provider Adapter Factories
// ============================================================================

/**
 * Create an OpenAI provider adapter.
 *
 * @param options - OpenAI provider options
 * @returns ProviderAdapterInterface implementation
 */
export function createOpenAIProviderAdapter(
	options: OpenAIProviderAdapterOptions,
): ProviderAdapterInterface {
	return new OpenAIProvider(options)
}

/**
 * Creates an Anthropic provider adapter.
 *
 * @param options - Anthropic provider options
 * @returns Provider adapter instance
 *
 * @example
 * ```ts
 * const provider = createAnthropicProviderAdapter({
 *   apiKey: 'sk-ant-...',
 *   model: 'claude-3-5-sonnet-20241022',
 * })
 *
 * const stream = provider.generate([
 *   { role: 'user', content: 'Hello!' }
 * ], {})
 *
 * for await (const token of stream) {
 *   console.log(token)
 * }
 * ```
 */
export function createAnthropicProviderAdapter(
	options: AnthropicProviderAdapterOptions,
): ProviderAdapterInterface {
	return new AnthropicProvider(options)
}

/**
 * Creates an Ollama provider adapter.
 *
 * @param options - Ollama provider options
 * @returns Provider adapter instance
 *
 * @example
 * ```ts
 * const provider = createOllamaProviderAdapter({
 *   model: 'llama3',
 * })
 *
 * const stream = provider.generate([
 *   { role: 'user', content: 'Hello!' }
 * ], {})
 *
 * for await (const token of stream) {
 *   console.log(token)
 * }
 * ```
 */
export function createOllamaProviderAdapter(
	options: OllamaProviderAdapterOptions,
): ProviderAdapterInterface {
	return new OllamaProvider(options)
}

/**
 * Creates a node-llama-cpp provider adapter.
 *
 * @param options - node-llama-cpp provider options
 * @returns Provider adapter instance
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
 * import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
 *
 * const llama = await getLlama()
 * const model = await llama.loadModel({ modelPath: './llama-3-8b.gguf' })
 * const context = await model.createContext()
 *
 * const provider = createNodeLlamaCppProviderAdapter({
 *   context,
 *   modelName: 'llama3',
 * })
 *
 * const stream = provider.generate([
 *   { role: 'user', content: 'Hello!' }
 * ], {})
 *
 * for await (const token of stream) {
 *   console.log(token)
 * }
 * ```
 */
export function createNodeLlamaCppProviderAdapter(
	options: NodeLlamaCppProviderAdapterOptions,
): ProviderAdapterInterface {
	return new NodeLlamaCppProvider(options)
}

/**
 * Creates a HuggingFace provider adapter.
 *
 * @param options - HuggingFace provider options
 * @returns Provider adapter instance
 *
 * @example
 * ```ts
 * import { pipeline } from '@huggingface/transformers'
 * import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
 *
 * const generator = await pipeline('text-generation', 'Xenova/gpt2')
 *
 * const provider = createHuggingFaceProviderAdapter({
 *   pipeline: generator,
 *   modelName: 'gpt2',
 * })
 *
 * const stream = provider.generate([
 *   { role: 'user', content: 'Hello!' }
 * ], {})
 *
 * for await (const token of stream) {
 *   console.log(token)
 * }
 * ```
 */
export function createHuggingFaceProviderAdapter(
	options: HuggingFaceProviderAdapterOptions,
): ProviderAdapterInterface {
	return new HuggingFaceProvider(options)
}

// ============================================================================
// Embedding Adapter Factories
// ============================================================================

/**
 * Create an OpenAI embedding adapter.
 *
 * @example
 * ```ts
 * const embedding = createOpenAIEmbeddingAdapter({
 *   apiKey: 'sk-...',
 *   model: 'text-embedding-3-small',
 * })
 *
 * const vectors = await embedding.embed(['Hello, world!'])
 * ```
 */
export function createOpenAIEmbeddingAdapter(
	options: OpenAIEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	return new OpenAIEmbedding(options)
}

/**
 * Create a Voyage embedding adapter.
 *
 * @example
 * ```ts
 * const embedding = createVoyageEmbeddingAdapter({
 *   apiKey: 'pa-...',
 *   model: 'voyage-3',
 *   inputType: 'document',
 * })
 *
 * const vectors = await embedding.embed(['Hello, world!'])
 * ```
 */
export function createVoyageEmbeddingAdapter(
	options: VoyageEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	return new VoyageEmbedding(options)
}

/**
 * Create an Ollama embedding adapter.
 *
 * @example
 * ```ts
 * const embedding = createOllamaEmbeddingAdapter({
 *   model: 'nomic-embed-text',
 * })
 *
 * const vectors = await embedding.embed(['Hello, world!'])
 * ```
 */
export function createOllamaEmbeddingAdapter(
	options: OllamaEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	return new OllamaEmbedding(options)
}

/**
 * Create a node-llama-cpp embedding adapter.
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
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

/**
 * Create a HuggingFace embedding adapter.
 *
 * @example
 * ```ts
 * import { pipeline } from '@huggingface/transformers'
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

// ============================================================================
// Policy Adapter Factories
// ============================================================================

/**
 * Create an exponential retry adapter.
 *
 * @example
 * ```ts
 * const retry = createExponentialRetryAdapter({
 *   maxAttempts: 5,
 *   initialDelayMs: 1000,
 *   backoffMultiplier: 2,
 *   jitter: true,
 * })
 *
 * // Usage with a provider
 * let attempt = 0
 * while (attempt < retry.getMaxAttempts()) {
 *   try {
 *     const result = await provider.generate(messages)
 *     break
 *   } catch (error) {
 *     if (!retry.shouldRetry(error, attempt)) {
 *       throw error
 *     }
 *     await sleep(retry.getDelay(attempt))
 *     attempt++
 *   }
 * }
 * ```
 */
export function createExponentialRetryAdapter(
	options?: ExponentialRetryAdapterOptions,
): RetryAdapterInterface {
	return new ExponentialRetry(options)
}

/**
 * Create a linear retry adapter.
 *
 * @example
 * ```ts
 * const retry = createLinearRetryAdapter({
 *   maxAttempts: 3,
 *   delayMs: 2000,
 * })
 *
 * // Usage with a provider
 * let attempt = 0
 * while (attempt < retry.getMaxAttempts()) {
 *   try {
 *     const result = await provider.generate(messages)
 *     break
 *   } catch (error) {
 *     if (!retry.shouldRetry(error, attempt)) {
 *       throw error
 *     }
 *     await sleep(retry.getDelay(attempt))
 *     attempt++
 *   }
 * }
 * ```
 */
export function createLinearRetryAdapter(
	options?: LinearRetryAdapterOptions,
): RetryAdapterInterface {
	return new LinearRetry(options)
}

/**
 * Create a token bucket rate limit adapter.
 *
 * @example
 * ```ts
 * const rateLimit = createTokenBucketRateLimitAdapter({
 *   requestsPerMinute: 60,
 *   maxConcurrent: 5,
 *   burstSize: 10,
 * })
 *
 * // Usage with a provider
 * async function makeRequest() {
 *   await rateLimit.acquire()
 *   try {
 *     return await provider.generate(messages)
 *   } finally {
 *     rateLimit.release()
 *   }
 * }
 * ```
 */
export function createTokenBucketRateLimitAdapter(
	options?: TokenBucketRateLimitAdapterOptions,
): RateLimitAdapterInterface {
	return new TokenBucketRateLimit(options)
}

/**
 * Create a sliding window rate limit adapter.
 *
 * @example
 * ```ts
 * const rateLimit = createSlidingWindowRateLimitAdapter({
 *   requestsPerMinute: 60,
 *   windowMs: 60000,
 * })
 *
 * // Usage with a provider
 * async function makeRequest() {
 *   await rateLimit.acquire()
 *   try {
 *     return await provider.generate(messages)
 *   } finally {
 *     rateLimit.release()
 *   }
 * }
 * ```
 */
export function createSlidingWindowRateLimitAdapter(
	options?: SlidingWindowRateLimitAdapterOptions,
): RateLimitAdapterInterface {
	return new SlidingWindowRateLimit(options)
}

/**
 * Create a circuit breaker adapter.
 *
 * Circuit breakers prevent cascading failures by stopping requests to
 * unhealthy services. After a threshold of failures, the circuit "opens"
 * and fails fast. After a timeout, it enters "half-open" state to test
 * if the service has recovered.
 *
 * @example
 * ```ts
 * const circuitBreaker = createCircuitBreakerAdapter({
 *   failureThreshold: 5,
 *   successThreshold: 3,
 *   resetTimeoutMs: 30000,
 *   onStateChange: (state, previous) => {
 *     console.log(`Circuit ${previous} → ${state}`)
 *   },
 * })
 *
 * // Check before making request
 * if (circuitBreaker.canExecute()) {
 *   try {
 *     const result = await provider.generate(messages)
 *     circuitBreaker.recordSuccess()
 *   } catch (error) {
 *     circuitBreaker.recordFailure()
 *     throw error
 *   }
 * } else {
 *   // Use fallback or cached response
 *   return fallbackResponse
 * }
 * ```
 */
export function createCircuitBreakerAdapter(
	options?: CircuitBreakerAdapterOptions,
): CircuitBreakerAdapterInterface {
	return new CircuitBreaker(options)
}

/**
 * Create a console telemetry adapter.
 *
 * Logs telemetry events to the console with configurable log level and formatting.
 *
 * @example
 * ```ts
 * const telemetry = createConsoleTelemetryAdapter({
 *   level: 'info',
 *   prefix: '[inference]',
 *   includeTimestamp: true,
 *   includeSpanId: true,
 * })
 *
 * // Start a span for timing
 * const span = telemetry.startSpan('generate', { model: 'gpt-4o' })
 * try {
 *   const result = await provider.generate(messages)
 *   span.setStatus('ok')
 * } catch (error) {
 *   span.setStatus('error', error.message)
 * } finally {
 *   span.end()
 * }
 *
 * // Log a message
 * telemetry.log('info', 'Request completed', { tokens: 100 })
 * ```
 */
export function createConsoleTelemetryAdapter(
	options?: ConsoleTelemetryAdapterOptions,
): TelemetryAdapterInterface {
	return new ConsoleTelemetry(options)
}

/**
 * Create a no-op telemetry adapter.
 *
 * Disables telemetry for production where performance is critical.
 * All methods are no-ops that return immediately.
 *
 * @example
 * ```ts
 * const telemetry = createNoOpTelemetryAdapter()
 *
 * // All operations are no-ops
 * const span = telemetry.startSpan('generate')
 * span.end() // Does nothing
 *
 * telemetry.log('info', 'Message') // Does nothing
 * ```
 */
export function createNoOpTelemetryAdapter(
	options?: NoOpTelemetryAdapterOptions,
): TelemetryAdapterInterface {
	return new NoOpTelemetry(options)
}

// ============================================================================
// Enhancement Adapter Factories
// ============================================================================

/**
 * Create an LRU cache adapter for embeddings.
 *
 * @example
 * ```ts
 * const cache = createLRUCacheAdapter({
 *   maxSize: 10000,
 *   ttlMs: 3600000, // 1 hour
 *   onEvict: (text, embedding) => {
 *     console.log(`Evicted: ${text.substring(0, 50)}...`)
 *   },
 * })
 *
 * // Check cache before embedding
 * let embedding = cache.get(text)
 * if (!embedding) {
 *   embedding = await embeddingAdapter.embed([text])[0]
 *   cache.set(text, embedding)
 * }
 * ```
 */
export function createLRUCacheAdapter(
	options?: LRUCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	return new LRUCache(options)
}

/**
 * Create a TTL cache adapter for embeddings.
 * Simple cache with time-based expiration only, no size limits.
 *
 * @example
 * ```ts
 * const cache = createTTLCacheAdapter({
 *   ttlMs: 3600000, // 1 hour
 * })
 *
 * // Check cache before embedding
 * let embedding = cache.get(text)
 * if (!embedding) {
 *   embedding = await embeddingAdapter.embed([text])[0]
 *   cache.set(text, embedding)
 * }
 * ```
 */
export function createTTLCacheAdapter(
	options?: TTLCacheAdapterOptions,
): EmbeddingCacheAdapterInterface {
	return new TTLCache(options)
}

/**
 * Create an IndexedDB cache adapter for embeddings.
 * Provides persistent caching across browser sessions.
 *
 * @example
 * ```ts
 * const cache = createIndexedDBCacheAdapter({
 *   database: myDatabaseAccess,
 *   storeName: 'embeddings',
 *   ttlMs: 604800000, // 7 days
 * })
 *
 * // Use async methods for IndexedDB
 * let embedding = await cache.getAsync(text)
 * if (!embedding) {
 *   embedding = await embeddingAdapter.embed([text])[0]
 *   await cache.setAsync(text, embedding)
 * }
 * ```
 */
export function createIndexedDBCacheAdapter(
	options: IndexedDBCacheAdapterOptions,
): IndexedDBCacheAdapterInterface {
	const storeName = options.storeName ?? DEFAULT_CACHE_STORE_NAME
	const ttlMs = options.ttlMs ?? DEFAULT_INDEXEDDB_CACHE_TTL_MS
	return new IndexedDBCache(options.database, storeName, ttlMs)
}

/**
 * Create a batch adapter for request batching.
 *
 * @example
 * ```ts
 * const batch = createBatchAdapter({
 *   batchSize: 50,
 *   delayMs: 100,
 *   deduplicate: true,
 * })
 *
 * // Use batch settings to control batching behavior
 * const batchSize = batch.getBatchSize()
 * const delayMs = batch.getDelayMs()
 * const shouldDedupe = batch.shouldDeduplicate()
 * ```
 */
export function createBatchAdapter(
	options?: BatchAdapterOptions,
): BatchAdapterInterface {
	return new Batch(options)
}

/**
 * Create a Cohere reranker adapter.
 *
 * @example
 * ```ts
 * const reranker = createCohereRerankerAdapter({
 *   apiKey: 'your-cohere-api-key',
 *   model: 'rerank-english-v3.0',
 * })
 *
 * const results = await reranker.rerank('What is machine learning?', scoredResults)
 *
 * // Results are sorted by relevance score
 * console.log(results[0].content) // Most relevant document
 * console.log(results[0].score) // Relevance score
 * ```
 */
export function createCohereRerankerAdapter(
	options: CohereRerankerAdapterOptions,
): RerankerAdapterInterface {
	return new CohereReranker(options)
}

/**
 * Create a cross-encoder reranker adapter.
 * Uses a local cross-encoder model for reranking.
 *
 * @example
 * ```ts
 * const reranker = createCrossEncoderRerankerAdapter({
 *   model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
 *   modelPath: './models/reranker',
 * })
 *
 * const results = await reranker.rerank('What is machine learning?', scoredResults)
 * ```
 */
export function createCrossEncoderRerankerAdapter(
	options: CrossEncoderRerankerAdapterOptions,
): RerankerAdapterInterface {
	return new CrossEncoderReranker(options)
}

// ============================================================================
// Transform Adapter Factories
// ============================================================================

/**
 * Create an OpenAI tool format adapter.
 *
 * @example
 * ```ts
 * const formatter = createOpenAIToolFormatAdapter()
 *
 * const schemas = [{
 *   name: 'get_weather',
 *   description: 'Get the current weather',
 *   parameters: { type: 'object', properties: { city: { type: 'string' } } }
 * }]
 *
 * const formatted = formatter.formatSchemas(schemas)
 * // [{ type: 'function', function: { name: 'get_weather', ... } }]
 * ```
 */
export function createOpenAIToolFormatAdapter(
	options?: OpenAIToolFormatAdapterOptions,
): ToolFormatAdapterInterface {
	return new OpenAIToolFormat(options)
}

/**
 * Create an Anthropic tool format adapter.
 *
 * @example
 * ```ts
 * const formatter = createAnthropicToolFormatAdapter()
 *
 * const schemas = [{
 *   name: 'get_weather',
 *   description: 'Get the current weather',
 *   parameters: { type: 'object', properties: { city: { type: 'string' } } }
 * }]
 *
 * const formatted = formatter.formatSchemas(schemas)
 * // [{ name: 'get_weather', input_schema: { ... } }]
 * ```
 */
export function createAnthropicToolFormatAdapter(
	options?: AnthropicToolFormatAdapterOptions,
): ToolFormatAdapterInterface {
	return new AnthropicToolFormat(options)
}

/**
 * Create a cosine similarity adapter.
 *
 * Cosine similarity measures the angle between two vectors, ignoring magnitude.
 * Returns values between -1 (opposite) and 1 (identical direction).
 *
 * @example
 * ```ts
 * const similarity = createCosineSimilarityAdapter()
 *
 * const a = new Float32Array([1, 0, 0])
 * const b = new Float32Array([1, 0, 0])
 * similarity.calculate(a, b) // 1.0 (identical)
 *
 * const c = new Float32Array([0, 1, 0])
 * similarity.calculate(a, c) // 0.0 (orthogonal)
 * ```
 */
export function createCosineSimilarityAdapter(): SimilarityAdapterInterface {
	return new CosineSimilarity()
}

/**
 * Create a dot product similarity adapter.
 *
 * Dot product measures similarity as the sum of element-wise products.
 * For normalized vectors, this is equivalent to cosine similarity.
 *
 * @example
 * ```ts
 * const similarity = createDotSimilarityAdapter()
 *
 * const a = new Float32Array([1, 2, 3])
 * const b = new Float32Array([4, 5, 6])
 * similarity.calculate(a, b) // 32 (1*4 + 2*5 + 3*6)
 * ```
 */
export function createDotSimilarityAdapter(): SimilarityAdapterInterface {
	return new DotSimilarity()
}

/**
 * Create a Euclidean similarity adapter.
 *
 * Euclidean similarity converts distance to a similarity score using
 * the formula: 1 / (1 + distance). Returns values between 0 and 1.
 *
 * @example
 * ```ts
 * const similarity = createEuclideanSimilarityAdapter()
 *
 * const a = new Float32Array([0, 0, 0])
 * const b = new Float32Array([0, 0, 0])
 * similarity.calculate(a, b) // 1.0 (identical)
 *
 * const c = new Float32Array([1, 1, 1])
 * similarity.calculate(a, c) // ~0.366 (distance = sqrt(3))
 * ```
 */
export function createEuclideanSimilarityAdapter(): SimilarityAdapterInterface {
	return new EuclideanSimilarity()
}

// ============================================================================
// Persistence Adapter Factories
// ============================================================================

/**
 * Create an IndexedDB vector persistence adapter.
 *
 * @example
 * ```ts
 * const persistence = createIndexedDBVectorPersistenceAdapter({
 *   database: myDatabaseAccess,
 *   documentsStore: 'documents',
 *   metadataStore: 'metadata',
 * })
 *
 * await persistence.save([{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) }])
 * const docs = await persistence.load()
 * ```
 */
export function createIndexedDBVectorPersistenceAdapter(
	options: IndexedDBVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	return new IndexedDBVectorPersistence(options)
}

/**
 * Create an OPFS vector persistence adapter.
 *
 * Uses the Origin Private File System for persistent storage.
 * Chunks documents for efficient storage and retrieval of large datasets.
 *
 * @example
 * ```ts
 * const persistence = createOPFSVectorPersistenceAdapter({
 *   directory: myDirectoryAccess,
 *   chunkSize: 100,
 * })
 *
 * await persistence.save([{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) }])
 * const docs = await persistence.load()
 * ```
 */
export function createOPFSVectorPersistenceAdapter(
	options: OPFSVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	return new OPFSVectorPersistence(options)
}

/**
 * Create an HTTP vector persistence adapter.
 *
 * Persists vector store data to a remote HTTP API.
 * Expects endpoints:
 * - PUT /documents - Save documents
 * - GET /documents - Load documents
 * - DELETE /documents - Clear/remove documents
 * - PUT /metadata - Save metadata
 * - GET /metadata - Load metadata
 * - DELETE /metadata - Clear metadata
 * - GET /health - Health check
 *
 * @example
 * ```ts
 * const persistence = createHTTPVectorPersistenceAdapter({
 *   baseURL: 'https://api.example.com/vectorstore',
 *   headers: { 'Authorization': 'Bearer token' },
 * })
 *
 * await persistence.save([{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) }])
 * const docs = await persistence.load()
 * ```
 */
export function createHTTPVectorPersistenceAdapter(
	options: HTTPVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	return new HTTPVectorPersistence(options)
}

/**
 * Create an IndexedDB session persistence adapter.
 *
 * Stores session data with TTL-based expiration.
 *
 * @example
 * ```ts
 * const persistence = createIndexedDBSessionPersistenceAdapter({
 *   databaseName: 'my-app-sessions',
 *   ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
 * })
 *
 * await persistence.save('session-1', mySession)
 * const data = await persistence.load('session-1')
 * ```
 */
export function createIndexedDBSessionPersistenceAdapter(
	options?: IndexedDBSessionPersistenceOptions,
): SessionPersistenceInterface {
	return new IndexedDBSessionPersistence(options)
}

// ============================================================================
// Context Builder Adapter Factories
// ============================================================================

/**
 * Creates a Deduplication adapter
 *
 * @param options - Optional deduplication configuration
 * @returns DeduplicationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const dedup = createDeduplicationAdapter({ strategy: 'keep_latest' })
 *
 * // Select which frame to keep from duplicates
 * const selected = dedup.select(duplicateFrames)
 *
 * // Check if a frame should be preserved
 * const preserve = dedup.shouldPreserve(frame)
 * ```
 */
export function createDeduplicationAdapter(
	options?: DeduplicationAdapterOptions,
): DeduplicationAdapterInterface {
	return new DeduplicationAdapter(options)
}

/**
 * Creates a FIFO Truncation adapter
 *
 * @param options - Optional truncation configuration
 * @returns TruncationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const truncator = createFIFOTruncationAdapter()
 *
 * // Sort frames (oldest at end = removed first)
 * const sorted = truncator.sort(frames)
 * ```
 */
export function createFIFOTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	return new FIFOTruncationAdapter(options)
}

/**
 * Creates a LIFO Truncation adapter
 *
 * @param options - Optional truncation configuration
 * @returns TruncationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const truncator = createLIFOTruncationAdapter()
 *
 * // Sort frames (newest at end = removed first)
 * const sorted = truncator.sort(frames)
 * ```
 */
export function createLIFOTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	return new LIFOTruncationAdapter(options)
}

/**
 * Creates a Priority adapter
 *
 * @param options - Optional priority configuration
 * @returns PriorityAdapterInterface implementation
 *
 * @example
 * ```ts
 * const priority = createPriorityAdapter({
 *   weights: {
 *     critical: 1.0,
 *     high: 0.8,
 *     normal: 0.5,
 *     low: 0.2,
 *     optional: 0.1,
 *   },
 * })
 *
 * const weight = priority.getWeight('high')
 * const comparison = priority.compare(frameA, frameB)
 * ```
 */
export function createPriorityAdapter(
	options?: PriorityAdapterOptions,
): PriorityAdapterInterface {
	return new PriorityAdapter(options)
}

/**
 * Creates a Priority Truncation adapter
 *
 * @param options - Optional truncation configuration
 * @returns TruncationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const truncator = createPriorityTruncationAdapter()
 *
 * // Sort frames by priority (low priority at end = removed first)
 * const sorted = truncator.sort(frames)
 *
 * // Check if a frame should be preserved
 * const preserve = truncator.shouldPreserve(frame)
 * ```
 */
export function createPriorityTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	return new PriorityTruncationAdapter(options)
}

/**
 * Creates a Score Truncation adapter
 *
 * @param options - Optional truncation configuration
 * @returns TruncationAdapterInterface implementation
 *
 * @example
 * ```ts
 * const truncator = createScoreTruncationAdapter()
 *
 * // Sort frames by score (low score at end = removed first)
 * const sorted = truncator.sort(frames)
 * ```
 */
export function createScoreTruncationAdapter(
	options?: TruncationAdapterOptions,
): TruncationAdapterInterface {
	return new ScoreTruncationAdapter(options)
}

// ============================================================================
// ActionLoop Persistence Adapter Factories
// ============================================================================

/**
 * Creates an IndexedDB event persistence adapter for ActionLoop.
 *
 * @param options - IndexedDB configuration with database access
 * @returns EventStorePersistenceAdapterInterface implementation
 *
 * @example
 * ```ts
 * import { createDatabase } from '@mikesaintsg/indexeddb'
 *
 * const db = await createDatabase('my-app')
 * const eventPersistence = createIndexedDBEventPersistenceAdapter({
 *   database: db,
 *   storeName: 'events',
 * })
 *
 * const engine = createWorkflowEngine(procedural, predictive, {
 *   eventPersistence,
 * })
 * ```
 */
export function createIndexedDBEventPersistenceAdapter(
	options: IndexedDBEventPersistenceOptions,
): EventStorePersistenceAdapterInterface {
	return new IndexedDBEventPersistence(options)
}

/**
 * Creates an IndexedDB weight persistence adapter for ActionLoop.
 *
 * @param options - IndexedDB configuration with database access
 * @returns WeightPersistenceAdapterInterface implementation
 *
 * @example
 * ```ts
 * import { createDatabase } from '@mikesaintsg/indexeddb'
 *
 * const db = await createDatabase('my-app')
 * const weightPersistence = createIndexedDBWeightPersistenceAdapter({
 *   database: db,
 *   storeName: 'weights',
 * })
 *
 * const predictive = createPredictiveGraph(procedural, {
 *   persistence: weightPersistence,
 * })
 * ```
 */
export function createIndexedDBWeightPersistenceAdapter(
	options: IndexedDBWeightPersistenceOptions,
): WeightPersistenceAdapterInterface {
	return new IndexedDBWeightPersistence(options)
}

/**
 * Creates an in-memory event persistence adapter for ActionLoop.
 *
 * Useful for testing or when persistence is not required.
 *
 * @param options - Optional configuration with max events limit
 * @returns EventStorePersistenceAdapterInterface implementation
 *
 * @example
 * ```ts
 * const eventPersistence = createInMemoryEventPersistenceAdapter({
 *   maxEvents: 5000,
 * })
 * ```
 */
export function createInMemoryEventPersistenceAdapter(
	options?: InMemoryEventPersistenceOptions,
): EventStorePersistenceAdapterInterface {
	return new InMemoryEventPersistence(options)
}

/**
 * Creates an in-memory weight persistence adapter for ActionLoop.
 *
 * Useful for testing or when persistence is not required.
 *
 * @returns WeightPersistenceAdapterInterface implementation
 *
 * @example
 * ```ts
 * const weightPersistence = createInMemoryWeightPersistenceAdapter()
 * ```
 */
export function createInMemoryWeightPersistenceAdapter(): WeightPersistenceAdapterInterface {
	return new InMemoryWeightPersistence()
}
