/**
 * @mikesaintsg/adapters
 *
 * Type definitions for the adapters package. 
 * This file contains adapter-specific options and configuration types.
 *
 * Architecture:
 * - Interface definitions come from @mikesaintsg/core
 * - Options types and adapter-specific types are defined here
 * - All providers stream natively with SSE parsing built-in
 * - Custom streamers are optional via the `streamer` option
 *
 * Implementation Requirements:
 * - All provider adapters MUST stream by default
 * - SSE parsing is internal to each provider adapter
 * - Default streamer is created via createStreamerAdapter()
 * - Error mapping should be comprehensive: 
 *   - Map ALL provider error codes to `AdapterErrorCode`
 *   - Include `providerCode` (original provider error code) in error data
 *   - Include `retryAfter` (milliseconds) for rate limit errors
 *   - Include `context` for debugging information
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
	MinimalDirectoryAccess,
	StreamerAdapterInterface,
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
	FramePriority,
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
	readonly context?:  Readonly<Record<string, unknown>>
}

// ============================================================================
// Provider Adapter Options
// ============================================================================

/**
 * OpenAI provider adapter options. 
 *
 * Streaming is native — no configuration needed.
 * SSE parsing is handled internally. 
 */
export interface OpenAIProviderAdapterOptions {
	/** OpenAI API key */
	readonly apiKey: string
	/** Model to use (default: 'gpt-4o') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.openai.com/v1') */
	readonly baseURL?: string
	/** Organization ID */
	readonly organization?:  string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
	/** Custom streamer adapter (optional, default streamer used if not provided) */
	readonly streamer?:  StreamerAdapterInterface
}

/**
 * Anthropic provider adapter options. 
 *
 * Streaming is native — no configuration needed. 
 * SSE parsing is handled internally. 
 */
export interface AnthropicProviderAdapterOptions {
	/** Anthropic API key */
	readonly apiKey:  string
	/** Model to use (default:  'claude-3-5-sonnet-20241022') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.anthropic.com') */
	readonly baseURL?: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
	/** Custom streamer adapter (optional, default streamer used if not provided) */
	readonly streamer?: StreamerAdapterInterface
}

/**
 * Ollama provider adapter options. 
 *
 * Ollama is the recommended way to test adapters during development
 * without incurring API costs.  It runs models locally. 
 *
 * Streaming is native — no configuration needed.
 * SSE parsing is handled internally.
 *
 * @see https://ollama.ai/
 */
export interface OllamaProviderAdapterOptions {
	/** Model to use (e.g., 'llama3', 'mistral', 'codellama') */
	readonly model: string
	/** Base URL for Ollama API (default: 'http://localhost:11434') */
	readonly baseURL?: string
	/** Keep model loaded in memory (default: true) */
	readonly keepAlive?: boolean | string
	/** Request timeout in ms (default: 120000) */
	readonly timeout?: number
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
	/** Custom streamer adapter (optional, default streamer used if not provided) */
	readonly streamer?: StreamerAdapterInterface
}

/**
 * node-llama-cpp provider adapter options. 
 *
 * node-llama-cpp runs LLaMA models locally using llama. cpp bindings.
 * This adapter requires the consumer to pass initialized node-llama-cpp
 * objects (LlamaContext) at runtime.
 *
 * IMPORTANT: node-llama-cpp is NOT a runtime dependency. Types are imported
 * using `import type` to avoid runtime dependencies.  Consumers must have
 * node-llama-cpp installed and pass the required instances.
 *
 * Streaming is native — no configuration needed.
 *
 * @see https://github.com/withcatai/node-llama-cpp
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
 * import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
 *
 * const llama = await getLlama()
 * const model = await llama. loadModel({ modelPath: './llama-3-8b. gguf' })
 * const context = await model.createContext()
 *
 * const provider = createNodeLlamaCppProviderAdapter({
 *   context,
 *   modelName: 'llama3',
 * })
 * ```
 */
