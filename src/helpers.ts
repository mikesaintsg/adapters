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

// ============================================================================
// Type Guards for Common Types
// ============================================================================

/**
 * Type guard to check if a value is a non-null object.
 *
 * @param value - The value to check
 * @returns True if the value is an object (not null)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Type guard to check if a value is a non-empty string.
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0
}

/**
 * Type guard to check if a value is a positive number.
 *
 * @param value - The value to check
 * @returns True if the value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
	return typeof value === 'number' && value > 0 && Number.isFinite(value)
}

/**
 * Type guard to check if a value is a non-negative integer.
 *
 * @param value - The value to check
 * @returns True if the value is a non-negative integer
 */
export function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

// ============================================================================
// HTTP and Network Helpers
// ============================================================================

/**
 * Parse Retry-After header value to milliseconds.
 *
 * @param header - The Retry-After header value (seconds or HTTP date)
 * @returns Retry delay in milliseconds, or undefined if invalid
 *
 * @example
 * ```ts
 * parseRetryAfter('120') // 120000 (2 minutes in ms)
 * parseRetryAfter('Wed, 21 Oct 2015 07:28:00 GMT') // ms until that date
 * parseRetryAfter(null) // undefined
 * ```
 */
export function parseRetryAfter(header: string | null): number | undefined {
	if (header === null || header.length === 0) return undefined

	// Try parsing as seconds
	const seconds = parseInt(header, 10)
	if (!Number.isNaN(seconds) && seconds >= 0) {
		return seconds * 1000
	}

	// Try parsing as HTTP date
	const date = new Date(header)
	if (!Number.isNaN(date.getTime())) {
		const delay = date.getTime() - Date.now()
		return delay > 0 ? delay : 0
	}

	return undefined
}

/**
 * Map HTTP status code to an AdapterErrorCode.
 *
 * @param status - HTTP status code
 * @returns The appropriate AdapterErrorCode
 *
 * @example
 * ```ts
 * mapHttpStatusToErrorCode(401) // 'AUTHENTICATION_ERROR'
 * mapHttpStatusToErrorCode(429) // 'RATE_LIMIT_ERROR'
 * mapHttpStatusToErrorCode(500) // 'SERVICE_ERROR'
 * ```
 */
export function mapHttpStatusToErrorCode(status: number): AdapterErrorCode {
	switch (status) {
		case 401:
		case 403:
			return 'AUTHENTICATION_ERROR'
		case 429:
			return 'RATE_LIMIT_ERROR'
		case 400:
			return 'INVALID_REQUEST_ERROR'
		case 404:
			return 'MODEL_NOT_FOUND_ERROR'
		case 413:
			return 'CONTEXT_LENGTH_ERROR'
		default:
			if (status >= 500) {
				return 'SERVICE_ERROR'
			}
			return 'UNKNOWN_ERROR'
	}
}

/**
 * Map a network error to an AdapterError.
 *
 * @param error - The error to map
 * @returns An AdapterError with appropriate code
 *
 * @example
 * ```ts
 * try {
 *   await fetch(url)
 * } catch (e) {
 *   throw mapNetworkError(e instanceof Error ? e : new Error(String(e)))
 * }
 * ```
 */
export function mapNetworkError(error: Error): AdapterError {
	if (error.name === 'AbortError') {
		return createAdapterError('NETWORK_ERROR', 'Request aborted')
	}
	if (error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout')) {
		return createAdapterError('TIMEOUT_ERROR', error.message)
	}
	return createAdapterError('NETWORK_ERROR', error.message)
}

// ============================================================================
// Vector/Embedding Helpers
// ============================================================================

/**
 * Validate that two vectors have matching dimensions.
 *
 * @param a - First vector
 * @param b - Second vector
 * @throws Error if dimensions don't match
 *
 * @example
 * ```ts
 * validateVectorDimensions(vecA, vecB) // throws if lengths differ
 * ```
 */
export function validateVectorDimensions(a: ArrayLike<number>, b: ArrayLike<number>): void {
	if (a.length !== b.length) {
		throw new Error(`Vector dimensions must match: ${a.length} !== ${b.length}`)
	}
}

/**
 * Check if an array-like value is an empty vector (length 0).
 *
 * @param v - The vector to check
 * @returns True if the vector is empty
 */
export function isEmptyVector(v: ArrayLike<number>): boolean {
	return v.length === 0
}

/**
 * Check if a vector contains only zeros.
 *
 * @param v - The vector to check
 * @returns True if all values are zero
 */
export function isZeroVector(v: ArrayLike<number>): boolean {
	for (const val of Array.from(v)) {
		if (val !== 0) return false
	}
	return true
}

/**
 * Compute the L2 norm (Euclidean length) of a vector.
 *
 * @param v - The vector
 * @returns The L2 norm
 */
export function vectorNorm(v: ArrayLike<number>): number {
	let sum = 0
	for (const val of Array.from(v)) {
		sum += val * val
	}
	return Math.sqrt(sum)
}

/**
 * Compute the dot product of two vectors.
 * Assumes vectors have equal lengths.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product
 */
export function dotProduct(a: ArrayLike<number>, b: ArrayLike<number>): number {
	let sum = 0
	for (let i = 0; i < a.length; i++) {
		const aVal = a[i]
		const bVal = b[i]
		if (aVal !== undefined && bVal !== undefined) {
			sum += aVal * bVal
		}
	}
	return sum
}

// ============================================================================
// JSON Helpers
// ============================================================================

