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
export class Batch implements BatchAdapterInterface {
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
