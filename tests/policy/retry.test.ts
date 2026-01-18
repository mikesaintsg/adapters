/**
 * @mikesaintsg/adapters
 *
 * Tests for retry adapters.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	createExponentialRetryAdapter,
	createLinearRetryAdapter,
	AdapterError,
} from '@mikesaintsg/adapters'

describe('Retry Adapters', () => {
	describe('createExponentialRetryAdapter', () => {
		it('creates adapter with default options', () => {
			const retry = createExponentialRetryAdapter()

			expect(retry.getMaxAttempts()).toBe(3)
			expect(retry.getDelay(1)).toBeGreaterThan(0)
		})

		it('creates adapter with custom options', () => {
			const retry = createExponentialRetryAdapter({
				maxAttempts: 5,
				initialDelayMs: 500,
				maxDelayMs: 5000,
			})

			expect(retry.getMaxAttempts()).toBe(5)
		})

		it('shouldRetry returns true for retryable errors', () => {
			const retry = createExponentialRetryAdapter({ maxAttempts: 3 })
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limit exceeded')

			expect(retry.shouldRetry(error, 1)).toBe(true)
			expect(retry.shouldRetry(error, 2)).toBe(true)
			expect(retry.shouldRetry(error, 3)).toBe(false) // Reached max attempts
		})

		it('shouldRetry returns false for non-retryable errors', () => {
			const retry = createExponentialRetryAdapter()
			const error = new AdapterError('AUTHENTICATION_ERROR', 'Auth failed')

			expect(retry.shouldRetry(error, 1)).toBe(false)
		})

		it('shouldRetry returns true for TypeError (network errors)', () => {
			const retry = createExponentialRetryAdapter()
			const error = new TypeError('Failed to fetch')

			expect(retry.shouldRetry(error, 1)).toBe(true)
		})

		it('getDelay returns exponentially increasing delays', () => {
			const retry = createExponentialRetryAdapter({
				initialDelayMs: 1000,
				backoffMultiplier: 2,
				jitter: false,
			})

			expect(retry.getDelay(1)).toBe(1000)
			expect(retry.getDelay(2)).toBe(2000)
			expect(retry.getDelay(3)).toBe(4000)
		})

		it('getDelay respects maxDelayMs', () => {
			const retry = createExponentialRetryAdapter({
				initialDelayMs: 1000,
				maxDelayMs: 3000,
				backoffMultiplier: 2,
				jitter: false,
			})

			expect(retry.getDelay(5)).toBe(3000)
		})

		it('getDelay applies jitter when enabled', () => {
			const retry = createExponentialRetryAdapter({
				initialDelayMs: 1000,
				jitter: true,
			})

			const delays = new Set()
			for (let i = 0; i < 10; i++) {
				delays.add(retry.getDelay(1))
			}

			// With jitter, delays should vary
			expect(delays.size).toBeGreaterThan(1)
		})

		it('calls onRetry callback when provided', () => {
			const onRetry = vi.fn()
			const retry = createExponentialRetryAdapter({ onRetry })

			expect(retry.onRetry).toBe(onRetry)
		})

		it('onRetry is undefined when not provided', () => {
			const retry = createExponentialRetryAdapter()

			expect(retry.onRetry).toBeUndefined()
		})
	})

	describe('createLinearRetryAdapter', () => {
		it('creates adapter with default options', () => {
			const retry = createLinearRetryAdapter()

			expect(retry.getMaxAttempts()).toBe(3)
		})

		it('creates adapter with custom options', () => {
			const retry = createLinearRetryAdapter({
				maxAttempts: 5,
				delayMs: 2000,
			})

			expect(retry.getMaxAttempts()).toBe(5)
			expect(retry.getDelay(1)).toBe(2000)
		})

		it('getDelay returns constant delay', () => {
			const retry = createLinearRetryAdapter({ delayMs: 1500 })

			expect(retry.getDelay(1)).toBe(1500)
			expect(retry.getDelay(2)).toBe(1500)
			expect(retry.getDelay(5)).toBe(1500)
		})

		it('shouldRetry respects maxAttempts', () => {
			const retry = createLinearRetryAdapter({ maxAttempts: 2 })
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limit exceeded')

			expect(retry.shouldRetry(error, 1)).toBe(true)
			expect(retry.shouldRetry(error, 2)).toBe(false)
		})

		it('shouldRetry with custom retryable codes', () => {
			const retry = createLinearRetryAdapter({
				retryableCodes: ['NETWORK_ERROR'],
			})

			const networkError = new AdapterError('NETWORK_ERROR', 'Network error')
			const rateLimitError = new AdapterError('RATE_LIMIT_ERROR', 'Rate limit')

			expect(retry.shouldRetry(networkError, 1)).toBe(true)
			expect(retry.shouldRetry(rateLimitError, 1)).toBe(false)
		})
	})

	describe('Edge Cases', () => {
		it('handles zero maxAttempts', () => {
			const retry = createExponentialRetryAdapter({ maxAttempts: 0 })
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limit')

			expect(retry.shouldRetry(error, 0)).toBe(false)
		})

		it('handles unknown error types', () => {
			const retry = createExponentialRetryAdapter()

			expect(retry.shouldRetry(new Error('Generic'), 1)).toBe(false)
			expect(retry.shouldRetry('string error', 1)).toBe(false)
			expect(retry.shouldRetry(null, 1)).toBe(false)
		})

		it('handles attempt number edge cases', () => {
			const retry = createExponentialRetryAdapter({ maxAttempts: 3 })
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limit')

			expect(retry.shouldRetry(error, 0)).toBe(true)
			expect(retry.shouldRetry(error, -1)).toBe(true)
		})
	})
})
