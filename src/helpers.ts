/**
 * @mikesaintsg/adapters
 *
 * Helper functions and type guards for the adapters package.
 */

import type { AdapterErrorCode, AdapterErrorData } from './types.js'

// ============================================================================
// Error Type and Interface
// ============================================================================

/**
 * AdapterError is the standard error type for all adapter operations.
 * Contains structured error data for programmatic handling.
 */
export interface AdapterError extends Error {
	readonly name: 'AdapterError'
	readonly data: AdapterErrorData
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is an AdapterError.
 *
 * @param error - The error to check
 * @returns True if the error is an AdapterError
 *
 * @example
 * ```ts
 * try {
 *   await provider.generate(messages)
 * } catch (error) {
 *   if (isAdapterError(error)) {
 *     console.log(`Error code: ${error.data.code}`)
 *   }
 * }
 * ```
 */
export function isAdapterError(error: unknown): error is AdapterError {
	if (error === null || typeof error !== 'object') return false
	const e = error as { name?: unknown; data?: unknown }
	if (e.name !== 'AdapterError') return false
	if (e.data === null || typeof e.data !== 'object') return false
	const data = e.data as { code?: unknown }
	return typeof data.code === 'string'
}

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Create an AdapterError with structured error data.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param data - Optional additional error data
 * @returns An AdapterError instance
 *
 * @example
 * ```ts
 * throw createAdapterError(
 *   'RATE_LIMIT_ERROR',
 *   'Rate limit exceeded',
 *   { retryAfter: 60000, providerCode: '429' }
 * )
 * ```
 */
export function createAdapterError(
	code: AdapterErrorCode,
	message: string,
	data?: Omit<AdapterErrorData, 'code'>,
): AdapterError {
	const error = new Error(message) as AdapterError
	Object.defineProperty(error, 'name', {
		value: 'AdapterError',
		writable: false,
		enumerable: true,
		configurable: false,
	})
	Object.defineProperty(error, 'data', {
		value: Object.freeze({ code, ...data }),
		writable: false,
		enumerable: true,
		configurable: false,
	})
	return error
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Narrow an unknown value using a type guard.
 *
 * @param value - The value to narrow
 * @param guard - The type guard function
 * @returns The value if it passes the guard, undefined otherwise
 *
 * @example
 * ```ts
 * const maybeString = narrowUnknown(value, (v): v is string => typeof v === 'string')
 * ```
 */
export function narrowUnknown<T>(
	value: unknown,
	guard: (v: unknown) => v is T,
): T | undefined {
	return guard(value) ? value : undefined
}
