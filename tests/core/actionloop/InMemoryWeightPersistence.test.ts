/**
 * InMemoryWeightPersistence Adapter Tests
 *
 * Tests for in-memory ActionLoop weight persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createInMemoryWeightPersistenceAdapter } from '@mikesaintsg/adapters'
import type { ExportedPredictiveGraph } from '@mikesaintsg/core'

function createWeights(modelId: string): ExportedPredictiveGraph {
	return {
		version: 1,
		exportedAt: Date.now(),
		modelId,
		weights: [],
		decayConfig: { algorithm: 'exponential', halfLifeMs: 604800000, minWeight: 0.01 },
		transitionCount: 0,
	} as unknown as ExportedPredictiveGraph
}

describe('InMemoryWeightPersistence', () => {
	let adapter: ReturnType<typeof createInMemoryWeightPersistenceAdapter>

	beforeEach(() => {
		adapter = createInMemoryWeightPersistenceAdapter()
	})

	describe('isAvailable', () => {
		it('returns true', async() => {
			const result = await adapter.isAvailable()
			expect(result).toBe(true)
		})
	})

	describe('save', () => {
		it('saves weights', async() => {
			const weights = createWeights('model-1')

			await adapter.save(weights)

			const loaded = await adapter.load('model-1')
			expect(loaded).toBeDefined()
			expect(loaded?.modelId).toBe('model-1')
		})

		it('overwrites existing weights', async() => {
			const weights1 = createWeights('model-1')
			const weights2 = { ...createWeights('model-1'), transitionCount: 100 }

			await adapter.save(weights1)
			await adapter.save(weights2 as ExportedPredictiveGraph)

			const loaded = await adapter.load('model-1')
			expect(loaded?.transitionCount).toBe(100)
		})
	})

	describe('load', () => {
		it('returns undefined for non-existent model', async() => {
			const loaded = await adapter.load('non-existent')
			expect(loaded).toBeUndefined()
		})

		it('returns weights for existing model', async() => {
			const weights = createWeights('model-1')
			await adapter.save(weights)

			const loaded = await adapter.load('model-1')

			expect(loaded).toBeDefined()
			expect(loaded?.modelId).toBe('model-1')
		})
	})

	describe('has', () => {
		it('returns false for non-existent model', async() => {
			const result = await adapter.has('non-existent')
			expect(result).toBe(false)
		})

		it('returns true for existing model', async() => {
			await adapter.save(createWeights('model-1'))

			const result = await adapter.has('model-1')
			expect(result).toBe(true)
		})
	})

	describe('delete', () => {
		it('deletes existing weights', async() => {
			await adapter.save(createWeights('model-1'))

			await adapter.delete('model-1')

			const result = await adapter.has('model-1')
			expect(result).toBe(false)
		})

		it('handles deleting non-existent model', async() => {
			await expect(adapter.delete('non-existent')).resolves.toBeUndefined()
		})
	})

	describe('list', () => {
		it('returns empty array when no weights saved', async() => {
			const list = await adapter.list()
			expect(list).toHaveLength(0)
		})

		it('returns all model IDs', async() => {
			await adapter.save(createWeights('model-1'))
			await adapter.save(createWeights('model-2'))
			await adapter.save(createWeights('model-3'))

			const list = await adapter.list()

			expect(list).toHaveLength(3)
			expect(list).toContain('model-1')
			expect(list).toContain('model-2')
			expect(list).toContain('model-3')
		})
	})

	describe('clear', () => {
		it('clears all weights', async() => {
			await adapter.save(createWeights('model-1'))
			await adapter.save(createWeights('model-2'))

			await adapter.clear()

			const list = await adapter.list()
			expect(list).toHaveLength(0)
		})
	})
})