export interface NodeLlamaCppProviderAdapterOptions {
	/**
	 * Initialized LlamaContext from node-llama-cpp. 
	 * The consumer is responsible for creating and managing this context.
	 */
	readonly context:  NodeLlamaCppContext
	/**
	 * Chat wrapper instance for formatting messages.
	 * Optional — if not provided, will use messages as-is.
	 */
	readonly chatWrapper?: NodeLlamaCppChatWrapper
	/** Model name for identification (default: 'node-llama-cpp') */
	readonly modelName?: string
	/** Request timeout in ms (default: 120000) */
	readonly timeout?: number
	/** Default generation options */
	readonly defaultOptions?:  GenerationDefaults
	/** Custom streamer adapter (optional, default streamer used if not provided) */
	readonly streamer?: StreamerAdapterInterface
}

/**
 * HuggingFace Transformers provider adapter options. 
 *
 * Uses @huggingface/transformers TextGenerationPipeline for generating
 * text completions locally in the browser or Node.js. 
 *
 * IMPORTANT: @huggingface/transformers is NOT a runtime dependency. Types are
 * imported using `import type` to avoid runtime dependencies.  Consumers must
 * have @huggingface/transformers installed and pass the required pipeline. 
 *
 * Streaming is native — TextStreamer is used internally.
 *
 * @see https://huggingface.co/docs/transformers. js
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
 * ```
 */
export interface HuggingFaceProviderAdapterOptions {
	/**
	 * Initialized TextGenerationPipeline from @huggingface/transformers. 
	 * The consumer is responsible for creating and managing this pipeline. 
	 *
	 * Create with: `await pipeline('text-generation', modelName)`
	 */
	readonly pipeline: HuggingFaceTextGenerationPipeline
	/** Model name for identification (required for metadata) */
	readonly modelName: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
	/** Custom streamer adapter (optional, default streamer used if not provided) */
	readonly streamer?: StreamerAdapterInterface
}

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

/** Common HuggingFace text generation models */
export type HuggingFaceTextGenerationModel =
	| 'Xenova/gpt2'
	| 'Xenova/distilgpt2'
	| 'Xenova/phi-1_5'
	| 'Xenova/TinyLlama-1.1B-Chat-v1.0'
	| 'Xenova/Qwen1.5-0.5B-Chat'
	| 'Xenova/LaMini-Flan-T5-783M'
	| (string & {})

// ============================================================================
// Embedding Adapter Options
// ============================================================================

