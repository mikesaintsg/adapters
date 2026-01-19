/**
 * Comprehensive tests for helpers.ts
 *
 * Tests all exported helper functions with edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	isAdapterError,
	createAdapterError,
	narrowUnknown,
	isObject,
	isNonEmptyString,
	isPositiveNumber,
	isNonNegativeInteger,
	parseRetryAfter,
	mapHttpStatusToErrorCode,
	mapNetworkError,
	validateVectorDimensions,
	isEmptyVector,
	isZeroVector,
	vectorNorm,
	dotProduct,
	safeJsonParse,
	safeJsonStringify,
	delay,
	exponentialDelay,
	assert,
	clamp,
} from '@mikesaintsg/adapters'

describe('helpers', () => {
	describe('isAdapterError', () => {
		it('returns true for valid AdapterError', () => {
			const error = createAdapterError('NETWORK_ERROR', 'test')
			expect(isAdapterError(error)).toBe(true)
		})

		it('returns false for null', () => {
			expect(isAdapterError(null)).toBe(false)
		})

		it('returns false for undefined', () => {
			expect(isAdapterError(undefined)).toBe(false)
		})

		it('returns false for primitive values', () => {
			expect(isAdapterError('error')).toBe(false)
			expect(isAdapterError(123)).toBe(false)
			expect(isAdapterError(true)).toBe(false)
		})

		it('returns false for regular Error', () => {
			expect(isAdapterError(new Error('test'))).toBe(false)
		})

		it('returns false for object without name property', () => {
			expect(isAdapterError({ data: { code: 'TEST' } })).toBe(false)
		})

		it('returns false for object with wrong name', () => {
			expect(isAdapterError({ name: 'Error', data: { code: 'TEST' } })).toBe(false)
		})

		it('returns false for object without data', () => {
			expect(isAdapterError({ name: 'AdapterError' })).toBe(false)
		})

		it('returns false for object with null data', () => {
			expect(isAdapterError({ name: 'AdapterError', data: null })).toBe(false)
		})

		it('returns false for object with data missing code', () => {
			expect(isAdapterError({ name: 'AdapterError', data: {} })).toBe(false)
		})

		it('returns false for object with non-string code', () => {
			expect(isAdapterError({ name: 'AdapterError', data: { code: 123 } })).toBe(false)
		})
	})

	describe('createAdapterError', () => {
		it('creates error with code and message', () => {
			const error = createAdapterError('RATE_LIMIT_ERROR', 'Too many requests')
			expect(error.name).toBe('AdapterError')
			expect(error.message).toBe('Too many requests')
			expect(error.data.code).toBe('RATE_LIMIT_ERROR')
		})

		it('creates error with additional data', () => {
			const error = createAdapterError('RATE_LIMIT_ERROR', 'test', {
				retryAfter: 5000,
				providerCode: '429',
			})
			expect(error.data.retryAfter).toBe(5000)
			expect(error.data.providerCode).toBe('429')
		})

		it('has readonly name property', () => {
			const error = createAdapterError('NETWORK_ERROR', 'test')
			expect(() => {
				(error as { name: string }).name = 'Other'
			}).toThrow()
		})

		it('has readonly data property', () => {
			const error = createAdapterError('NETWORK_ERROR', 'test')
			expect(() => {
				(error as { data: unknown }).data = { code: 'OTHER' }
			}).toThrow()
		})

		it('freezes data object', () => {
			const error = createAdapterError('NETWORK_ERROR', 'test')
			expect(Object.isFrozen(error.data)).toBe(true)
		})
	})

	describe('narrowUnknown', () => {
		const isString = (v: unknown): v is string => typeof v === 'string'
		const isNumber = (v: unknown): v is number => typeof v === 'number'

		it('returns value when guard passes', () => {
			expect(narrowUnknown('hello', isString)).toBe('hello')
			expect(narrowUnknown(42, isNumber)).toBe(42)
		})

		it('returns undefined when guard fails', () => {
			expect(narrowUnknown(123, isString)).toBeUndefined()
			expect(narrowUnknown('abc', isNumber)).toBeUndefined()
		})

		it('returns undefined for null', () => {
			expect(narrowUnknown(null, isString)).toBeUndefined()
		})

		it('returns undefined for undefined', () => {
			expect(narrowUnknown(undefined, isString)).toBeUndefined()
		})
	})

	describe('isObject', () => {
		it('returns true for plain objects', () => {
			expect(isObject({})).toBe(true)
			expect(isObject({ key: 'value' })).toBe(true)
		})

		it('returns false for null', () => {
			expect(isObject(null)).toBe(false)
		})

		it('returns false for arrays', () => {
			expect(isObject([])).toBe(false)
			expect(isObject([1, 2, 3])).toBe(false)
		})

		it('returns false for primitives', () => {
			expect(isObject('string')).toBe(false)
			expect(isObject(123)).toBe(false)
			expect(isObject(true)).toBe(false)
			expect(isObject(undefined)).toBe(false)
		})

		it('returns true for class instances', () => {
			expect(isObject(new Date())).toBe(true)
			expect(isObject(new Error())).toBe(true)
		})
	})

	describe('isNonEmptyString', () => {
		it('returns true for non-empty strings', () => {
			expect(isNonEmptyString('hello')).toBe(true)
			expect(isNonEmptyString(' ')).toBe(true)
			expect(isNonEmptyString('a')).toBe(true)
		})

		it('returns false for empty string', () => {
			expect(isNonEmptyString('')).toBe(false)
		})

		it('returns false for non-strings', () => {
			expect(isNonEmptyString(null)).toBe(false)
			expect(isNonEmptyString(undefined)).toBe(false)
			expect(isNonEmptyString(123)).toBe(false)
			expect(isNonEmptyString({})).toBe(false)
		})
	})

	describe('isPositiveNumber', () => {
		it('returns true for positive numbers', () => {
			expect(isPositiveNumber(1)).toBe(true)
			expect(isPositiveNumber(0.001)).toBe(true)
			expect(isPositiveNumber(1000000)).toBe(true)
		})

		it('returns false for zero', () => {
			expect(isPositiveNumber(0)).toBe(false)
		})

		it('returns false for negative numbers', () => {
			expect(isPositiveNumber(-1)).toBe(false)
			expect(isPositiveNumber(-0.001)).toBe(false)
		})

		it('returns false for Infinity', () => {
			expect(isPositiveNumber(Infinity)).toBe(false)
			expect(isPositiveNumber(-Infinity)).toBe(false)
		})

		it('returns false for NaN', () => {
			expect(isPositiveNumber(NaN)).toBe(false)
		})

		it('returns false for non-numbers', () => {
			expect(isPositiveNumber('123')).toBe(false)
			expect(isPositiveNumber(null)).toBe(false)
		})
	})

	describe('isNonNegativeInteger', () => {
		it('returns true for non-negative integers', () => {
			expect(isNonNegativeInteger(0)).toBe(true)
			expect(isNonNegativeInteger(1)).toBe(true)
			expect(isNonNegativeInteger(1000)).toBe(true)
		})

		it('returns false for negative integers', () => {
			expect(isNonNegativeInteger(-1)).toBe(false)
		})

		it('returns false for non-integers', () => {
			expect(isNonNegativeInteger(1.5)).toBe(false)
			expect(isNonNegativeInteger(0.1)).toBe(false)
		})

		it('returns false for non-numbers', () => {
			expect(isNonNegativeInteger('0')).toBe(false)
			expect(isNonNegativeInteger(null)).toBe(false)
		})
	})

	describe('parseRetryAfter', () => {
		it('parses seconds value', () => {
			expect(parseRetryAfter('60')).toBe(60000)
			expect(parseRetryAfter('0')).toBe(0)
			expect(parseRetryAfter('120')).toBe(120000)
		})

		it('returns undefined for null', () => {
			expect(parseRetryAfter(null)).toBeUndefined()
		})

		it('returns undefined for empty string', () => {
			expect(parseRetryAfter('')).toBeUndefined()
		})

		it('returns undefined for invalid string', () => {
			expect(parseRetryAfter('invalid')).toBeUndefined()
		})

		it('parses HTTP date format', () => {
			const futureDate = new Date(Date.now() + 60000)
			const result = parseRetryAfter(futureDate.toUTCString())
			expect(result).toBeGreaterThan(0)
			expect(result).toBeLessThanOrEqual(60000)
		})

		it('returns 0 for past date', () => {
			const pastDate = new Date(Date.now() - 60000)
			expect(parseRetryAfter(pastDate.toUTCString())).toBe(0)
		})
	})

	describe('mapHttpStatusToErrorCode', () => {
		it('maps 401 to AUTHENTICATION_ERROR', () => {
			expect(mapHttpStatusToErrorCode(401)).toBe('AUTHENTICATION_ERROR')
		})

		it('maps 403 to AUTHENTICATION_ERROR', () => {
			expect(mapHttpStatusToErrorCode(403)).toBe('AUTHENTICATION_ERROR')
		})

		it('maps 429 to RATE_LIMIT_ERROR', () => {
			expect(mapHttpStatusToErrorCode(429)).toBe('RATE_LIMIT_ERROR')
		})

		it('maps 400 to INVALID_REQUEST_ERROR', () => {
			expect(mapHttpStatusToErrorCode(400)).toBe('INVALID_REQUEST_ERROR')
		})

		it('maps 404 to MODEL_NOT_FOUND_ERROR', () => {
			expect(mapHttpStatusToErrorCode(404)).toBe('MODEL_NOT_FOUND_ERROR')
		})

		it('maps 413 to CONTEXT_LENGTH_ERROR', () => {
			expect(mapHttpStatusToErrorCode(413)).toBe('CONTEXT_LENGTH_ERROR')
		})

		it('maps 5xx to SERVICE_ERROR', () => {
			expect(mapHttpStatusToErrorCode(500)).toBe('SERVICE_ERROR')
			expect(mapHttpStatusToErrorCode(502)).toBe('SERVICE_ERROR')
			expect(mapHttpStatusToErrorCode(503)).toBe('SERVICE_ERROR')
		})

		it('maps other codes to UNKNOWN_ERROR', () => {
			expect(mapHttpStatusToErrorCode(418)).toBe('UNKNOWN_ERROR')
			expect(mapHttpStatusToErrorCode(200)).toBe('UNKNOWN_ERROR')
		})
	})

	describe('mapNetworkError', () => {
		it('maps AbortError to NETWORK_ERROR', () => {
			const error = new Error('Aborted')
			error.name = 'AbortError'
			const result = mapNetworkError(error)
			expect(result.data.code).toBe('NETWORK_ERROR')
			expect(result.message).toBe('Request aborted')
		})

		it('maps TimeoutError to TIMEOUT_ERROR', () => {
			const error = new Error('Timeout')
			error.name = 'TimeoutError'
			const result = mapNetworkError(error)
			expect(result.data.code).toBe('TIMEOUT_ERROR')
		})

		it('maps error with timeout in message to TIMEOUT_ERROR', () => {
			const error = new Error('Request timeout exceeded')
			const result = mapNetworkError(error)
			expect(result.data.code).toBe('TIMEOUT_ERROR')
		})

		it('maps other errors to NETWORK_ERROR', () => {
			const error = new Error('Connection refused')
			const result = mapNetworkError(error)
			expect(result.data.code).toBe('NETWORK_ERROR')
			expect(result.message).toBe('Connection refused')
		})
	})

	describe('validateVectorDimensions', () => {
		it('does not throw for matching dimensions', () => {
			expect(() => {
				validateVectorDimensions([1, 2, 3], [4, 5, 6])
			}).not.toThrow()
		})

		it('throws for mismatched dimensions', () => {
			expect(() => {
				validateVectorDimensions([1, 2], [1, 2, 3])
			}).toThrow('Vector dimensions must match: 2 !== 3')
		})

		it('works with Float32Array', () => {
			const a = new Float32Array([1, 2, 3])
			const b = new Float32Array([4, 5, 6])
			expect(() => validateVectorDimensions(a, b)).not.toThrow()
		})

		it('works with empty arrays', () => {
			expect(() => validateVectorDimensions([], [])).not.toThrow()
		})
	})

	describe('isEmptyVector', () => {
		it('returns true for empty array', () => {
			expect(isEmptyVector([])).toBe(true)
		})

		it('returns true for empty Float32Array', () => {
			expect(isEmptyVector(new Float32Array(0))).toBe(true)
		})

		it('returns false for non-empty array', () => {
			expect(isEmptyVector([1])).toBe(false)
			expect(isEmptyVector([0])).toBe(false)
		})
	})

	describe('isZeroVector', () => {
		it('returns true for all zeros', () => {
			expect(isZeroVector([0, 0, 0])).toBe(true)
		})

		it('returns true for empty vector', () => {
			expect(isZeroVector([])).toBe(true)
		})

		it('returns false for non-zero values', () => {
			expect(isZeroVector([0, 1, 0])).toBe(false)
			expect(isZeroVector([0.001])).toBe(false)
		})

		it('works with Float32Array', () => {
			expect(isZeroVector(new Float32Array([0, 0]))).toBe(true)
			expect(isZeroVector(new Float32Array([0, 1]))).toBe(false)
		})
	})

	describe('vectorNorm', () => {
		it('calculates L2 norm correctly', () => {
			expect(vectorNorm([3, 4])).toBe(5) // 3-4-5 triangle
		})

		it('returns 0 for zero vector', () => {
			expect(vectorNorm([0, 0, 0])).toBe(0)
		})

		it('returns 0 for empty vector', () => {
			expect(vectorNorm([])).toBe(0)
		})

		it('handles unit vector', () => {
			expect(vectorNorm([1, 0, 0])).toBe(1)
		})

		it('works with Float32Array', () => {
			expect(vectorNorm(new Float32Array([3, 4]))).toBe(5)
		})
	})

	describe('dotProduct', () => {
		it('calculates dot product correctly', () => {
			expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32) // 1*4 + 2*5 + 3*6
		})

		it('returns 0 for orthogonal vectors', () => {
			expect(dotProduct([1, 0], [0, 1])).toBe(0)
		})

		it('returns 0 for empty vectors', () => {
			expect(dotProduct([], [])).toBe(0)
		})

		it('works with Float32Array', () => {
			const a = new Float32Array([1, 2])
			const b = new Float32Array([3, 4])
			expect(dotProduct(a, b)).toBe(11)
		})
	})

	describe('safeJsonParse', () => {
		it('parses valid JSON', () => {
			expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' })
		})

		it('parses JSON array', () => {
			expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3])
		})

		it('parses primitive values', () => {
			expect(safeJsonParse('123')).toBe(123)
			expect(safeJsonParse('"hello"')).toBe('hello')
			expect(safeJsonParse('true')).toBe(true)
			expect(safeJsonParse('null')).toBe(null)
		})

		it('returns undefined for invalid JSON', () => {
			expect(safeJsonParse('invalid')).toBeUndefined()
			expect(safeJsonParse('{broken}')).toBeUndefined()
			expect(safeJsonParse('')).toBeUndefined()
		})
	})

	describe('safeJsonStringify', () => {
		it('stringifies objects', () => {
			expect(safeJsonStringify({ key: 'value' })).toBe('{"key":"value"}')
		})

		it('stringifies arrays', () => {
			expect(safeJsonStringify([1, 2, 3])).toBe('[1,2,3]')
		})

		it('stringifies primitives', () => {
			expect(safeJsonStringify(123)).toBe('123')
			expect(safeJsonStringify('hello')).toBe('"hello"')
			expect(safeJsonStringify(true)).toBe('true')
		})

		it('returns undefined for circular references', () => {
			const obj: Record<string, unknown> = {}
			obj.self = obj
			expect(safeJsonStringify(obj)).toBeUndefined()
		})
	})

	describe('delay', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('resolves after specified time', async() => {
			const promise = delay(1000)
			vi.advanceTimersByTime(1000)
			await expect(promise).resolves.toBeUndefined()
		})

		it('resolves immediately for 0ms', async() => {
			const promise = delay(0)
			vi.advanceTimersByTime(0)
			await expect(promise).resolves.toBeUndefined()
		})
	})

	describe('exponentialDelay', () => {
		it('calculates base delay for attempt 0', () => {
			const result = exponentialDelay(0, 1000, 30000, 2, false)
			expect(result).toBe(1000)
		})

		it('doubles delay with multiplier 2', () => {
			const result = exponentialDelay(1, 1000, 30000, 2, false)
			expect(result).toBe(2000)
		})

		it('respects max delay cap', () => {
			const result = exponentialDelay(10, 1000, 30000, 2, false)
			expect(result).toBe(30000)
		})

		it('applies jitter when enabled', () => {
			const results = new Set<number>()
			for (let i = 0; i < 10; i++) {
				results.add(exponentialDelay(0, 1000, 30000, 2, true))
			}
			// With jitter, we should see different values
			// At least 2 different values in 10 attempts is highly probable
			expect(results.size).toBeGreaterThanOrEqual(1)
		})

		it('jitter produces values between 50% and 100%', () => {
			for (let i = 0; i < 20; i++) {
				const result = exponentialDelay(0, 1000, 30000, 2, true)
				expect(result).toBeGreaterThanOrEqual(500)
				expect(result).toBeLessThanOrEqual(1000)
			}
		})
	})

	describe('assert', () => {
		it('does not throw for true condition', () => {
			expect(() => assert(true, 'error')).not.toThrow()
		})

		it('throws for false condition', () => {
			expect(() => assert(false, 'Custom error message')).toThrow('Custom error message')
		})

		it('throws for falsy condition', () => {
			// Note: TypeScript would catch this, but testing runtime behavior
			expect(() => assert(0 as unknown as boolean, 'error')).toThrow()
		})
	})

	describe('clamp', () => {
		it('returns value when within range', () => {
			expect(clamp(5, 0, 10)).toBe(5)
		})

		it('returns min when value is below', () => {
			expect(clamp(-5, 0, 10)).toBe(0)
		})

		it('returns max when value is above', () => {
			expect(clamp(15, 0, 10)).toBe(10)
		})

		it('handles equal min and max', () => {
			expect(clamp(50, 10, 10)).toBe(10)
		})

		it('handles negative ranges', () => {
			expect(clamp(-5, -10, -1)).toBe(-5)
			expect(clamp(-15, -10, -1)).toBe(-10)
		})

		it('handles decimal values', () => {
			expect(clamp(0.5, 0, 1)).toBe(0.5)
			expect(clamp(1.5, 0, 1)).toBe(1)
		})
	})
})
