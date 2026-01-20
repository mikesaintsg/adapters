/**
 * Linear retry adapter implementation.
 * Implements RetryAdapterInterface with fixed delays between retries.
 */

import type { RetryAdapterInterface } from '@mikesaintsg/core'

import type { AdapterErrorCode, LinearRetryAdapterOptions } from '../../types.js'
import { isAdapterError } from '../../helpers.js'
import {
	DEFAULT_MAX_RETRY_ATTEMPTS,
	DEFAULT_INITIAL_RETRY_DELAY_MS,
	RETRYABLE_ERROR_CODES,
} from '../../constants.js'

/**
 * Linear retry adapter with fixed delay between retries.
 * Simple retry strategy with constant delay intervals.
 */
export class LinearRetry implements RetryAdapterInterface {
	readonly #maxAttempts: number
	readonly #delayMs: number
	readonly #retryableCodes: ReadonlySet<AdapterErrorCode>
	readonly #onRetryCallback: ((error: unknown, attempt: number, delayMs: number) => void) | undefined

	constructor(options: LinearRetryAdapterOptions = {}) {
		this.#maxAttempts = options.maxAttempts ?? DEFAULT_MAX_RETRY_ATTEMPTS
		this.#delayMs = options.delayMs ?? DEFAULT_INITIAL_RETRY_DELAY_MS
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
				this.#onRetryCallback(error, attempt, this.#delayMs)
			}
			return isRetryable
		}

		// For unknown errors, don't retry by default
		return false
	}

	getDelay(_attempt: number): number {
		// Fixed delay regardless of attempt number
		return this.#delayMs
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