/** OpenAI embedding adapter options */
export interface OpenAIEmbeddingAdapterOptions {
	/** OpenAI API key */
	readonly apiKey:  string
	/** Model to use (default:  'text-embedding-3-small') */
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
	/** Model to use (default: 'voyage-3') */
	readonly model?: VoyageEmbeddingModel
	/** Base URL for API (default: 'https://api.voyageai.com/v1') */
	readonly baseURL?:  string
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
 * Ollama embedding adapter options. 
 *
 * Ollama supports local embedding generation for development/testing.
 */
export interface OllamaEmbeddingAdapterOptions {
	/** Model to use for embeddings (e.g., 'nomic-embed-text', 'mxbai-embed-large') */
	readonly model: string
	/** Base URL for Ollama API (default: 'http://localhost:11434') */
	readonly baseURL?: string
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

/**
 * node-llama-cpp embedding adapter options.
 *
 * Uses LlamaEmbeddingContext for generating embeddings locally. 
 *
 * IMPORTANT: node-llama-cpp is NOT a runtime dependency. Types are imported
 * using `import type` to avoid runtime dependencies.  Consumers must have
 * node-llama-cpp installed and pass the required instances. 
 *
 * @example
 * ```ts
 * import { getLlama } from 'node-llama-cpp'
 * import { createNodeLlamaCppEmbeddingAdapter } from '@mikesaintsg/adapters'
 *
 * const llama = await getLlama()
 * const model = await llama. loadModel({ modelPath: './nomic-embed-text.gguf' })
 * const embeddingContext = await model.createEmbeddingContext()
 *
 * const embedding = createNodeLlamaCppEmbeddingAdapter({
 *   embeddingContext,
 *   modelName: 'nomic-embed-text',
 * })
 * ```
 */
export interface NodeLlamaCppEmbeddingAdapterOptions {
	/**
	 * Initialized LlamaEmbeddingContext from node-llama-cpp.
	 * The consumer is responsible for creating and managing this context.
	 */
	readonly embeddingContext: NodeLlamaCppEmbeddingContext
	/** Model name for identification (default: 'node-llama-cpp-embedding') */
	readonly modelName?: string
	/** Embedding dimensions (will be auto-detected if not provided) */
	readonly dimensions?:  number
}

/**
 * HuggingFace Transformers embedding adapter options.
 *
 * Uses @huggingface/transformers FeatureExtractionPipeline for generating
 * embeddings locally in the browser or Node.js.
 *
 * IMPORTANT:  @huggingface/transformers is NOT a runtime dependency. Types are
 * imported using `import type` to avoid runtime dependencies.  Consumers must
 * have @huggingface/transformers installed and pass the required pipeline.
 *
 * @see https://huggingface.co/docs/transformers.js
 *
 * @example
 * ```ts
 * import { pipeline } from '@huggingface/transformers'
 * import { createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'
 *
 * const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
 *
 * const embedding = createHuggingFaceEmbeddingAdapter({
 *   pipeline:  extractor,
 *   modelName:  'all-MiniLM-L6-v2',
 *   dimensions: 384,
 * })
 * ```
 */
export interface HuggingFaceEmbeddingAdapterOptions {
	/**
	 * Initialized FeatureExtractionPipeline from @huggingface/transformers.
	 * The consumer is responsible for creating and managing this pipeline.
	 *
	 * Create with: `await pipeline('feature-extraction', modelName)`
	 */
	readonly pipeline: HuggingFaceFeatureExtractionPipeline
	/** Model name for identification (required for metadata) */
	readonly modelName: string
	/** Embedding dimensions (required for metadata) */
	readonly dimensions: number
	/**
	 * Pooling strategy for embeddings. 
	 * - 'mean': Mean pooling (recommended for most models)
	 * - 'cls':  Use CLS token embedding
	 * - 'none': No pooling, returns full sequence
	 * @default 'mean'
	 */
	readonly pooling?: HuggingFacePoolingStrategy
	/**
	 * Whether to normalize embeddings to unit length.
	 * Recommended for similarity search.
	 * @default true
	 */
	readonly normalize?: boolean
}

/** Pooling strategy for HuggingFace embeddings */
export type HuggingFacePoolingStrategy = 'none' | 'mean' | 'cls'

/** Common HuggingFace embedding models */
export type HuggingFaceEmbeddingModel =
	| 'Xenova/all-MiniLM-L6-v2'
	| 'Xenova/all-mpnet-base-v2'
	| 'Xenova/paraphrase-MiniLM-L6-v2'
	| 'Xenova/bert-base-uncased'
	| 'Xenova/multilingual-e5-small'
	| 'Xenova/bge-small-en-v1.5'
	| 'Xenova/gte-small'
	| 'sentence-transformers/all-MiniLM-L6-v2'
	| (string & {})

// ============================================================================
// Policy Adapter Options
// ============================================================================

/**
 * Exponential retry adapter options.
 * Creates a RetryAdapterInterface with exponential backoff.
 */
export interface ExponentialRetryAdapterOptions {
	/** Maximum number of retry attempts (default: 3) */
	readonly maxAttempts?:  number
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
	readonly onRetry?:  (error: unknown, attempt: number, delayMs: number) => void
}

/**
 * Linear retry adapter options. 
 * Creates a RetryAdapterInterface with fixed delays.
 */
export interface LinearRetryAdapterOptions {
	/** Maximum number of retry attempts (default:  3) */
	readonly maxAttempts?: number
	/** Fixed delay in ms (default: 1000) */
	readonly delayMs?: number
	/** Error codes that should trigger retry */
	readonly retryableCodes?:  readonly AdapterErrorCode[]
	/** Called before each retry attempt */
	readonly onRetry?: (error:  unknown, attempt: number, delayMs:  number) => void
}

/**
 * Token bucket rate limit adapter options.
 * Creates a RateLimitAdapterInterface using token bucket algorithm. 
 */
export interface TokenBucketRateLimitAdapterOptions {
	/** Maximum requests per minute (default: 60) */
	readonly requestsPerMinute?: number
	/** Maximum concurrent requests (default: 10) */
	readonly maxConcurrent?:  number
	/** Burst size — tokens added per refill (default: 10) */
	readonly burstSize?:  number
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
	readonly onEvict?: (text: string, embedding:  Embedding) => void
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
	readonly database:  MinimalDatabaseAccess
	/** Store name for cache entries (default: 'embedding_cache') */
	readonly storeName?: string
	/** Time-to-live in ms (default: 604800000 = 7 days) */
	readonly ttlMs?: number
}

/**
 * Batch adapter options.
 * Creates a BatchAdapterInterface with configurable settings.
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
 * Cohere reranker adapter options. 
 * Creates a RerankerAdapterInterface using Cohere API.
 */
export interface CohereRerankerAdapterOptions {
	/** Cohere API key */
	readonly apiKey:  string
	/** Model to use (default:  'rerank-english-v3.0') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.cohere. ai/v1') */
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
// Transform Adapter Options
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
	readonly toolChoice?:  AnthropicToolChoice
}

// ============================================================================
// Persistence Adapter Options
// ============================================================================

/** IndexedDB vector persistence options */
export interface IndexedDBVectorPersistenceOptions {
	/** Database access interface */
	readonly database: MinimalDatabaseAccess
	/** Documents store name (default: 'documents') */
	readonly documentsStore?: string
	/** Metadata store name (default:  'metadata') */
	readonly metadataStore?: string
}

/** OPFS vector persistence options */
export interface OPFSVectorPersistenceOptions {
	/** Directory access interface */
	readonly directory: MinimalDirectoryAccess
	/** Chunk size for large files (default: 100) */
	readonly chunkSize?: number
}

/** HTTP vector persistence options */
export interface HTTPVectorPersistenceOptions {
	/** Base URL for API */
	readonly baseURL:  string
	/** Additional headers */
	readonly headers?:  Readonly<Record<string, string>>
	/** Request timeout in ms (default: 30000) */
	readonly timeout?: number
}

/** IndexedDB session persistence options */
export interface IndexedDBSessionPersistenceOptions {
	/** Database name (default: 'mikesaintsg-sessions') */
	readonly databaseName?: string
	/** Store name (default: 'sessions') */
	readonly storeName?: string
	/** Time-to-live for sessions in ms (default:  7 days) */
	readonly ttlMs?: number
}

// ============================================================================
// Context Builder Adapter Options
// ============================================================================

/** Deduplication adapter options */
export interface DeduplicationAdapterOptions {
	/** Strategy for selecting which frame to keep */
	readonly strategy?:  DeduplicationStrategy
}

/** Truncation adapter options */
export interface TruncationAdapterOptions {
	/** Whether to preserve system frames */
	readonly preserveSystem?: boolean
}

/** Priority weights configuration */
export type PriorityWeights = Partial<Record<FramePriority, number>>

/** Priority adapter options */
export interface PriorityAdapterOptions {
	/** Custom weights for each priority level */
	readonly weights?: PriorityWeights
}

// ============================================================================
// External Dependency Interfaces (Minimal)
// ============================================================================

/**
 * Minimal interface for node-llama-cpp LlamaContext. 
 * This allows consumers to pass their own context without importing
 * node-llama-cpp at runtime.
 */
export interface NodeLlamaCppContext {
	/** Get a sequence for evaluation */
	getSequence(): NodeLlamaCppContextSequence
	/** The model associated with this context */
	readonly model: NodeLlamaCppModel
}

/**
 * Minimal interface for node-llama-cpp LlamaContextSequence.
 */
export interface NodeLlamaCppContextSequence {
	/** Evaluate tokens and generate a response */
	evaluate(
		tokens: readonly number[],
		options?: NodeLlamaCppEvaluateOptions
	): AsyncGenerator<number, void, unknown>
}

/**
 * Minimal interface for node-llama-cpp LlamaModel.
 */
export interface NodeLlamaCppModel {
	/** Tokenize text into tokens */
	tokenize(text:  string, options?: { readonly special?: boolean }): readonly number[]
	/** Detokenize tokens back to text */
	detokenize(tokens:  readonly number[]): string
	/** Model tokens (BOS, EOS, etc.) */
	readonly tokens: {
		readonly bos?:  number
		readonly eos?: number
	}
}

/**
 * Minimal interface for node-llama-cpp LlamaEmbeddingContext.
 */
export interface NodeLlamaCppEmbeddingContext {
	/** Get embedding for text */
	getEmbeddingFor(text: string): Promise<NodeLlamaCppEmbedding>
}

/**
 * Minimal interface for node-llama-cpp LlamaEmbedding.
 */
export interface NodeLlamaCppEmbedding {
	/** The embedding vector */
	readonly vector: readonly number[]
}

/**
 * Minimal interface for node-llama-cpp ChatWrapper.
 */
export interface NodeLlamaCppChatWrapper {
	/** Generate context state from chat history */
	generateContextState(options:  {
		readonly chatHistory: readonly NodeLlamaCppChatHistoryItem[]
		readonly availableFunctions?:  Record<string, unknown>
		readonly documentFunctionParams?: boolean
	}): {
		readonly contextText: NodeLlamaCppLlamaText
		readonly stopGenerationTriggers: readonly (readonly number[])[]
	}
}

/**
 * Minimal interface for node-llama-cpp LlamaText.
 */
export interface NodeLlamaCppLlamaText {
	/** Convert to tokenized form */
	tokenize(tokenizer: {
		tokenize(text: string, options?: { special?: boolean }): readonly number[]
	}): readonly number[]
}

/**
 * Minimal interface for node-llama-cpp ChatHistoryItem. 
 */
export type NodeLlamaCppChatHistoryItem =
	| { readonly type: 'system'; readonly text: string }
	| { readonly type: 'user'; readonly text:  string }
	| { readonly type: 'model'; readonly response: readonly string[] }

/**
 * Minimal interface for node-llama-cpp evaluate options.
 */
export interface NodeLlamaCppEvaluateOptions {
	readonly temperature?: number
	readonly topP?: number
	readonly topK?:  number
	readonly maxTokens?: number
	readonly stopOnBos?: boolean
	readonly stopOnEos?:  boolean
	readonly signal?: AbortSignal
}

/**
 * Minimal interface for HuggingFace FeatureExtractionPipeline. 
 * This allows consumers to pass their own pipeline without importing
 * @huggingface/transformers at runtime.
 */
export interface HuggingFaceFeatureExtractionPipeline {
	/**
	 * Extract features from text(s).
	 * @param texts - One or more texts to embed
	 * @param options - Pipeline options for pooling and normalization
	 * @returns A tensor containing the embeddings
	 */
	(
		texts: string | readonly string[],
		options?: HuggingFaceFeatureExtractionOptions
	): Promise<HuggingFaceTensor>
	/**
	 * Dispose of the pipeline resources.
	 */
	dispose? (): Promise<void>
}

/** Options for HuggingFace feature extraction */
export interface HuggingFaceFeatureExtractionOptions {
	/** Pooling strategy */
	readonly pooling?: HuggingFacePoolingStrategy
	/** Whether to normalize to unit length */
	readonly normalize?: boolean
}

/**
 * Minimal interface for HuggingFace TextGenerationPipeline. 
 * This allows consumers to pass their own pipeline without importing
 * @huggingface/transformers at runtime.
 */
export interface HuggingFaceTextGenerationPipeline {
	/**
	 * Generate text from input prompt(s).
	 * @param texts - One or more prompts to complete
	 * @param options - Generation options
	 * @returns Generated text output(s)
	 */
	(
		texts: string | readonly string[],
		options?: HuggingFaceTextGenerationOptions
	): Promise<HuggingFaceTextGenerationOutput | readonly HuggingFaceTextGenerationOutput[]>
	/**
	 * The underlying model for direct generation with streaming. 
	 * This is exposed by the Pipeline class. 
	 */
	readonly model?:  HuggingFacePreTrainedModel
	/**
	 * The tokenizer used by the pipeline.
	 * Required for creating a TextStreamer internally.
	 */
	readonly tokenizer?: HuggingFaceTokenizer
	/**
	 * Dispose of the pipeline resources.
	 */
	dispose?(): Promise<void>
}

/** Options for HuggingFace text generation */
export interface HuggingFaceTextGenerationOptions {
	/** The maximum numbers of tokens to generate */
	readonly max_new_tokens?: number
	/** Temperature for sampling */
	readonly temperature?: number
	/** Top-p (nucleus) sampling */
	readonly top_p?: number
	/** Top-k sampling */
	readonly top_k?: number
	/** Whether to use sampling; use greedy decoding otherwise */
	readonly do_sample?: boolean
	/** Repetition penalty */
	readonly repetition_penalty?: number
	/** If false, only the new generated text is returned */
	readonly return_full_text?:  boolean
	/** Streamer for token-by-token output (used internally) */
	readonly streamer?: HuggingFaceBaseStreamer
}

/** Output from HuggingFace text generation */
export interface HuggingFaceTextGenerationOutput {
	/** The generated text */
	readonly generated_text: string
}

/**
 * Minimal interface for HuggingFace Tensor.
 * Represents the output from feature extraction.
 */
export interface HuggingFaceTensor {
	/** The tensor data as a typed array */
	readonly data: Float32Array | Float64Array | Int32Array | BigInt64Array | Uint8Array
	/** The dimensions of the tensor [batch_size, sequence_length, hidden_size] or [batch_size, hidden_size] */
	readonly dims: readonly number[]
	/** The data type of the tensor */
	readonly type: string
	/** The number of elements in the tensor */
	readonly size: number
	/**
	 * Convert tensor data to a n-dimensional JS list.
	 * @returns Nested array representation of the tensor
	 */
	tolist(): unknown[]
	/**
	 * Dispose of tensor resources.
	 */
	dispose? (): void
}

/**
 * Minimal interface for HuggingFace PreTrainedModel. 
 * Used for accessing the model's generate method with streaming support.
 */
export interface HuggingFacePreTrainedModel {
	/**
	 * Generate method with full streaming support.
	 * @param options - Generation parameters including streamer
	 * @returns Generated output tensor
	 */
	generate(options:  HuggingFaceGenerateOptions): Promise<HuggingFaceModelOutput>
}

/**
 * Options for the model's generate method. 
 * Includes streamer for token-by-token output. 
 */
export interface HuggingFaceGenerateOptions {
	/** Input tokens as a tensor */
	readonly inputs?:  HuggingFaceTensor
	/** Generation configuration */
	readonly generation_config?: HuggingFaceGenerationConfig
	/** Streamer for receiving tokens as they are generated (used internally) */
	readonly streamer?:  HuggingFaceBaseStreamer
}

/**
 * Generation configuration for HuggingFace models. 
 */
export interface HuggingFaceGenerationConfig {
	/** Maximum number of new tokens to generate */
	readonly max_new_tokens?: number
	/** Temperature for sampling */
	readonly temperature?: number
	/** Top-p (nucleus) sampling */
	readonly top_p?:  number
	/** Top-k sampling */
	readonly top_k?: number
	/** Whether to use sampling */
	readonly do_sample?: boolean
}

/**
 * Minimal interface for HuggingFace model output.
 */
export interface HuggingFaceModelOutput {
	/** Output tensor data */
	readonly data?:  readonly bigint[]
	/** Dimensions of the output */
	readonly dims?:  readonly number[]
}

/**
 * Minimal interface for HuggingFace tokenizer.
 * Required for decoding tokens internally.
 */
export interface HuggingFaceTokenizer {
	/**
	 * Encode text to token IDs.
	 * @param text - Text to encode
	 * @returns Encoded input with input_ids tensor
	 */
	(text: string): HuggingFaceEncodedInput
	/**
	 * Decode token IDs back to text.
	 * @param tokenIds - Token IDs to decode
	 * @param options - Decode options
	 * @returns Decoded text
	 */
	decode(
		tokenIds: readonly bigint[] | readonly number[],
		options?: { skip_special_tokens?: boolean }
	): string
}

/**
 * Encoded input from tokenizer.
 */
export interface HuggingFaceEncodedInput {
	/** Input IDs tensor */
	readonly input_ids:  HuggingFaceTensor
}

/**
 * Base interface for HuggingFace streamers.
 * Used internally by the HuggingFace provider adapter.
 */
export interface HuggingFaceBaseStreamer {
	/**
	 * Called to push new tokens during generation.
	 * @param value - Token IDs
	 */
	put(value: readonly (readonly bigint[])[]): void
	/**
	 * Called to signal end of generation.
	 */
	end(): void
}

// ============================================================================
// API Response Types (Internal to Adapters)
// ============================================================================

/** OpenAI chat completion chunk */
export interface OpenAIChatCompletionChunk {
	readonly id: string
	readonly object: 'chat.completion. chunk'
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
	readonly role?:  string
	readonly content?:  string
	readonly tool_calls?: readonly OpenAIToolCallDelta[]
}

/** OpenAI tool call delta */
export interface OpenAIToolCallDelta {
	readonly index: number
	readonly id?:  string
	readonly type?:  'function'
	readonly function?: {
		readonly name?:  string
		readonly arguments?: string
	}
}

/** OpenAI embedding response */
export interface OpenAIEmbeddingResponse {
	readonly object: 'list'
	readonly data: readonly OpenAIEmbeddingData[]
	readonly model: string
	readonly usage: {
		readonly prompt_tokens: number
		readonly total_tokens: number
	}
}

/** OpenAI embedding data */
export interface OpenAIEmbeddingData {
	readonly object: 'embedding'
	readonly embedding: readonly number[]
	readonly index: number
}

/** Voyage embedding response */
export interface VoyageEmbeddingResponse {
	readonly object: 'list'
	readonly data: readonly VoyageEmbeddingData[]
	readonly model: string
	readonly usage: {
		readonly total_tokens: number
	}
}

/** Voyage embedding data */
export interface VoyageEmbeddingData {
	readonly object: 'embedding'
	readonly embedding: readonly number[]
	readonly index:  number
}

/** Anthropic message stream event */
export interface AnthropicMessageStreamEvent {
	readonly type: string
	readonly index?:  number
	readonly content_block?:  AnthropicContentBlock
	readonly delta?: AnthropicDelta
}

/** Anthropic content block */
export interface AnthropicContentBlock {
	readonly type: 'text' | 'tool_use'
	readonly text?:  string
	readonly id?: string
	readonly name?: string
	readonly input?:  unknown
}

/** Anthropic delta */
export interface AnthropicDelta {
	readonly type: string
	readonly text?: string
	readonly partial_json?: string
}

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
	readonly content:  string
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
	readonly total_duration?:  number
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
	readonly load_duration?:  number
	readonly prompt_eval_count?:  number
	readonly prompt_eval_duration?:  number
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
	readonly id?:  string
	readonly type?:  'function'
	readonly function:  {
		readonly name:  string
		readonly arguments:  Readonly<Record<string, unknown>>
	}
}

/** Ollama embedding request */
export interface OllamaEmbeddingRequest {
	readonly model:  string
	readonly input: string | readonly string[]
	readonly truncate?: boolean
	readonly keep_alive?: boolean | string
}

/** Ollama embedding response */
export interface OllamaEmbeddingResponse {
	readonly model:  string
	readonly embeddings: readonly (readonly number[])[]
	readonly total_duration?: number
	readonly load_duration?: number
	readonly prompt_eval_count?: number
}

// ============================================================================
// SSE Parsing Types (Internal to Adapters)
// ============================================================================

/**
 * SSE event from parsing.
 * Used internally for shared SSE parsing logic.
 */
export interface SSEEvent {
	readonly event?:  string
	readonly data:  string
	readonly id?: string
	readonly retry?: number
}

/**
 * SSE parser options.
 * SSE parsing is internal to each provider adapter.
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

// ============================================================================
// Factory Function Types
// ============================================================================

/** Factory function for streamer adapter */
export type CreateStreamerAdapter = () => StreamerAdapterInterface

/** Factory function for OpenAI provider adapter */
export type CreateOpenAIProviderAdapter = (
	options: OpenAIProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for Anthropic provider adapter */
export type CreateAnthropicProviderAdapter = (
	options: AnthropicProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for Ollama provider adapter */
export type CreateOllamaProviderAdapter = (
	options: OllamaProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for node-llama-cpp provider adapter */
export type CreateNodeLlamaCppProviderAdapter = (
	options: NodeLlamaCppProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for HuggingFace provider adapter */
export type CreateHuggingFaceProviderAdapter = (
	options: HuggingFaceProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for OpenAI embedding adapter */
export type CreateOpenAIEmbeddingAdapter = (
	options: OpenAIEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for Voyage embedding adapter */
export type CreateVoyageEmbeddingAdapter = (
	options:  VoyageEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for Ollama embedding adapter */
export type CreateOllamaEmbeddingAdapter = (
	options: OllamaEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for node-llama-cpp embedding adapter */
export type CreateNodeLlamaCppEmbeddingAdapter = (
	options: NodeLlamaCppEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for HuggingFace embedding adapter */
export type CreateHuggingFaceEmbeddingAdapter = (
	options:  HuggingFaceEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for OpenAI tool format adapter */
export type CreateOpenAIToolFormatAdapter = (
	options?:  OpenAIToolFormatAdapterOptions
) => ToolFormatAdapterInterface

/** Factory function for Anthropic tool format adapter */
export type CreateAnthropicToolFormatAdapter = (
	options?: AnthropicToolFormatAdapterOptions
) => ToolFormatAdapterInterface

/** Factory function for tool call bridge */
export type CreateToolCallBridge = (
	options:  ToolCallBridgeOptions
) => ToolCallBridgeInterface

/** Factory function for retrieval tool */
export type CreateRetrievalTool = (
	options: RetrievalToolOptions
) => RetrievalToolInterface

/** Factory function for session persistence */
export type CreateIndexedDBSessionPersistence = (
	options?:  IndexedDBSessionPersistenceOptions
) => SessionPersistenceInterface

/** Factory function for IndexedDB vector persistence */
export type CreateIndexedDBVectorPersistence = (
	options:  IndexedDBVectorPersistenceOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for OPFS vector persistence */
export type CreateOPFSVectorPersistence = (
	options: OPFSVectorPersistenceOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for HTTP vector persistence */
export type CreateHTTPVectorPersistence = (
	options: HTTPVectorPersistenceOptions
) => VectorStorePersistenceAdapterInterface

// ============================================================================
// Policy Adapter Factory Types
// ============================================================================

/** Factory for exponential retry adapter */
export type CreateExponentialRetryAdapter = (
	options?:  ExponentialRetryAdapterOptions
) => RetryAdapterInterface

/** Factory for linear retry adapter */
export type CreateLinearRetryAdapter = (
	options?: LinearRetryAdapterOptions
) => RetryAdapterInterface

/** Factory for token bucket rate limit adapter */
export type CreateTokenBucketRateLimitAdapter = (
	options?: TokenBucketRateLimitAdapterOptions
) => RateLimitAdapterInterface

/** Factory for sliding window rate limit adapter */
export type CreateSlidingWindowRateLimitAdapter = (
	options?: SlidingWindowRateLimitAdapterOptions
) => RateLimitAdapterInterface

// ============================================================================
// Enhancement Adapter Factory Types
// ============================================================================

/** Factory for LRU cache adapter */
export type CreateLRUCacheAdapter = (
	options?:  LRUCacheAdapterOptions
) => EmbeddingCacheAdapterInterface

/** Factory for TTL cache adapter */
export type CreateTTLCacheAdapter = (
	options?:  TTLCacheAdapterOptions
) => EmbeddingCacheAdapterInterface

/** Factory for IndexedDB cache adapter */
export type CreateIndexedDBCacheAdapter = (
	options:  IndexedDBCacheAdapterOptions
) => EmbeddingCacheAdapterInterface

/** Factory for batch adapter */
export type CreateBatchAdapter = (
	options?: BatchAdapterOptions
) => BatchAdapterInterface

/** Factory for Cohere reranker adapter */
export type CreateCohereRerankerAdapter = (
	options:  CohereRerankerAdapterOptions
) => RerankerAdapterInterface

/** Factory for cross-encoder reranker adapter */
export type CreateCrossEncoderRerankerAdapter = (
	options: CrossEncoderRerankerAdapterOptions
) => RerankerAdapterInterface

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

/** Factory for deduplication adapter */
export type CreateDeduplicationAdapter = (
	options?: DeduplicationAdapterOptions
) => DeduplicationAdapterInterface

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

/** Factory for priority adapter */
export type CreatePriorityAdapter = (
	options?: PriorityAdapterOptions
) => PriorityAdapterInterface
