/**
 * Token bucket rate limit adapter tests.
 */

import { describe, it, expect } from 'vitest'

import { createTokenBucketRateLimitAdapter } from '@mikesaintsg/adapters'

describe('TokenBucketRateLimit', () => {
	describe('createTokenBucketRateLimitAdapter', () => {
		it('creates rate limiter with default options', () => {
			const limiter = createTokenBucketRateLimitAdapter()
			const state = limiter.getState()

			expect(state.requestsPerMinute).toBe(60)
			expect(state.maxConcurrent).toBe(10)
			expect(state.activeRequests).toBe(0)
		})

		it('respects custom rate limit options', () => {
			const limiter = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 120,
				maxConcurrent: 20,
			})

			const state = limiter.getState()
			expect(state.requestsPerMinute).toBe(120)
			expect(state.maxConcurrent).toBe(20)
		})

		it('acquires and releases tokens', async() => {
			const limiter = createTokenBucketRateLimitAdapter({
				burstSize: 5,
			})

			await limiter.acquire()
			const stateAfterAcquire = limiter.getState()
			expect(stateAfterAcquire.activeRequests).toBe(1)

			limiter.release()
			const stateAfterRelease = limiter.getState()
			expect(stateAfterRelease.activeRequests).toBe(0)
		})

		it('allows burst of requests up to burst size', async() => {
			const limiter = createTokenBucketRateLimitAdapter({
				burstSize: 3,
				maxConcurrent: 5,
			})

			// Should be able to acquire 3 tokens immediately
			await Promise.all([
				limiter.acquire(),
				limiter.acquire(),
				limiter.acquire(),
			])

			const state = limiter.getState()
			expect(state.activeRequests).toBe(3)

			// Release all
			limiter.release()
			limiter.release()
			limiter.release()
		})

		it('allows changing rate limit dynamically', () => {
			const limiter = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 60,
			})

			expect(limiter.getState().requestsPerMinute).toBe(60)

			limiter.setLimit(120)
			expect(limiter.getState().requestsPerMinute).toBe(120)
		})

		it('tracks window reset time', () => {
			const limiter = createTokenBucketRateLimitAdapter()
			const state = limiter.getState()

			expect(typeof state.windowResetIn).toBe('number')
		})
	})
})
