/**
 * Token bucket rate limit adapter implementation.
 * Implements RateLimitAdapterInterface using token bucket algorithm.
 */

import type { RateLimitAdapterInterface, RateLimitState } from '@mikesaintsg/core'

import type { TokenBucketRateLimitAdapterOptions } from '../../types.js'
import {
	DEFAULT_REQUESTS_PER_MINUTE,
	DEFAULT_MAX_CONCURRENT_REQUESTS,
	DEFAULT_BURST_SIZE,
} from '../../constants.js'

/**
 * Token bucket rate limiter.
 * Provides rate limiting using the token bucket algorithm with burst capacity.
 */
export class TokenBucketRateLimit implements RateLimitAdapterInterface {
	#tokens: number
	#maxTokens: number
	#requestsPerMinute: number
	#refillRate: number // tokens per ms
	#lastRefill: number
	#activeRequests = 0
	#maxConcurrent: number
	#waitQueue: (() => void)[] = []

	constructor(options: TokenBucketRateLimitAdapterOptions = {}) {
		this.#requestsPerMinute = options.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE
		this.#maxConcurrent = options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT_REQUESTS
		this.#maxTokens = options.burstSize ?? DEFAULT_BURST_SIZE
		this.#tokens = this.#maxTokens
		this.#refillRate = this.#requestsPerMinute / 60000 // tokens per ms
		this.#lastRefill = Date.now()
	}

	async acquire(): Promise<void> {
		this.#refillTokens()

		// Check if we can proceed immediately
		if (this.#tokens >= 1 && this.#activeRequests < this.#maxConcurrent) {
			this.#tokens--
			this.#activeRequests++
			return
		}

		// Wait for a token
		return new Promise<void>((resolve) => {
			this.#waitQueue.push(() => {
				this.#tokens--
				this.#activeRequests++
				resolve()
			})
			// Schedule wake-up when tokens refill
			this.#scheduleRefill()
		})
	}

	release(): void {
		this.#activeRequests = Math.max(0, this.#activeRequests - 1)
		this.#processQueue()
	}

	getState(): RateLimitState {
		this.#refillTokens()
		return {
			activeRequests: this.#activeRequests,
			maxConcurrent: this.#maxConcurrent,
			requestsInWindow: this.#maxTokens - Math.floor(this.#tokens),
			requestsPerMinute: this.#requestsPerMinute,
			windowResetIn: 60000 - (Date.now() - this.#lastRefill),
		}
	}

	setLimit(requestsPerMinute: number): void {
		this.#requestsPerMinute = requestsPerMinute
		this.#refillRate = requestsPerMinute / 60000
	}

	#refillTokens(): void {
		const now = Date.now()
		const elapsed = now - this.#lastRefill
		const refill = elapsed * this.#refillRate

		this.#tokens = Math.min(this.#maxTokens, this.#tokens + refill)
		this.#lastRefill = now
	}

	#processQueue(): void {
		this.#refillTokens()

		while (
			this.#waitQueue.length > 0 &&
			this.#tokens >= 1 &&
			this.#activeRequests < this.#maxConcurrent
		) {
			const next = this.#waitQueue.shift()
			if (next) {
				next()
			}
		}
	}

	#scheduleRefill(): void {
		// Prevent division by zero
		if (this.#refillRate <= 0) {
			return
		}

		// Calculate time until we have at least 1 token
		const tokensNeeded = Math.max(0, 1 - this.#tokens)
		const timeToRefill = tokensNeeded / this.#refillRate

		setTimeout(() => {
			this.#processQueue()
		}, Math.max(10, timeToRefill))
	}
}
