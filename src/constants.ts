/**
 * @mikesaintsg/adapters
 *
 * Shared constants for the core library.
 */

import type { AdapterErrorCode } from './types.js'

// ============================================================================
// OpenAI Constants
// ============================================================================

/** Default OpenAI chat model */
export const OPENAI_DEFAULT_CHAT_MODEL = 'gpt-4o'

/** Default OpenAI embedding model */
export const OPENAI_DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

/** Default dimensions for OpenAI text-embedding-3-small */
export const OPENAI_DEFAULT_EMBEDDING_DIMENSIONS = 1536

/** OpenAI API base URL */
export const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'

// ============================================================================
// Anthropic Constants
// ============================================================================

/** Default Anthropic chat model */
export const ANTHROPIC_DEFAULT_CHAT_MODEL = 'claude-3-5-sonnet-20241022'

/** Anthropic API base URL */
export const ANTHROPIC_API_BASE_URL = 'https://api.anthropic.com'

/** Anthropic API version header */
export const ANTHROPIC_API_VERSION = '2023-06-01'

// ============================================================================
// Voyage AI (Anthropic-recommended) Constants
// ============================================================================

/** Default Voyage AI embedding model (recommended by Anthropic) */
export const VOYAGE_DEFAULT_EMBEDDING_MODEL = 'voyage-2'

/** Default dimensions for Voyage AI voyage-2 */
export const VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS = 1024

/** Voyage AI API base URL */
export const VOYAGE_API_BASE_URL = 'https://api.voyageai.com/v1'

// ============================================================================
// Ollama Constants (Local Development)
// ============================================================================

/** Default Ollama API base URL */
export const OLLAMA_API_BASE_URL = 'http://localhost:11434'

/** Default Ollama chat model */
export const OLLAMA_DEFAULT_CHAT_MODEL = 'llama3'

/** Default Ollama embedding model */
export const OLLAMA_DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text'

/** Default timeout for Ollama requests in milliseconds */
export const OLLAMA_DEFAULT_TIMEOUT = 120000

/** Default Ollama embedding dimensions for nomic-embed-text */
export const OLLAMA_DEFAULT_EMBEDDING_DIMENSIONS = 768

// ============================================================================
// node-llama-cpp Constants (Local Development)
// ============================================================================

/** Default timeout for node-llama-cpp requests in milliseconds */
export const NODE_LLAMA_CPP_DEFAULT_TIMEOUT = 120000

/** Default model name for node-llama-cpp provider */
export const NODE_LLAMA_CPP_DEFAULT_MODEL_NAME = 'node-llama-cpp'

/** Default model name for node-llama-cpp embedding */
export const NODE_LLAMA_CPP_DEFAULT_EMBEDDING_MODEL_NAME = 'node-llama-cpp-embedding'

// ============================================================================
// HuggingFace Transformers Constants (Browser/Node.js)
// ============================================================================

/** Default pooling strategy for HuggingFace embeddings */
export const HUGGINGFACE_DEFAULT_POOLING = 'mean'

/** Default normalization setting for HuggingFace embeddings */
export const HUGGINGFACE_DEFAULT_NORMALIZE = true

// ============================================================================
// Rate Limiting Constants
// ============================================================================

/** Default requests per minute for rate limiting */
export const RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE = 60

/** Default maximum concurrent requests */
export const RATE_LIMIT_DEFAULT_MAX_CONCURRENT = 10

/** Default rate limit window in milliseconds */
export const RATE_LIMIT_DEFAULT_WINDOW_MS = 60000

// ============================================================================
// Retry Constants
// ============================================================================

/** Default maximum retry attempts */
export const RETRY_DEFAULT_MAX_RETRIES = 3

/** Default initial delay for exponential backoff in milliseconds */
export const RETRY_DEFAULT_INITIAL_DELAY_MS = 1000

/** Default maximum delay for exponential backoff in milliseconds */
export const RETRY_DEFAULT_MAX_DELAY_MS = 30000

/** Default backoff multiplier */
export const RETRY_DEFAULT_BACKOFF_MULTIPLIER = 2

// ============================================================================
// Embedding Cache Constants
// ============================================================================

/** Default maximum entries for embedding cache */
export const EMBEDDING_CACHE_DEFAULT_MAX_ENTRIES = 1000

/** Default TTL for embedding cache in milliseconds (1 hour) */
export const EMBEDDING_CACHE_DEFAULT_TTL_MS = 3600000

// ============================================================================
// Batching Constants
// ============================================================================

/** Default maximum batch size for embedding requests */
export const EMBEDDING_BATCH_DEFAULT_MAX_SIZE = 100

/** Default flush delay in milliseconds for batched embeddings */
export const EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS = 50

// ============================================================================
// Persistence Constants
// ============================================================================

/** Default database name for session persistence */
export const INDEXEDDB_DEFAULT_SESSION_DATABASE = 'mikesaintsg-sessions'

/** Default store name for session persistence */
export const INDEXEDDB_DEFAULT_SESSION_STORE = 'sessions'

/** Default TTL for sessions in milliseconds (7 days) */
export const INDEXEDDB_DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Default documents store name for IndexedDB persistence */
export const INDEXEDDB_DEFAULT_DOCUMENTS_STORE = 'documents'

/** Default metadata store name for IndexedDB persistence */
export const INDEXEDDB_DEFAULT_METADATA_STORE = 'metadata'

/** Metadata key for VectorStore in persistence */
export const VECTORSTORE_METADATA_KEY = 'vectorstore_metadata'

/** Default chunk size for OPFS persistence */
export const OPFS_DEFAULT_CHUNK_SIZE = 100

/** Metadata file name for OPFS persistence */
export const OPFS_METADATA_FILE = '_metadata.json'

/** Documents file name prefix for OPFS persistence */
export const OPFS_DOCUMENTS_PREFIX = 'chunk_'

/** Default timeout for HTTP persistence requests in milliseconds */
export const HTTP_DEFAULT_TIMEOUT = 30000

// ============================================================================
// Model Token Multipliers
// ============================================================================

/**
 * Model-specific token estimation multipliers (characters per token).
 *
 * Token counting logic is owned by `@mikesaintsg/inference`.
 * These multipliers can be passed to inference's token counter for improved accuracy.
 */
export const DEFAULT_MODEL_MULTIPLIERS: Readonly<Record<string, number>> = {
	// OpenAI models
	'gpt-4': 4,
	'gpt-4o': 4,
	'gpt-4o-mini': 4,
	'gpt-4-turbo': 4,
	'gpt-3.5-turbo': 4,
	// Anthropic models
	'claude-3-5-sonnet-20241022': 3.5,
	'claude-3-opus-20240229': 3.5,
	'claude-3-sonnet-20240229': 3.5,
	'claude-3-haiku-20240307': 3.5,
	// Ollama models
	'llama2': 4,
	'llama3': 4,
	'mistral': 4,
	'mixtral': 4,
	'codellama': 4,
}

// ============================================================================
// Retryable Error Codes
// ============================================================================

/**
 * Default error codes that should trigger automatic retry.
 * These represent transient errors that may succeed on retry.
 */
export const DEFAULT_RETRYABLE_CODES: readonly AdapterErrorCode[] = [
	'RATE_LIMIT_ERROR',
	'NETWORK_ERROR',
	'TIMEOUT_ERROR',
	'SERVICE_ERROR',
]
