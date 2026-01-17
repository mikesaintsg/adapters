/**
 * @mikesaintsg/adapters
 *
 * Retryable provider adapter wrapper.
 * Wraps a provider adapter with retry logic for transient failures.
 */

import type { ProviderCapabilities, Unsubscribe } from '@mikesaintsg/core'
import type {
	GenerationOptions,
	GenerationResult,
	Message,
	ProviderAdapterInterface,
	StreamHandleInterface,
} from '@mikesaintsg/inference'
import type { RetryableProviderAdapterOptions, RetryOptions } from '../types.js'
import { isAdapterError } from '../errors.js'
import { DEFAULT_RETRYABLE_CODES } from '../constants.js'
import { createDoneIteratorResult } from '../helpers.js'

/** Default retry options */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
	maxRetries: 3,
	initialDelayMs: 1000,
	maxDelayMs: 30000,
	backoffMultiplier: 2,
	jitter: true,
	retryableCodes: DEFAULT_RETRYABLE_CODES,
}

/**
 * Create a retryable provider adapter.
 *
 * Wraps a base provider adapter with retry logic for transient failures.
 * Retries on rate limits, network errors, and service errors.
 *
 * @param options - Wrapper options
 * @returns A provider adapter with retry logic
 *
 * @example
 * ```ts
 * const baseAdapter = createOpenAIProviderAdapter({ apiKey })
 *
 * const adapter = createRetryableProviderAdapter({
 *   adapter: baseAdapter,
 *   retry: {
 *     maxRetries: 3,
 *     onRetry: (err, attempt, delay) => {
 *       console.log(`Retry ${attempt} in ${delay}ms`)
 *     },
 *   },
 * })
 * ```
 */
