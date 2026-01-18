/**
 * @mikesaintsg/adapters
 *
 * Retry adapters implementing RetryAdapterInterface.
 * Provides exponential and linear retry strategies.
 */

import type { RetryAdapterInterface } from '@mikesaintsg/core'
import type { ExponentialRetryAdapterOptions, LinearRetryAdapterOptions } from '../types.js'
import {
	RETRY_DEFAULT_MAX_RETRIES,
	RETRY_DEFAULT_INITIAL_DELAY_MS,
	RETRY_DEFAULT_MAX_DELAY_MS,
	RETRY_DEFAULT_BACKOFF_MULTIPLIER,
	DEFAULT_RETRYABLE_CODES,
} from '../constants.js'
import { isAdapterError } from '../errors.js'

/**
 * Create an exponential retry adapter.
 *
 * Implements exponential backoff with optional jitter for transient failures.
 *
 * @param options - Retry configuration options
 * @returns A RetryAdapterInterface implementation
 * @example
 * ```ts
 * const retry = createExponentialRetryAdapter({
 *   maxAttempts: 5,
 *   initialDelayMs: 1000,
 *   maxDelayMs: 30000,
 *   backoffMultiplier: 2,
 *   jitter: true,
 *   onRetry: (error, attempt, delayMs) => {
 *     console.warn(`Retry ${attempt}, waiting ${delayMs}ms`)
 *   },
 * })
 * ```
 */
export function createExponentialRetryAdapter(
	options?: ExponentialRetryAdapterOptions,
): RetryAdapterInterface {
	const {
		maxAttempts = RETRY_DEFAULT_MAX_RETRIES,
		initialDelayMs = RETRY_DEFAULT_INITIAL_DELAY_MS,
		maxDelayMs = RETRY_DEFAULT_MAX_DELAY_MS,
		backoffMultiplier = RETRY_DEFAULT_BACKOFF_MULTIPLIER,
		jitter = true,
		retryableCodes = DEFAULT_RETRYABLE_CODES,
		onRetry,
	} = options ?? {}

	const adapter: RetryAdapterInterface = {
		shouldRetry(error: unknown, attempt: number): boolean {
			if (attempt >= maxAttempts) return false

			// Check if it's an AdapterError with a retryable code
			if (isAdapterError(error)) {
				return retryableCodes.includes(error.code)
			}

			// Network errors (TypeError from fetch) are retryable
			if (error instanceof TypeError) {
				return true
			}

			return false
		},

		getDelay(attempt: number): number {
			// Exponential backoff
			let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1)

			// Apply jitter (±25%)
			if (jitter) {
				const jitterFactor = 0.75 + Math.random() * 0.5
				delay = delay * jitterFactor
			}

			// Cap at max delay
			return Math.min(Math.round(delay), maxDelayMs)
		},

		getMaxAttempts(): number {
			return maxAttempts
		},
	}

	// Only add onRetry if provided
	if (onRetry) {
		adapter.onRetry = onRetry
	}

	return adapter
}

/**
 * Create a linear retry adapter.
 *
 * Implements fixed delay retry strategy.
 *
 * @param options - Retry configuration options
 * @returns A RetryAdapterInterface implementation
 * @example
 * ```ts
 * const retry = createLinearRetryAdapter({
 *   maxAttempts: 3,
 *   delayMs: 2000,
 * })
 * ```
 */
export function createLinearRetryAdapter(
	options?: LinearRetryAdapterOptions,
): RetryAdapterInterface {
	const {
		maxAttempts = RETRY_DEFAULT_MAX_RETRIES,
		delayMs = RETRY_DEFAULT_INITIAL_DELAY_MS,
		retryableCodes = DEFAULT_RETRYABLE_CODES,
		onRetry,
	} = options ?? {}

	const adapter: RetryAdapterInterface = {
		shouldRetry(error: unknown, attempt: number): boolean {
			if (attempt >= maxAttempts) return false

			// Check if it's an AdapterError with a retryable code
			if (isAdapterError(error)) {
				return retryableCodes.includes(error.code)
			}

			// Network errors (TypeError from fetch) are retryable
			if (error instanceof TypeError) {
				return true
			}

			return false
		},

		getDelay(_attempt: number): number {
			return delayMs
		},

		getMaxAttempts(): number {
			return maxAttempts
		},
	}

	// Only add onRetry if provided
	if (onRetry) {
		adapter.onRetry = onRetry
	}

	return adapter
}
