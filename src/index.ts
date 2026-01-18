/**
 * @mikesaintsg/adapters
 *
 * Type-safe Core package with full TypeScript support.
 * Zero runtime dependencies.
 */

// Factory functions
export * from './factories.js'

// Error classes
export * from './errors.js'

// Helper functions and type guards
export * from './helpers.js'

// Helper modules
export * from './helpers/index.js'

// Wrapper adapters
export * from './wrappers/index.js'

// Embedding adapters
export * from './embeddings/index.js'

// Provider adapters
export * from './providers/index.js'

// Tool format adapters
export * from './formatters/index.js'

// Persistence adapters
export * from './persistence/index.js'

// Policy adapters (Retry, Rate Limit)
export * from './policy/index.js'

// Enhancement adapters (Cache, Batch)
export * from './enhancement/index.js'

// Transform adapters (Similarity)
export * from './transform/index.js'

// Context builder adapters (Deduplication, Truncation, Priority)
export * from './context/index.js'

// Constants
export * from './constants.js'

// Types (export all types)
export type * from './types.js'
