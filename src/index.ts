/**
 * @mikesaintsg/adapters
 *
 * Zero-dependency adapter implementations for the @mikesaintsg ecosystem.
 *
 * This package provides:
 * - Provider adapters for LLM text generation (OpenAI, Anthropic, Ollama, etc.)
 * - Streaming adapters for token emission and SSE parsing
 * - Embedding adapters for vector generation
 * - Policy adapters for retry and rate limiting
 * - Enhancement adapters for caching, batching, and reranking
 * - Transform adapters for tool format conversion and similarity scoring
 * - Persistence adapters for IndexedDB, OPFS, and HTTP storage
 * - Context builder adapters for deduplication, truncation, and priority
 *
 * All provider adapters stream natively with SSE parsing built-in.
 * Streaming is not opt-in — it is the native behavior.
 */

// ============================================================================
// Types (public API)
// ============================================================================

export type * from './types.js'

// ============================================================================
// Helpers (public API)
// ============================================================================

export * from './helpers.js'

// ============================================================================
// Constants (public API)
// ============================================================================

export * from './constants.js'

// ============================================================================
// Factory Functions (public API)
// ============================================================================

export * from './factories.js'

// ============================================================================
// Class Exports (for advanced usage)
// ============================================================================

// Streamers
export * from './core/streamers/index.js'

// Providers
export * from './core/providers/index.js'

// Embeddings
export * from './core/embeddings/index.js'

// Policies
export * from './core/policies/index.js'

// Enhancements (caches, batching, rerankers)
export * from './core/enhancements/index.js'

// Transforms (formatters, similarities)
export * from './core/transforms/index.js'

// Persistence
export * from './core/persistence/index.js'

// Context Builder
export * from './core/contextbuilder/index.js'
