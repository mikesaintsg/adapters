/**
 * @mikesaintsg/adapters
 *
 * Rate limit adapters implementing RateLimitAdapterInterface.
 * Provides token bucket and sliding window algorithms.
 */

import type { RateLimitAdapterInterface, RateLimitState } from '@mikesaintsg/core'
import type {
	TokenBucketRateLimitAdapterOptions,
	SlidingWindowRateLimitAdapterOptions,
} from '../types.js'
import {
	RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE,
	RATE_LIMIT_DEFAULT_MAX_CONCURRENT,
	RATE_LIMIT_DEFAULT_WINDOW_MS,
} from '../constants.js'

/**
 * Create a token bucket rate limit adapter.
 *
 * Uses the token bucket algorithm for rate limiting with burst support.
 *
 * @param options - Rate limit configuration
 * @returns A RateLimitAdapterInterface implementation
 * @example
 * ```ts
 * const rateLimit = createTokenBucketRateLimitAdapter({
 *   requestsPerMinute: 60,
 *   maxConcurrent: 10,
 *   burstSize: 10,
 * })
 * ```
 */
export function createTokenBucketRateLimitAdapter(
	options?: TokenBucketRateLimitAdapterOptions,
): RateLimitAdapterInterface {
	let requestsPerMinute = options?.requestsPerMinute ?? RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE
	const maxConcurrent = options?.maxConcurrent ?? RATE_LIMIT_DEFAULT_MAX_CONCURRENT
	const burstSize = options?.burstSize ?? 10
	const windowMs = RATE_LIMIT_DEFAULT_WINDOW_MS

	// Token bucket state
	let tokens = burstSize
	let lastRefill = Date.now()
	let activeRequests = 0
	let requestsInWindow = 0
	let windowStart = Date.now()

	// Queue for waiting requests
	const pendingQueue: { resolve: () => void; resolved: boolean }[] = []

	/** Refill tokens based on elapsed time */
	function refillTokens(): void {
		const now = Date.now()
		const elapsed = now - lastRefill
		const tokensToAdd = (elapsed / 60000) * requestsPerMinute

		tokens = Math.min(burstSize, tokens + tokensToAdd)
		lastRefill = now

		// Reset window if needed
		if (now - windowStart >= windowMs) {
			requestsInWindow = 0
			windowStart = now
		}
	}

	/** Try to process pending requests */
	function processPendingQueue(): void {
		while (pendingQueue.length > 0 && tokens >= 1 && activeRequests < maxConcurrent) {
			const pending = pendingQueue.shift()
			if (pending && !pending.resolved) {
				pending.resolved = true
				tokens--
				activeRequests++
				requestsInWindow++
				pending.resolve()
			}
		}
	}

	return {
		async acquire(): Promise<void> {
			refillTokens()

			if (tokens >= 1 && activeRequests < maxConcurrent) {
				tokens--
				activeRequests++
				requestsInWindow++
				return
			}

			// Queue and wait
			return new Promise((resolve) => {
				const pending = { resolve, resolved: false }
				pendingQueue.push(pending)

				// Set up periodic check for when slot becomes available
				const checkInterval = setInterval(() => {
					refillTokens()
					processPendingQueue()

					if (pending.resolved) {
						clearInterval(checkInterval)
					}
				}, 50)
			})
		},

		release(): void {
			if (activeRequests > 0) {
				activeRequests--
			}
			refillTokens()
			processPendingQueue()
		},

		getState(): RateLimitState {
			refillTokens()
			const now = Date.now()

			return {
				activeRequests,
				maxConcurrent,
				requestsInWindow,
				requestsPerMinute,
				windowResetIn: Math.max(0, windowMs - (now - windowStart)),
			}
		},

		setLimit(newRequestsPerMinute: number): void {
			if (newRequestsPerMinute > 0) {
				requestsPerMinute = newRequestsPerMinute
			}
		},
	}
}

/**
 * Create a sliding window rate limit adapter.
 *
 * Uses the sliding window algorithm for rate limiting.
 *
 * @param options - Rate limit configuration
 * @returns A RateLimitAdapterInterface implementation
 * @example
 * ```ts
 * const rateLimit = createSlidingWindowRateLimitAdapter({
 *   requestsPerMinute: 100,
 *   windowMs: 60000,
 * })
 * ```
 */
export function createSlidingWindowRateLimitAdapter(
	options?: SlidingWindowRateLimitAdapterOptions,
): RateLimitAdapterInterface {
	let requestsPerMinute = options?.requestsPerMinute ?? RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE
	const windowMs = options?.windowMs ?? RATE_LIMIT_DEFAULT_WINDOW_MS

	// Sliding window state
	const requestTimestamps: number[] = []
	let activeRequests = 0

	// Queue for waiting requests
	const pendingQueue: { resolve: () => void; resolved: boolean }[] = []

	/** Clean up expired timestamps */
	function cleanExpiredTimestamps(): void {
		const now = Date.now()
		const windowStart = now - windowMs

		while (requestTimestamps.length > 0) {
			const oldest = requestTimestamps[0]
			if (oldest !== undefined && oldest < windowStart) {
				requestTimestamps.shift()
			} else {
				break
			}
		}
	}

	/** Check if a new request can be made */
	function canMakeRequest(): boolean {
		cleanExpiredTimestamps()
		return requestTimestamps.length < requestsPerMinute
	}

	/** Try to process pending requests */
	function processPendingQueue(): void {
		while (pendingQueue.length > 0 && canMakeRequest()) {
			const pending = pendingQueue.shift()
			if (pending && !pending.resolved) {
				pending.resolved = true
				requestTimestamps.push(Date.now())
				activeRequests++
				pending.resolve()
			}
		}
	}

	/** Get time until next slot becomes available */
	function getWindowResetIn(): number {
		if (requestTimestamps.length === 0) return 0
		const oldest = requestTimestamps[0]
		if (oldest === undefined) return 0
		const now = Date.now()
		return Math.max(0, (oldest + windowMs) - now)
	}

	return {
		async acquire(): Promise<void> {
			if (canMakeRequest()) {
				requestTimestamps.push(Date.now())
				activeRequests++
				return
			}

			// Queue and wait
			return new Promise((resolve) => {
				const pending = { resolve, resolved: false }
				pendingQueue.push(pending)

				// Set up periodic check for when slot becomes available
				const checkInterval = setInterval(() => {
					processPendingQueue()

					if (pending.resolved) {
						clearInterval(checkInterval)
					}
				}, 50)
			})
		},

		release(): void {
			if (activeRequests > 0) {
				activeRequests--
			}
			processPendingQueue()
		},

		getState(): RateLimitState {
			cleanExpiredTimestamps()

			return {
				activeRequests,
				maxConcurrent: requestsPerMinute, // Window-based limit
				requestsInWindow: requestTimestamps.length,
				requestsPerMinute,
				windowResetIn: getWindowResetIn(),
			}
		},

		setLimit(newRequestsPerMinute: number): void {
			if (newRequestsPerMinute > 0) {
				requestsPerMinute = newRequestsPerMinute
			}
		},
	}
}
