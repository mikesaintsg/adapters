/**
 * @mikesaintsg/adapters
 *
 * Batch adapter implementing BatchAdapterInterface.
 * Provides batching configuration for embedding operations.
 */

import type { BatchAdapterInterface } from '@mikesaintsg/core'
import type { BatchAdapterOptions } from '../types.js'
import {
	EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
	EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
} from '../constants.js'

/**
 * Create a batch adapter for embedding operations.
 *
 * @param options - Batch configuration options
 * @returns A BatchAdapterInterface implementation
 * @example
 * ```ts
 * const batch = createBatchAdapter({
 *   batchSize: 100,
 *   delayMs: 50,
 *   deduplicate: true,
 * })
 * ```
 */
export function createBatchAdapter(
	options?: BatchAdapterOptions,
): BatchAdapterInterface {
	const batchSize = options?.batchSize ?? EMBEDDING_BATCH_DEFAULT_MAX_SIZE
	const delayMs = options?.delayMs ?? EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS
	const deduplicate = options?.deduplicate ?? true

	return {
		getBatchSize(): number {
			return batchSize
		},

		getDelayMs(): number {
			return delayMs
		},

		shouldDeduplicate(): boolean {
			return deduplicate
		},
	}
}
