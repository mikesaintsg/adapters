/**
 * Linear retry adapter tests.
 */

import { describe, it, expect, vi } from 'vitest'

import { createLinearRetryAdapter } from '@mikesaintsg/adapters'
import { createAdapterError } from '../../../src/helpers.js'

describe('LinearRetry', () => {
	describe('createLinearRetryAdapter', () => {
		it('creates retry adapter with default options', () => {
			const retry = createLinearRetryAdapter()

			expect(retry.getMaxAttempts()).toBe(3)
			expect(retry.getDelay(0)).toBe(1000)
		})

		it('respects custom max attempts', () => {
			const retry = createLinearRetryAdapter({
				maxAttempts: 5,
			})

			expect(retry.getMaxAttempts()).toBe(5)
		})

		it('returns fixed delay regardless of attempt', () => {
			const retry = createLinearRetryAdapter({
				delayMs: 2000,
			})

			expect(retry.getDelay(0)).toBe(2000)
			expect(retry.getDelay(1)).toBe(2000)
			expect(retry.getDelay(5)).toBe(2000)
			expect(retry.getDelay(10)).toBe(2000)
		})

		it('should retry on retryable error codes', () => {
			const retry = createLinearRetryAdapter({
				maxAttempts: 3,
			})

			const networkError = createAdapterError('NETWORK_ERROR', 'Network failed')
			expect(retry.shouldRetry(networkError, 0)).toBe(true)
			expect(retry.shouldRetry(networkError, 1)).toBe(true)
			expect(retry.shouldRetry(networkError, 2)).toBe(true)
			expect(retry.shouldRetry(networkError, 3)).toBe(false) // Max attempts reached
		})

		it('should not retry on non-retryable error codes', () => {
			const retry = createLinearRetryAdapter()

			const invalidRequest = createAdapterError('INVALID_REQUEST_ERROR', 'Bad request')
			expect(retry.shouldRetry(invalidRequest, 0)).toBe(false)
		})

		it('calls onRetry callback before retry', () => {
			const onRetry = vi.fn()
			const retry = createLinearRetryAdapter({
				onRetry,
				delayMs: 500,
			})

			const error = createAdapterError('TIMEOUT_ERROR', 'Request timed out')
			retry.shouldRetry(error, 0)

			expect(onRetry).toHaveBeenCalledWith(error, 0, 500)
		})

		it('does not call onRetry for non-retryable errors', () => {
			const onRetry = vi.fn()
			const retry = createLinearRetryAdapter({
				onRetry,
			})

			const authError = createAdapterError('AUTHENTICATION_ERROR', 'Invalid API key')
			retry.shouldRetry(authError, 0)

			expect(onRetry).not.toHaveBeenCalled()
		})
	})
})
