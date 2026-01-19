/**
 * Sliding window rate limit adapter implementation.
 * Implements RateLimitAdapterInterface using sliding window algorithm.
 */

import type { RateLimitAdapterInterface, RateLimitState } from '@mikesaintsg/core'

import type { SlidingWindowRateLimitAdapterOptions } from '../../types.js'
import {
	DEFAULT_REQUESTS_PER_MINUTE,
	DEFAULT_RATE_LIMIT_WINDOW_MS,
} from '../../constants.js'

/**
 * Sliding window rate limiter.
 * Provides more accurate rate limiting than fixed windows by tracking
 * individual request timestamps.
 */
class SlidingWindowRateLimit implements RateLimitAdapterInterface {
	#requests: number[] = []
	#windowMs: number
	#maxRequests: number
	#requestsPerMinute: number
	#activeRequests = 0
	#waitQueue: (() => void)[] = []

	constructor(options: SlidingWindowRateLimitAdapterOptions = {}) {
		this.#requestsPerMinute = options.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE
		this.#windowMs = options.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS
		// Scale max requests based on window size
		this.#maxRequests = Math.ceil(
			(this.#requestsPerMinute / 60000) * this.#windowMs,
		)
	}

	async acquire(): Promise<void> {
		const now = Date.now()

		// Remove expired requests
		this.#cleanupExpiredRequests(now)

		// Check if we can proceed immediately
		if (this.#requests.length < this.#maxRequests) {
			this.#requests.push(now)
			this.#activeRequests++
			return
		}

		// Wait until oldest request expires
		return new Promise<void>((resolve) => {
			this.#waitQueue.push(() => {
				this.#requests.push(Date.now())
				this.#activeRequests++
				resolve()
			})
			this.#scheduleCleanup()
		})
	}

	release(): void {
		this.#activeRequests = Math.max(0, this.#activeRequests - 1)
	}

	getState(): RateLimitState {
		const now = Date.now()
		this.#cleanupExpiredRequests(now)

		// Calculate when the oldest request in window will expire
		const windowResetIn = this.#requests.length > 0 && this.#requests[0] !== undefined
			? Math.max(0, this.#requests[0] + this.#windowMs - now)
			: 0

		return {
			activeRequests: this.#activeRequests,
			maxConcurrent: this.#maxRequests,
			requestsInWindow: this.#requests.length,
			requestsPerMinute: this.#requestsPerMinute,
			windowResetIn,
		}
	}

	setLimit(requestsPerMinute: number): void {
		this.#requestsPerMinute = requestsPerMinute
		this.#maxRequests = Math.ceil(
			(requestsPerMinute / 60000) * this.#windowMs,
		)
	}

	#cleanupExpiredRequests(now: number): void {
		const cutoff = now - this.#windowMs
		this.#requests = this.#requests.filter((t) => t > cutoff)
	}

	#scheduleCleanup(): void {
		if (this.#requests.length === 0 || this.#waitQueue.length === 0) {
			return
		}

		// Calculate time until oldest request expires
		const now = Date.now()
		const oldest = this.#requests[0]
		if (oldest === undefined) return

		const timeUntilExpiry = Math.max(10, oldest + this.#windowMs - now)

		setTimeout(() => {
			this.#cleanupExpiredRequests(Date.now())
			this.#processQueue()
		}, timeUntilExpiry)
	}

	#processQueue(): void {
		while (
			this.#waitQueue.length > 0 &&
			this.#requests.length < this.#maxRequests
		) {
			const next = this.#waitQueue.shift()
			if (next) {
				next()
			}
		}

		// Schedule next cleanup if still waiting
		if (this.#waitQueue.length > 0) {
			this.#scheduleCleanup()
		}
	}
}

/**
 * Create a sliding window rate limit adapter.
 *
 * @example
 * ```ts
 * const rateLimit = createSlidingWindowRateLimitAdapter({
 *   requestsPerMinute: 60,
 *   windowMs: 60000,
 * })
 *
 * // Usage with a provider
 * async function makeRequest() {
 *   await rateLimit.acquire()
 *   try {
 *     return await provider.generate(messages)
 *   } finally {
 *     rateLimit.release()
 *   }
 * }
 * ```
 */
export function createSlidingWindowRateLimitAdapter(
	options?: SlidingWindowRateLimitAdapterOptions,
): RateLimitAdapterInterface {
	return new SlidingWindowRateLimit(options)
}
