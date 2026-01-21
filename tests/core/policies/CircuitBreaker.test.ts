/**
 * Tests for CircuitBreaker adapter.
 */

import { describe, it, expect, vi } from 'vitest'

import {
	createCircuitBreakerAdapter,
} from '@mikesaintsg/adapters'

describe('CircuitBreaker', () => {
	describe('createCircuitBreakerAdapter', () => {
		it('returns a CircuitBreakerAdapterInterface', () => {
			const cb = createCircuitBreakerAdapter()
			expect(cb).toBeDefined()
			expect(typeof cb.execute).toBe('function')
			expect(typeof cb.canExecute).toBe('function')
			expect(typeof cb.getState).toBe('function')
			expect(typeof cb.open).toBe('function')
			expect(typeof cb.close).toBe('function')
			expect(typeof cb.reset).toBe('function')
			expect(typeof cb.onStateChange).toBe('function')
			expect(typeof cb.onFailure).toBe('function')
			expect(typeof cb.onSuccess).toBe('function')
		})
	})

	describe('initial state', () => {
		it('starts in closed state', () => {
			const cb = createCircuitBreakerAdapter()
			const state = cb.getState()
			expect(state.state).toBe('closed')
			expect(state.failureCount).toBe(0)
			expect(state.successCount).toBe(0)
		})

		it('allows execution in closed state', () => {
			const cb = createCircuitBreakerAdapter()
			expect(cb.canExecute()).toBe(true)
		})
	})

	describe('execute', () => {
		it('executes successful operations', async() => {
			const cb = createCircuitBreakerAdapter()
			const result = await cb.execute(() => Promise.resolve('success'))
			expect(result).toBe('success')
		})

		it('throws on failed operations', async() => {
			const cb = createCircuitBreakerAdapter()
			await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
		})

		it('throws when circuit is open', async() => {
			const cb = createCircuitBreakerAdapter()
			cb.open()
			await expect(cb.execute(() => Promise.resolve('success'))).rejects.toThrow('Circuit breaker is open')
		})

		it('increments success count on success', async() => {
			const cb = createCircuitBreakerAdapter()
			await cb.execute(() => Promise.resolve('ok'))
			const state = cb.getState()
			expect(state.successCount).toBe(1)
		})

		it('increments failure count on failure', async() => {
			const cb = createCircuitBreakerAdapter()
			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}
			const state = cb.getState()
			expect(state.failureCount).toBe(1)
		})
	})

	describe('state transitions', () => {
		it('opens after reaching failure threshold', async() => {
			const cb = createCircuitBreakerAdapter({ failureThreshold: 3 })

			for (let i = 0; i < 3; i++) {
				try {
					await cb.execute(() => Promise.reject(new Error('fail')))
				} catch {
					// Expected
				}
			}

			expect(cb.getState().state).toBe('open')
			expect(cb.canExecute()).toBe(false)
		})

		it('transitions to half-open after timeout', async() => {
			const cb = createCircuitBreakerAdapter({
				failureThreshold: 1,
				resetTimeoutMs: 10,
			})

			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			expect(cb.getState().state).toBe('open')

			// Wait for reset timeout
			await new Promise((resolve) => setTimeout(resolve, 15))

			expect(cb.canExecute()).toBe(true)
			expect(cb.getState().state).toBe('half-open')
		})

		it('closes after successes in half-open state', async() => {
			const cb = createCircuitBreakerAdapter({
				failureThreshold: 1,
				successThreshold: 2,
				resetTimeoutMs: 10,
			})

			// Trigger open state
			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			// Wait for reset timeout
			await new Promise((resolve) => setTimeout(resolve, 15))

			// Trigger canExecute to transition to half-open
			cb.canExecute()

			// Succeed enough times
			await cb.execute(() => Promise.resolve('ok'))
			await cb.execute(() => Promise.resolve('ok'))

			expect(cb.getState().state).toBe('closed')
		})

		it('opens again on failure in half-open state', async() => {
			const cb = createCircuitBreakerAdapter({
				failureThreshold: 1,
				resetTimeoutMs: 10,
			})

			// Trigger open state
			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			// Wait for reset timeout
			await new Promise((resolve) => setTimeout(resolve, 15))

			// Trigger canExecute to transition to half-open
			cb.canExecute()
			expect(cb.getState().state).toBe('half-open')

			// Fail again
			try {
				await cb.execute(() => Promise.reject(new Error('fail again')))
			} catch {
				// Expected
			}

			expect(cb.getState().state).toBe('open')
		})
	})

	describe('manual control', () => {
		it('open() forces circuit open', () => {
			const cb = createCircuitBreakerAdapter()
			cb.open()
			expect(cb.getState().state).toBe('open')
			expect(cb.canExecute()).toBe(false)
		})

		it('close() forces circuit closed', () => {
			const cb = createCircuitBreakerAdapter()
			cb.open()
			cb.close()
			expect(cb.getState().state).toBe('closed')
			expect(cb.canExecute()).toBe(true)
		})

		it('reset() clears all counters and closes', async() => {
			const cb = createCircuitBreakerAdapter()

			// Generate some state
			await cb.execute(() => Promise.resolve('ok'))
			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			cb.reset()

			const state = cb.getState()
			expect(state.state).toBe('closed')
			expect(state.failureCount).toBe(0)
			expect(state.successCount).toBe(0)
		})
	})

	describe('subscriptions', () => {
		it('onStateChange fires on state transitions', async() => {
			const cb = createCircuitBreakerAdapter({ failureThreshold: 1 })
			const callback = vi.fn()
			cb.onStateChange(callback)

			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			expect(callback).toHaveBeenCalledWith('open', 'closed')
		})

		it('onStateChange returns unsubscribe function', async() => {
			const cb = createCircuitBreakerAdapter({ failureThreshold: 1 })
			const callback = vi.fn()
			const unsub = cb.onStateChange(callback)

			unsub()

			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			expect(callback).not.toHaveBeenCalled()
		})

		it('onFailure fires on failures with error and count', async() => {
			const cb = createCircuitBreakerAdapter()
			const callback = vi.fn()
			cb.onFailure(callback)

			const error = new Error('test error')
			try {
				await cb.execute(() => Promise.reject(error))
			} catch {
				// Expected
			}

			expect(callback).toHaveBeenCalledWith(error, 1)
		})

		it('onSuccess fires on successes with count', async() => {
			const cb = createCircuitBreakerAdapter()
			const callback = vi.fn()
			cb.onSuccess(callback)

			await cb.execute(() => Promise.resolve('ok'))

			expect(callback).toHaveBeenCalledWith(1)
		})

		it('onStateChange option in constructor works', async() => {
			const callback = vi.fn()
			const cb = createCircuitBreakerAdapter({
				failureThreshold: 1,
				onStateChange: callback,
			})

			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			expect(callback).toHaveBeenCalledWith('open', 'closed')
		})
	})

	describe('getState', () => {
		it('returns complete state object', () => {
			const cb = createCircuitBreakerAdapter()
			const state = cb.getState()

			expect(state).toHaveProperty('state')
			expect(state).toHaveProperty('failureCount')
			expect(state).toHaveProperty('successCount')
			expect(state).toHaveProperty('lastFailureTime')
			expect(state).toHaveProperty('lastSuccessTime')
			expect(state).toHaveProperty('nextAttemptTime')
		})

		it('updates lastSuccessTime on success', async() => {
			const cb = createCircuitBreakerAdapter()
			const before = Date.now()

			await cb.execute(() => Promise.resolve('ok'))

			const state = cb.getState()
			expect(state.lastSuccessTime).toBeGreaterThanOrEqual(before)
		})

		it('updates lastFailureTime on failure', async() => {
			const cb = createCircuitBreakerAdapter()
			const before = Date.now()

			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			const state = cb.getState()
			expect(state.lastFailureTime).toBeGreaterThanOrEqual(before)
		})
	})

	describe('monitoring window', () => {
		it('cleans up old failures outside window', async() => {
			const cb = createCircuitBreakerAdapter({
				failureThreshold: 5,
				monitorWindowMs: 50,
			})

			// Generate a failure
			try {
				await cb.execute(() => Promise.reject(new Error('fail')))
			} catch {
				// Expected
			}

			expect(cb.getState().failureCount).toBe(1)

			// Wait for failure to expire
			await new Promise((resolve) => setTimeout(resolve, 60))

			expect(cb.getState().failureCount).toBe(0)
		})
	})
})
