/**
 * @mikesaintsg/adapters
 *
 * Default constants for all adapters.
 */

import type { AdapterErrorCode } from './types.js'
import type { FramePriority } from '@mikesaintsg/core'

// ============================================================================
// Provider Defaults
// ============================================================================

/** Default OpenAI model */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o'

/** Default OpenAI base URL */
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'

/** Default Anthropic model */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022'

/** Default Anthropic base URL */
export const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com'

/** Default Anthropic API version */
export const DEFAULT_ANTHROPIC_VERSION = '2023-06-01'

/** Default Anthropic max tokens */
export const DEFAULT_ANTHROPIC_MAX_TOKENS = 4096

/** Default Ollama base URL */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'

/** Default Voyage base URL */
export const DEFAULT_VOYAGE_BASE_URL = 'https://api.voyageai.com/v1'

/** Default Cohere base URL */
export const DEFAULT_COHERE_BASE_URL = 'https://api.cohere.ai/v1'

// ============================================================================
// Retry Defaults
// ============================================================================

/** Default maximum retry attempts */
export const DEFAULT_MAX_RETRY_ATTEMPTS = 3

/** Default initial delay in ms for exponential backoff */
export const DEFAULT_INITIAL_RETRY_DELAY_MS = 1000

/** Default maximum delay in ms for exponential backoff */
export const DEFAULT_MAX_RETRY_DELAY_MS = 30000

/** Default backoff multiplier for exponential retry */
export const DEFAULT_BACKOFF_MULTIPLIER = 2

/** Default linear retry delay in ms */
export const DEFAULT_RETRY_LINEAR_DELAY_MS = 1000

// ============================================================================
// Rate Limit Defaults
// ============================================================================

/** Default requests per minute for rate limiting */
export const DEFAULT_REQUESTS_PER_MINUTE = 60

/** Default maximum concurrent requests */
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 10

/** Default burst size for token bucket */
export const DEFAULT_BURST_SIZE = 10

/** Default sliding window size in ms */
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000

// ============================================================================
// Cache Defaults
// ============================================================================

/** Default cache max size */
export const DEFAULT_CACHE_MAX_SIZE = 1000

/** Default cache TTL in ms (1 hour) */
export const DEFAULT_CACHE_TTL_MS = 3600000

/** Default IndexedDB cache TTL in ms (7 days) */
export const DEFAULT_INDEXEDDB_CACHE_TTL_MS = 604800000

// ============================================================================
// Batch Defaults
// ============================================================================

/** Default batch size */
export const DEFAULT_BATCH_SIZE = 100

/** Default batch delay in ms */
export const DEFAULT_BATCH_DELAY_MS = 50

// ============================================================================
// Timeout Defaults
// ============================================================================

/** Default request timeout in ms */
export const DEFAULT_TIMEOUT_MS = 30000

/** Default Ollama timeout in ms */
export const DEFAULT_OLLAMA_TIMEOUT_MS = 120000

/** Default node-llama-cpp timeout in ms */
export const DEFAULT_NODE_LLAMA_CPP_TIMEOUT_MS = 120000

// ============================================================================
// Embedding Defaults
// ============================================================================

/** Default OpenAI embedding model */
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'

/** Default Voyage embedding model */
export const DEFAULT_VOYAGE_EMBEDDING_MODEL = 'voyage-3'

/** Default Cohere reranker model */
export const DEFAULT_COHERE_RERANK_MODEL = 'rerank-english-v3.0'

// ============================================================================
// Persistence Defaults
// ============================================================================

/** Default IndexedDB documents store name */
export const DEFAULT_INDEXEDDB_DOCUMENTS_STORE = 'documents'

/** Default IndexedDB metadata store name */
export const DEFAULT_INDEXEDDB_METADATA_STORE = 'metadata'

/** Default IndexedDB metadata key */
export const DEFAULT_INDEXEDDB_METADATA_KEY = 'vectorstore_metadata'

/** Default IndexedDB cache store name */
export const DEFAULT_CACHE_STORE_NAME = 'embedding_cache'

/** Default IndexedDB session database name */
export const DEFAULT_INDEXEDDB_SESSION_DATABASE = 'mikesaintsg-sessions'

/** Default IndexedDB session store name */
export const DEFAULT_INDEXEDDB_SESSION_STORE = 'sessions'

/** Default session TTL in ms (7 days) */
export const DEFAULT_SESSION_TTL_MS = 604800000

/** Default OPFS metadata file name */
export const DEFAULT_OPFS_METADATA_FILE = 'metadata.json'

/** Default OPFS documents file prefix */
export const DEFAULT_OPFS_DOCUMENTS_PREFIX = 'documents_'

/** Default OPFS chunk size */
export const DEFAULT_OPFS_CHUNK_SIZE = 100

// ============================================================================
// Context Builder Defaults
// ============================================================================

/** Default priority weights for context frames */
export const DEFAULT_PRIORITY_WEIGHTS: Readonly<Record<FramePriority, number>> = {
	critical: 1.0,
	high: 0.75,
	normal: 0.5,
	low: 0.25,
	optional: 0.1,
} as const

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes that should trigger a retry.
 * These are transient errors that may succeed on retry.
 */
export const RETRYABLE_ERROR_CODES: readonly AdapterErrorCode[] = [
	'RATE_LIMIT_ERROR',
	'NETWORK_ERROR',
	'TIMEOUT_ERROR',
	'SERVICE_ERROR',
] as const

/**
 * Get default dimensions for common Ollama embedding models.
 */
export const DEFAULT_OLLAMA_EMBEDDING_DIMENSIONS = 768

export const DEFAULT_OLLAMA_EMBEDDING_MODELS_DIMENSIONS: Readonly<Record<string, number>> = {
	'nomic-embed-text': 768,
	'mxbai-embed-large': 1024,
	'all-minilm': 384,
	'snowflake-arctic-embed': 1024,
} as const

/**
 * Get default dimensions for OpenAI embedding models.
 */
export const DEFAULT_OPENAI_EMBEDDING_DIMENSIONS = 1536

export const DEFAULT_OPENAI_EMBEDDING_MODELS_DIMENSIONS: Readonly<Record<string, number>> = {
	'text-embedding-3-large': 3072,
	'text-embedding-3-small': 1536,
	'ada-002': 1536,
} as const

/**
 * Get default dimensions for Voyage embedding models.
 */
export const DEFAULT_VOYAGE_EMBEDDING_DIMENSIONS = 1024

export const DEFAULT_VOYAGE_EMBEDDING_MODELS_DIMENSIONS: Readonly<Record<string, number>> = {
	'voyage-3-lite': 512,
	'voyage-3': 1024,
	'voyage-code-3': 1024,
	'voyage-2': 1024,
	'voyage-code-2': 1024,
	'voyage-finance-2': 1024,
	'voyage-law-2': 1024,
	'voyage-multilingual-2': 1024,
} as const