/**
 * Safely parse JSON, returning undefined on failure.
 *
 * @param text - The JSON string to parse
 * @returns The parsed value or undefined
 *
 * @example
 * ```ts
 * safeJsonParse('{"key":"value"}') // { key: 'value' }
 * safeJsonParse('invalid') // undefined
 * ```
 */
export function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text) as unknown
	} catch {
		return undefined
	}
}

/**
 * Safely stringify a value to JSON, returning undefined on failure.
 *
 * @param value - The value to stringify
 * @returns The JSON string or undefined
 */
export function safeJsonStringify(value: unknown): string | undefined {
	try {
		return JSON.stringify(value)
	} catch {
		return undefined
	}
}

// ============================================================================
// Timing Helpers
// ============================================================================

/**
 * Create a delay promise that resolves after specified milliseconds.
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after delay
 *
 * @example
 * ```ts
 * await delay(1000) // Wait 1 second
 * ```
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with optional jitter.
 *
 * @param attempt - Current attempt number (0-based)
 * @param initialDelayMs - Initial delay in ms
 * @param maxDelayMs - Maximum delay cap in ms
 * @param multiplier - Backoff multiplier
 * @param jitter - Whether to add random jitter
 * @returns Delay in milliseconds
 *
 * @example
 * ```ts
 * exponentialDelay(0, 1000, 30000, 2, true) // ~500-1000ms
 * exponentialDelay(3, 1000, 30000, 2, false) // 8000ms
 * ```
 */
export function exponentialDelay(
	attempt: number,
	initialDelayMs: number,
	maxDelayMs: number,
	multiplier: number,
	jitter: boolean,
): number {
	const exponential = initialDelayMs * Math.pow(multiplier, attempt)
	let result = Math.min(exponential, maxDelayMs)
	if (jitter) {
		result = result * (0.5 + Math.random() * 0.5)
	}
	return Math.floor(result)
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Assert a condition is true, throwing an error if not.
 *
 * @param condition - The condition to check
 * @param message - Error message if assertion fails
 * @throws Error if condition is false
 *
 * @example
 * ```ts
 * assert(apiKey.length > 0, 'API key is required')
 * ```
 */
export function assert(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

/**
 * Clamp a number between min and max values.
 *
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The clamped value
 *
 * @example
 * ```ts
 * clamp(5, 0, 10) // 5
 * clamp(-1, 0, 10) // 0
 * clamp(15, 0, 10) // 10
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

/**
 * Convert an unknown value to an Error instance.
 *
 * @param error - The unknown error value
 * @returns An Error instance
 */
export function toError(error: unknown): Error {
	if (error instanceof Error) return error
	return new Error(String(error))
}

// ============================================================================
// Array Helpers
// ============================================================================

/**
 * Split an array into chunks of a specified size.
 *
 * @param array - The array to chunk
 * @param size - Maximum size of each chunk
 * @returns Array of chunks
 *
 * @example
 * ```ts
 * chunkArray([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * chunkArray([1, 2, 3], 5) // [[1, 2, 3]]
 * chunkArray([], 2) // []
 * ```
 */
export function chunkArray<T>(array: readonly T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size))
	}
	return chunks
}

// ============================================================================
// JSON Schema Helpers
// ============================================================================

/** Map of non-standard JSON Schema type names to standard ones */
const JSON_SCHEMA_TYPE_MAP: Readonly<Record<string, string>> = {
	bool: 'boolean',
	int: 'integer',
	float: 'number',
	str: 'string',
	dict: 'object',
	list: 'array',
}

/**
 * Normalize JSON Schema types to standard JSON Schema type names.
 * Recursively processes objects and arrays to normalize all type fields.
 *
 * Common non-standard types that are normalized:
 * - `bool` → `boolean`
 * - `int` → `integer`
 * - `float` → `number`
 * - `str` → `string`
 * - `dict` → `object`
 * - `list` → `array`
 *
 * @param schema - The JSON Schema object (or any value) to normalize
 * @returns A new object with normalized type fields
 *
 * @example
 * ```ts
 * normalizeJsonSchemaTypes({ type: 'bool' }) // { type: 'boolean' }
 * normalizeJsonSchemaTypes({
 *   type: 'object',
 *   properties: {
 *     enabled: { type: 'bool' },
 *     count: { type: 'int' }
 *   }
 * })
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     enabled: { type: 'boolean' },
 * //     count: { type: 'integer' }
 * //   }
 * // }
 * ```
 */
export function normalizeJsonSchemaTypes(schema: unknown): unknown {
	if (schema === null || typeof schema !== 'object') {
		return schema
	}

	if (Array.isArray(schema)) {
		return schema.map((item) => normalizeJsonSchemaTypes(item))
	}

	const result: Record<string, unknown> = {}
	const obj = schema as Record<string, unknown>

	for (const key of Object.keys(obj)) {
		const value = obj[key]

		if (key === 'type' && typeof value === 'string') {
			// Normalize the type field
			result[key] = JSON_SCHEMA_TYPE_MAP[value] ?? value
		} else if (Array.isArray(value) && key === 'type') {
			// Handle type arrays like ["string", "null"]
			result[key] = value.map((t: unknown): unknown =>
				typeof t === 'string' ? (JSON_SCHEMA_TYPE_MAP[t] ?? t) : t,
			)
		} else {
			// Recursively process nested objects/arrays
			result[key] = normalizeJsonSchemaTypes(value)
		}
	}

	return result
}
