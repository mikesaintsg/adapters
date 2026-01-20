/**
 * Exponential retry adapter tests.
 */

import { describe, it, expect, vi } from 'vitest'

import { createExponentialRetryAdapter, createAdapterError } from '@mikesaintsg/adapters'

describe('ExponentialRetry', () => {
	describe('createExponentialRetryAdapter', () => {
		it('creates retry adapter with default options', () => {
			const retry = createExponentialRetryAdapter()

			expect(retry.getMaxAttempts()).toBe(3)
			expect(retry.getDelay(0)).toBeGreaterThan(0)
		})

		it('respects custom max attempts', () => {
			const retry = createExponentialRetryAdapter({
				maxAttempts: 5,
			})

			expect(retry.getMaxAttempts()).toBe(5)
		})

		it('calculates exponential delay without jitter', () => {
			const retry = createExponentialRetryAdapter({
				initialDelayMs: 1000,
				backoffMultiplier: 2,
				jitter: false,
			})

			expect(retry.getDelay(0)).toBe(1000)  // 1000 * 2^0
			expect(retry.getDelay(1)).toBe(2000)  // 1000 * 2^1
			expect(retry.getDelay(2)).toBe(4000)  // 1000 * 2^2
		})

		it('respects max delay cap', () => {
			const retry = createExponentialRetryAdapter({
				initialDelayMs: 1000,
				backoffMultiplier: 2,
				maxDelayMs: 5000,
				jitter: false,
			})

			expect(retry.getDelay(10)).toBe(5000) // Capped at max
		})

		it('applies jitter to delays', () => {
			const retry = createExponentialRetryAdapter({
				initialDelayMs: 1000,
				backoffMultiplier: 2,
				jitter: true,
			})

			const delay = retry.getDelay(0)
			// With jitter, delay should be between 500 and 1000
			expect(delay).toBeGreaterThanOrEqual(500)
			expect(delay).toBeLessThanOrEqual(1000)
		})

		it('should retry on retryable error codes', () => {
			const retry = createExponentialRetryAdapter({
				maxAttempts: 3,
			})

			const rateLimitError = createAdapterError('RATE_LIMIT_ERROR', 'Rate limited')
			expect(retry.shouldRetry(rateLimitError, 0)).toBe(true)
			expect(retry.shouldRetry(rateLimitError, 1)).toBe(true)
			expect(retry.shouldRetry(rateLimitError, 2)).toBe(true)
			expect(retry.shouldRetry(rateLimitError, 3)).toBe(false) // Max attempts reached
		})

		it('should not retry on non-retryable error codes', () => {
			const retry = createExponentialRetryAdapter()

			const authError = createAdapterError('AUTHENTICATION_ERROR', 'Invalid API key')
			expect(retry.shouldRetry(authError, 0)).toBe(false)
		})

		it('respects custom retryable codes', () => {
			const retry = createExponentialRetryAdapter({
				retryableCodes: ['AUTHENTICATION_ERROR'],
			})

			const authError = createAdapterError('AUTHENTICATION_ERROR', 'Invalid API key')
			expect(retry.shouldRetry(authError, 0)).toBe(true)

			const rateLimitError = createAdapterError('RATE_LIMIT_ERROR', 'Rate limited')
			expect(retry.shouldRetry(rateLimitError, 0)).toBe(false)
		})

		it('calls onRetry callback before retry', () => {
			const onRetry = vi.fn()
			const retry = createExponentialRetryAdapter({
				onRetry,
				jitter: false,
				initialDelayMs: 1000,
			})

			const error = createAdapterError('RATE_LIMIT_ERROR', 'Rate limited')
			retry.shouldRetry(error, 0)

			expect(onRetry).toHaveBeenCalledWith(error, 0, 1000)
		})

		it('does not retry on non-adapter errors', () => {
			const retry = createExponentialRetryAdapter()

			const genericError = new Error('Generic error')
			expect(retry.shouldRetry(genericError, 0)).toBe(false)
		})
	})
})
