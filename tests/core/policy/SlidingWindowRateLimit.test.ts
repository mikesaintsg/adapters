/**
 * Sliding window rate limit adapter tests.
 */

import { describe, it, expect } from 'vitest'

import { createSlidingWindowRateLimitAdapter } from '@mikesaintsg/adapters'

describe('SlidingWindowRateLimit', () => {
	describe('createSlidingWindowRateLimitAdapter', () => {
		it('creates rate limiter with default options', () => {
			const limiter = createSlidingWindowRateLimitAdapter()
			const state = limiter.getState()

			expect(state.requestsPerMinute).toBe(60)
			expect(state.activeRequests).toBe(0)
			expect(state.requestsInWindow).toBe(0)
		})

		it('respects custom rate limit options', () => {
			const limiter = createSlidingWindowRateLimitAdapter({
				requestsPerMinute: 120,
				windowMs: 30000,
			})

			const state = limiter.getState()
			expect(state.requestsPerMinute).toBe(120)
		})

		it('acquires and releases tokens', async() => {
			const limiter = createSlidingWindowRateLimitAdapter()

			await limiter.acquire()
			const stateAfterAcquire = limiter.getState()
			expect(stateAfterAcquire.activeRequests).toBe(1)
			expect(stateAfterAcquire.requestsInWindow).toBe(1)

			limiter.release()
			const stateAfterRelease = limiter.getState()
			expect(stateAfterRelease.activeRequests).toBe(0)
			expect(stateAfterRelease.requestsInWindow).toBe(1) // Still in window
		})

		it('tracks requests in window', async() => {
			const limiter = createSlidingWindowRateLimitAdapter({
				requestsPerMinute: 60,
			})

			await limiter.acquire()
			await limiter.acquire()
			await limiter.acquire()

			const state = limiter.getState()
			expect(state.requestsInWindow).toBe(3)

			limiter.release()
			limiter.release()
			limiter.release()
		})

		it('allows changing rate limit dynamically', () => {
			const limiter = createSlidingWindowRateLimitAdapter({
				requestsPerMinute: 60,
			})

			expect(limiter.getState().requestsPerMinute).toBe(60)

			limiter.setLimit(120)
			expect(limiter.getState().requestsPerMinute).toBe(120)
		})

		it('reports window reset time', () => {
			const limiter = createSlidingWindowRateLimitAdapter()
			const state = limiter.getState()

			expect(typeof state.windowResetIn).toBe('number')
			expect(state.windowResetIn).toBeGreaterThanOrEqual(0)
		})
	})
})
