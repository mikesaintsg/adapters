/**
 * Batch adapter implementation.
 * Implements BatchAdapterInterface for request batching and deduplication.
 */

import type { BatchAdapterInterface } from '@mikesaintsg/core'

import type { BatchAdapterOptions } from '../../types.js'
import {
	DEFAULT_BATCH_SIZE,
	DEFAULT_BATCH_DELAY_MS,
} from '../../constants.js'

/**
 * Batch adapter for request batching and deduplication.
 * Provides configuration for batching behavior.
 */
class Batch implements BatchAdapterInterface {
	readonly #batchSize: number
	readonly #delayMs: number
	readonly #deduplicate: boolean

	constructor(options: BatchAdapterOptions = {}) {
		this.#batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
		this.#delayMs = options.delayMs ?? DEFAULT_BATCH_DELAY_MS
		this.#deduplicate = options.deduplicate ?? true
	}

	getBatchSize(): number {
		return this.#batchSize
	}

	getDelayMs(): number {
		return this.#delayMs
	}

	shouldDeduplicate(): boolean {
		return this.#deduplicate
	}
}

/**
 * Create a batch adapter for request batching.
 *
 * @example
 * ```ts
 * const batch = createBatchAdapter({
 *   batchSize: 50,
 *   delayMs: 100,
 *   deduplicate: true,
 * })
 *
 * // Use batch settings to control batching behavior
 * const batchSize = batch.getBatchSize()
 * const delayMs = batch.getDelayMs()
 * const shouldDedupe = batch.shouldDeduplicate()
 * ```
 */
export function createBatchAdapter(
	options?: BatchAdapterOptions,
): BatchAdapterInterface {
	return new Batch(options)
}
