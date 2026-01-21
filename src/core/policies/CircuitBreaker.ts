/**
 * Circuit breaker adapter implementation.
 * Implements CircuitBreakerAdapterInterface to prevent cascading failures.
 */

import type { CircuitBreakerAdapterInterface, CircuitBreakerState, Unsubscribe } from '@mikesaintsg/core'

import type { CircuitBreakerAdapterOptions } from '../../types.js'
import {
	DEFAULT_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
	DEFAULT_CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
	DEFAULT_CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
	DEFAULT_CIRCUIT_BREAKER_MONITOR_WINDOW_MS,
} from '../../constants.js'

/**
 * Circuit breaker adapter for preventing cascading failures.
 *
 * States:
 * - `closed`: Normal operation, requests pass through
 * - `open`: Circuit is tripped, requests fail immediately
 * - `half-open`: Testing if service has recovered
 */
export class CircuitBreaker implements CircuitBreakerAdapterInterface {
	readonly #failureThreshold: number
	readonly #successThreshold: number
	readonly #resetTimeoutMs: number
	readonly #monitorWindowMs: number

	#state: 'closed' | 'open' | 'half-open' = 'closed'
	#failureCount = 0
	#successCount = 0
	#lastFailureTime = 0
	#lastSuccessTime = 0
	#failures: number[] = []

	readonly #stateChangeCallbacks = new Set<(state: 'closed' | 'open' | 'half-open', previous: 'closed' | 'open' | 'half-open') => void>()
	readonly #failureCallbacks = new Set<(error: unknown, failureCount: number) => void>()
	readonly #successCallbacks = new Set<(successCount: number) => void>()

	constructor(options: CircuitBreakerAdapterOptions = {}) {
		this.#failureThreshold = options.failureThreshold ?? DEFAULT_CIRCUIT_BREAKER_FAILURE_THRESHOLD
		this.#successThreshold = options.successThreshold ?? DEFAULT_CIRCUIT_BREAKER_SUCCESS_THRESHOLD
		this.#resetTimeoutMs = options.resetTimeoutMs ?? DEFAULT_CIRCUIT_BREAKER_RESET_TIMEOUT_MS
		this.#monitorWindowMs = options.monitorWindowMs ?? DEFAULT_CIRCUIT_BREAKER_MONITOR_WINDOW_MS

		if (options.onStateChange) {
			this.#stateChangeCallbacks.add(options.onStateChange)
		}
	}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (!this.canExecute()) {
			throw new Error('Circuit breaker is open')
		}

		try {
			const result = await operation()
			this.#recordSuccess()
			return result
		} catch (error) {
			this.#recordFailure(error)
			throw error
		}
	}

	canExecute(): boolean {
		this.#cleanupOldFailures()

		if (this.#state === 'closed') {
			return true
		}

		if (this.#state === 'open') {
			// Check if reset timeout has elapsed
			const now = Date.now()
			if (now - this.#lastFailureTime >= this.#resetTimeoutMs) {
				this.#transitionTo('half-open')
				return true
			}
			return false
		}

		// half-open state: allow one request through
		return true
	}

	#recordSuccess(): void {
		this.#cleanupOldFailures()
		this.#lastSuccessTime = Date.now()
		this.#successCount++

		// Notify success callbacks
		for (const callback of this.#successCallbacks) {
			callback(this.#successCount)
		}

		if (this.#state === 'half-open') {
			if (this.#successCount >= this.#successThreshold) {
				this.#transitionTo('closed')
			}
		} else if (this.#state === 'closed') {
			// Reset failure count on success in closed state
			this.#failureCount = 0
		}
	}

	#recordFailure(error?: unknown): void {
		const now = Date.now()
		this.#failures.push(now)
		this.#cleanupOldFailures()
		this.#lastFailureTime = now
		this.#failureCount = this.#failures.length

		// Notify failure callbacks
		for (const callback of this.#failureCallbacks) {
			callback(error, this.#failureCount)
		}

		if (this.#state === 'half-open') {
			// Any failure in half-open state trips the circuit again
			this.#transitionTo('open')
		} else if (this.#state === 'closed') {
			if (this.#failureCount >= this.#failureThreshold) {
				this.#transitionTo('open')
			}
		}
	}

	getState(): CircuitBreakerState {
		this.#cleanupOldFailures()
		const now = Date.now()
		return {
			state: this.#state,
			failureCount: this.#failures.length,
			successCount: this.#successCount,
			lastFailureTime: this.#lastFailureTime,
			lastSuccessTime: this.#lastSuccessTime,
			nextAttemptTime: this.#state === 'open'
				? this.#lastFailureTime + this.#resetTimeoutMs
				: now,
		}
	}

	open(): void {
		this.#transitionTo('open')
		this.#lastFailureTime = Date.now()
	}

	close(): void {
		this.#transitionTo('closed')
	}

	reset(): void {
		this.#failureCount = 0
		this.#successCount = 0
		this.#failures = []
		this.#lastFailureTime = 0
		this.#lastSuccessTime = 0
		this.#transitionTo('closed')
	}

	onStateChange(callback: (state: 'closed' | 'open' | 'half-open', previous: 'closed' | 'open' | 'half-open') => void): Unsubscribe {
		this.#stateChangeCallbacks.add(callback)
		return () => this.#stateChangeCallbacks.delete(callback)
	}

	onFailure(callback: (error: unknown, failureCount: number) => void): Unsubscribe {
		this.#failureCallbacks.add(callback)
		return () => this.#failureCallbacks.delete(callback)
	}

	onSuccess(callback: (successCount: number) => void): Unsubscribe {
		this.#successCallbacks.add(callback)
		return () => this.#successCallbacks.delete(callback)
	}

	#transitionTo(newState: 'closed' | 'open' | 'half-open'): void {
		if (this.#state === newState) return

		const previous = this.#state
		this.#state = newState

		// Reset counters on state transition
		if (newState === 'closed') {
			this.#failureCount = 0
			this.#successCount = 0
			this.#failures = []
		} else if (newState === 'half-open') {
			this.#successCount = 0
		} else if (newState === 'open') {
			this.#successCount = 0
		}

		// Notify state change callbacks
		for (const callback of this.#stateChangeCallbacks) {
			callback(newState, previous)
		}
	}

	#cleanupOldFailures(): void {
		const now = Date.now()
		const cutoff = now - this.#monitorWindowMs
		this.#failures = this.#failures.filter((time) => time > cutoff)
	}
}
