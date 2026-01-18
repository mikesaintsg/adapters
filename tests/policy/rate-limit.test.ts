/**
 * @mikesaintsg/adapters
 *
 * Tests for rate limit adapters.
 */

import { describe, it, expect } from 'vitest'
import {
	createTokenBucketRateLimitAdapter,
	createSlidingWindowRateLimitAdapter,
} from '@mikesaintsg/adapters'

describe('Rate Limit Adapters', () => {
	describe('createTokenBucketRateLimitAdapter', () => {
		it('creates adapter with default options', () => {
			const rateLimit = createTokenBucketRateLimitAdapter()
			const state = rateLimit.getState()

			expect(state.requestsPerMinute).toBe(60)
			expect(state.maxConcurrent).toBe(10)
		})

		it('creates adapter with custom options', () => {
			const rateLimit = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 100,
				maxConcurrent: 20,
				burstSize: 15,
			})
			const state = rateLimit.getState()

			expect(state.requestsPerMinute).toBe(100)
			expect(state.maxConcurrent).toBe(20)
		})

		it('acquire and release work correctly', async() => {
			const rateLimit = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 60,
				maxConcurrent: 2,
				burstSize: 5,
			})

			await rateLimit.acquire()
			let state = rateLimit.getState()
			expect(state.activeRequests).toBe(1)

			await rateLimit.acquire()
			state = rateLimit.getState()
			expect(state.activeRequests).toBe(2)

			rateLimit.release()
			state = rateLimit.getState()
			expect(state.activeRequests).toBe(1)

			rateLimit.release()
			state = rateLimit.getState()
			expect(state.activeRequests).toBe(0)
		})

		it('setLimit adjusts rate limit', () => {
			const rateLimit = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 60,
			})

			rateLimit.setLimit(120)
			expect(rateLimit.getState().requestsPerMinute).toBe(120)
		})

		it('setLimit ignores non-positive values', () => {
			const rateLimit = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 60,
			})

			rateLimit.setLimit(0)
			expect(rateLimit.getState().requestsPerMinute).toBe(60)

			rateLimit.setLimit(-10)
			expect(rateLimit.getState().requestsPerMinute).toBe(60)
		})

		it('release does not go below zero', () => {
			const rateLimit = createTokenBucketRateLimitAdapter()

			rateLimit.release()
			rateLimit.release()

			expect(rateLimit.getState().activeRequests).toBe(0)
		})

		it('tracks requests in window', async() => {
			const rateLimit = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 60,
				burstSize: 10,
			})

			await rateLimit.acquire()
			await rateLimit.acquire()
			await rateLimit.acquire()

			const state = rateLimit.getState()
			expect(state.requestsInWindow).toBe(3)
		})
	})

	describe('createSlidingWindowRateLimitAdapter', () => {
		it('creates adapter with default options', () => {
			const rateLimit = createSlidingWindowRateLimitAdapter()
			const state = rateLimit.getState()

			expect(state.requestsPerMinute).toBe(60)
		})

		it('creates adapter with custom options', () => {
			const rateLimit = createSlidingWindowRateLimitAdapter({
				requestsPerMinute: 100,
				windowMs: 30000,
			})
			const state = rateLimit.getState()

			expect(state.requestsPerMinute).toBe(100)
		})

		it('acquire and release work correctly', async() => {
			const rateLimit = createSlidingWindowRateLimitAdapter({
				requestsPerMinute: 60,
			})

			await rateLimit.acquire()
			let state = rateLimit.getState()
			expect(state.activeRequests).toBe(1)
			expect(state.requestsInWindow).toBe(1)

			await rateLimit.acquire()
			state = rateLimit.getState()
			expect(state.activeRequests).toBe(2)
			expect(state.requestsInWindow).toBe(2)

			rateLimit.release()
			state = rateLimit.getState()
			expect(state.activeRequests).toBe(1)
		})

		it('setLimit adjusts rate limit', () => {
			const rateLimit = createSlidingWindowRateLimitAdapter({
				requestsPerMinute: 60,
			})

			rateLimit.setLimit(120)
			expect(rateLimit.getState().requestsPerMinute).toBe(120)
		})

		it('windowResetIn provides correct value', async() => {
			const rateLimit = createSlidingWindowRateLimitAdapter({
				requestsPerMinute: 60,
				windowMs: 60000,
			})

			await rateLimit.acquire()
			const state = rateLimit.getState()

			// Window reset should be approximately 60000ms
			expect(state.windowResetIn).toBeGreaterThan(0)
			expect(state.windowResetIn).toBeLessThanOrEqual(60000)
		})

		it('windowResetIn is 0 when no requests', () => {
			const rateLimit = createSlidingWindowRateLimitAdapter()
			const state = rateLimit.getState()

			expect(state.windowResetIn).toBe(0)
		})
	})

	describe('Edge Cases', () => {
		it('handles high burst of requests', async() => {
			const rateLimit = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 1000,
				maxConcurrent: 100,
				burstSize: 50,
			})

			const acquires = []
			for (let i = 0; i < 30; i++) {
				acquires.push(rateLimit.acquire())
			}

			await Promise.all(acquires)
			expect(rateLimit.getState().activeRequests).toBe(30)
		})

		it('handles rapid acquire/release cycles', async() => {
			const rateLimit = createTokenBucketRateLimitAdapter({
				requestsPerMinute: 100,
				maxConcurrent: 5,
				burstSize: 10,
			})

			for (let i = 0; i < 20; i++) {
				await rateLimit.acquire()
				rateLimit.release()
			}

			expect(rateLimit.getState().activeRequests).toBe(0)
		})
	})
})
