/**
 * Exponential retry adapter implementation.
 * Implements RetryAdapterInterface with exponential backoff and optional jitter.
 */

import type { RetryAdapterInterface } from '@mikesaintsg/core'

import type { AdapterErrorCode, ExponentialRetryAdapterOptions } from '../../types.js'
import { isAdapterError } from '../../helpers.js'
import {
	DEFAULT_MAX_RETRY_ATTEMPTS,
	DEFAULT_INITIAL_RETRY_DELAY_MS,
	DEFAULT_MAX_RETRY_DELAY_MS,
	DEFAULT_BACKOFF_MULTIPLIER,
	RETRYABLE_ERROR_CODES,
} from '../../constants.js'

/**
 * Exponential retry adapter with configurable backoff.
 * Uses exponential backoff with optional jitter to prevent thundering herd.
 */
class ExponentialRetry implements RetryAdapterInterface {
	readonly #maxAttempts: number
	readonly #initialDelayMs: number
	readonly #maxDelayMs: number
	readonly #backoffMultiplier: number
	readonly #jitter: boolean
	readonly #retryableCodes: ReadonlySet<AdapterErrorCode>
	readonly #onRetryCallback: ((error: unknown, attempt: number, delayMs: number) => void) | undefined

	constructor(options: ExponentialRetryAdapterOptions = {}) {
		this.#maxAttempts = options.maxAttempts ?? DEFAULT_MAX_RETRY_ATTEMPTS
		this.#initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_RETRY_DELAY_MS
		this.#maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS
		this.#backoffMultiplier = options.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER
		this.#jitter = options.jitter ?? true
		this.#retryableCodes = new Set(options.retryableCodes ?? RETRYABLE_ERROR_CODES)
		this.#onRetryCallback = options.onRetry
	}

	shouldRetry(error: unknown, attempt: number): boolean {
		// Check attempt limit
		if (attempt >= this.#maxAttempts) {
			return false
		}

		// Check if error is retryable
		if (isAdapterError(error)) {
			const isRetryable = this.#retryableCodes.has(error.data.code)
			if (isRetryable && this.#onRetryCallback) {
				const delay = this.getDelay(attempt)
				this.#onRetryCallback(error, attempt, delay)
			}
			return isRetryable
		}

		// For unknown errors, don't retry by default
		return false
	}

	getDelay(attempt: number): number {
		// Calculate exponential delay: initialDelay * (multiplier ^ attempt)
		const exponentialDelay = this.#initialDelayMs * Math.pow(this.#backoffMultiplier, attempt)

		// Cap at max delay
		let delay = Math.min(exponentialDelay, this.#maxDelayMs)

		// Apply jitter if enabled: delay * (0.5 + random * 0.5) = delay * [0.5, 1.0)
		if (this.#jitter) {
			delay = delay * (0.5 + Math.random() * 0.5)
		}

		return Math.floor(delay)
	}

	getMaxAttempts(): number {
		return this.#maxAttempts
	}

	onRetry(error: unknown, attempt: number, delayMs: number): void {
		if (this.#onRetryCallback) {
			this.#onRetryCallback(error, attempt, delayMs)
		}
	}
}

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
