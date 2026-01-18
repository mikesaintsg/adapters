/**
 * @mikesaintsg/adapters
 *
 * Tests for batch adapter.
 */

import { describe, it, expect } from 'vitest'
import { createBatchAdapter } from '@mikesaintsg/adapters'

describe('Batch Adapter', () => {
	describe('createBatchAdapter', () => {
		it('creates adapter with default options', () => {
			const batch = createBatchAdapter()

			expect(batch.getBatchSize()).toBe(100)
			expect(batch.getDelayMs()).toBe(50)
			expect(batch.shouldDeduplicate()).toBe(true)
		})

		it('creates adapter with custom batchSize', () => {
			const batch = createBatchAdapter({ batchSize: 50 })

			expect(batch.getBatchSize()).toBe(50)
		})

		it('creates adapter with custom delayMs', () => {
			const batch = createBatchAdapter({ delayMs: 100 })

			expect(batch.getDelayMs()).toBe(100)
		})

		it('creates adapter with deduplicate disabled', () => {
			const batch = createBatchAdapter({ deduplicate: false })

			expect(batch.shouldDeduplicate()).toBe(false)
		})

		it('creates adapter with all custom options', () => {
			const batch = createBatchAdapter({
				batchSize: 200,
				delayMs: 25,
				deduplicate: false,
			})

			expect(batch.getBatchSize()).toBe(200)
			expect(batch.getDelayMs()).toBe(25)
			expect(batch.shouldDeduplicate()).toBe(false)
		})
	})

	describe('Edge Cases', () => {
		it('handles zero batchSize', () => {
			const batch = createBatchAdapter({ batchSize: 0 })

			expect(batch.getBatchSize()).toBe(0)
		})

		it('handles zero delayMs', () => {
			const batch = createBatchAdapter({ delayMs: 0 })

			expect(batch.getDelayMs()).toBe(0)
		})

		it('handles very large batchSize', () => {
			const batch = createBatchAdapter({ batchSize: 1000000 })

			expect(batch.getBatchSize()).toBe(1000000)
		})
	})
})
