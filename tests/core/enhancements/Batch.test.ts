/**
 * Batch adapter tests.
 */

import { describe, it, expect } from 'vitest'

import { createBatchAdapter } from '@mikesaintsg/adapters'

describe('Batch', () => {
	describe('createBatchAdapter', () => {
		it('creates batch adapter with default options', () => {
			const batch = createBatchAdapter()

			expect(batch.getBatchSize()).toBe(100)
			expect(batch.getDelayMs()).toBe(50)
			expect(batch.shouldDeduplicate()).toBe(true)
		})

		it('respects custom batch size', () => {
			const batch = createBatchAdapter({
				batchSize: 50,
			})

			expect(batch.getBatchSize()).toBe(50)
		})

		it('respects custom delay', () => {
			const batch = createBatchAdapter({
				delayMs: 100,
			})

			expect(batch.getDelayMs()).toBe(100)
		})

		it('respects deduplicate option', () => {
			const batchWithDedupe = createBatchAdapter({
				deduplicate: true,
			})
			expect(batchWithDedupe.shouldDeduplicate()).toBe(true)

			const batchWithoutDedupe = createBatchAdapter({
				deduplicate: false,
			})
			expect(batchWithoutDedupe.shouldDeduplicate()).toBe(false)
		})

		it('allows all options to be configured', () => {
			const batch = createBatchAdapter({
				batchSize: 25,
				delayMs: 200,
				deduplicate: false,
			})

			expect(batch.getBatchSize()).toBe(25)
			expect(batch.getDelayMs()).toBe(200)
			expect(batch.shouldDeduplicate()).toBe(false)
		})
	})
})