export function createRetryableProviderAdapter(
	options: RetryableProviderAdapterOptions,
): ProviderAdapterInterface {
	const baseAdapter = options.adapter
	const retryOptions = {
		...DEFAULT_RETRY_OPTIONS,
		...options.retry,
	}

	return {
		getId(): string {
			return baseAdapter.getId()
		},

		supportsTools(): boolean {
			return baseAdapter.supportsTools()
		},

		supportsStreaming(): boolean {
			return baseAdapter.supportsStreaming()
		},

		getCapabilities(): ProviderCapabilities {
			return baseAdapter.getCapabilities()
		},

		generate(
			messages: readonly Message[],
			generationOptions: GenerationOptions,
		): StreamHandleInterface {
			const requestId = crypto.randomUUID()
			const tokenCallbacks = new Set<(token: string) => void>()
			const completeCallbacks = new Set<(result: GenerationResult) => void>()
			const errorCallbacks = new Set<(error: Error) => void>()

			let resolveResult: ((result: GenerationResult) => void) | undefined
			let rejectResult: ((error: Error) => void) | undefined

			// Token queue for async iteration
			const tokenQueue: string[] = []
			let iteratorResolve: ((value: IteratorResult<string>) => void) | undefined
			let iteratorDone = false
			let iteratorError: Error | undefined

			// Track current handle for abort
			let currentHandle: StreamHandleInterface | undefined
			let aborted = false

			// Create promise for result
			const resultPromise = new Promise<GenerationResult>((resolve, reject) => {
				resolveResult = resolve
				rejectResult = reject
			})

			// Start with retry logic
			void attemptGeneration(0)

			async function attemptGeneration(attempt: number): Promise<void> {
				if (aborted) {
					const result: GenerationResult = {
						text: '',
						toolCalls: [],
						finishReason: 'stop',
						aborted: true,
					}
					handleComplete(result)
					return
				}

				try {
					currentHandle = baseAdapter.generate(messages, generationOptions)

					// Forward tokens
					currentHandle.onToken(token => {
						emitToken(token)
					})

					// Wait for result
					const result = await currentHandle.result()

					if (result.aborted) {
						handleComplete(result)
						return
					}

					handleComplete(result)
				} catch (error) {
					// Check if we should retry
					const shouldRetry = canRetry(error, attempt, retryOptions)

					if (!shouldRetry || aborted) {
						const adapterError = error instanceof Error
							? error
							: new Error(String(error))
						handleError(adapterError)
						return
					}

					// Calculate delay
					let delay = calculateDelay(attempt, retryOptions)

					// Check for retryAfter from rate limit errors
					if (isAdapterError(error) && error.retryAfter) {
						delay = Math.max(delay, error.retryAfter)
					}

					// Call onRetry callback
					if (retryOptions.onRetry) {
						retryOptions.onRetry(error, attempt + 1, delay)
					}

					// Wait and retry
					await sleep(delay)

					// Clear accumulated tokens for retry
					tokenQueue.length = 0

					void attemptGeneration(attempt + 1)
				}
			}

			function emitToken(token: string): void {
				for (const cb of tokenCallbacks) {
					cb(token)
				}
				if (iteratorResolve) {
					iteratorResolve({ value: token, done: false })
					iteratorResolve = undefined
				} else {
					tokenQueue.push(token)
				}
			}

			function handleComplete(result: GenerationResult): void {
				iteratorDone = true
				if (iteratorResolve) {
					iteratorResolve(createDoneIteratorResult<string>())
				}
				for (const cb of completeCallbacks) {
					cb(result)
				}
				resolveResult?.(result)
			}

			function handleError(error: Error): void {
				iteratorDone = true
				iteratorError = error
				if (iteratorResolve) {
					iteratorResolve(createDoneIteratorResult<string>())
				}
				for (const cb of errorCallbacks) {
					cb(error)
				}
				rejectResult?.(error)
			}

			return {
				requestId,

				[Symbol.asyncIterator](): AsyncIterator<string> {
					return {
						next(): Promise<IteratorResult<string>> {
							if (iteratorError) {
								return Promise.reject(iteratorError)
							}
							if (tokenQueue.length > 0) {
								return Promise.resolve({
									value: tokenQueue.shift()!,
									done: false,
								})
							}
							if (iteratorDone) {
								return Promise.resolve(createDoneIteratorResult<string>())
							}
							return new Promise(resolve => {
								iteratorResolve = resolve
							})
						},
					}
				},

				result(): Promise<GenerationResult> {
					return resultPromise
				},

				abort(): void {
					aborted = true
					currentHandle?.abort()
				},

				onToken(callback: (token: string) => void): Unsubscribe {
					tokenCallbacks.add(callback)
					return () => tokenCallbacks.delete(callback)
				},

				onComplete(callback: (result: GenerationResult) => void): Unsubscribe {
					completeCallbacks.add(callback)
					return () => completeCallbacks.delete(callback)
				},

				onError(callback: (error: Error) => void): Unsubscribe {
					errorCallbacks.add(callback)
					return () => errorCallbacks.delete(callback)
				},
			}
		},
	}
}

/** Check if error is retryable */
function canRetry(
	error: unknown,
	attempt: number,
	options: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> & Pick<RetryOptions, 'shouldRetry'>,
): boolean {
	if (attempt >= options.maxRetries) {
		return false
	}

	// Use custom shouldRetry if provided
	if (options.shouldRetry) {
		return options.shouldRetry(error, attempt)
	}

	// Check if it's an AdapterError with a retryable code
	if (isAdapterError(error)) {
		return options.retryableCodes.includes(error.code)
	}

	// Retry network errors
	if (error instanceof TypeError && error.message.includes('fetch')) {
		return true
	}

	return false
}

/** Calculate delay with exponential backoff and jitter */
function calculateDelay(
	attempt: number,
	options: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>>,
): number {
	let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt)
	delay = Math.min(delay, options.maxDelayMs)

	if (options.jitter) {
		// Add 0-25% jitter
		delay = delay * (1 + Math.random() * 0.25)
	}

	return Math.round(delay)
}

/** Sleep for specified milliseconds */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
