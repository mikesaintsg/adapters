/**
 * Priority Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createPriorityAdapter } from '@mikesaintsg/adapters'
import { createContextFrame } from '../../setup.js'

describe('PriorityAdapter', () => {
	describe('getWeight', () => {
		it('returns weight for critical priority', () => {
			const priority = createPriorityAdapter()

			expect(priority.getWeight('critical')).toBe(1.0)
		})

		it('returns weight for high priority', () => {
			const priority = createPriorityAdapter()

			expect(priority.getWeight('high')).toBe(0.75)
		})

		it('returns weight for normal priority', () => {
			const priority = createPriorityAdapter()

			expect(priority.getWeight('normal')).toBe(0.5)
		})

		it('returns weight for low priority', () => {
			const priority = createPriorityAdapter()

			expect(priority.getWeight('low')).toBe(0.25)
		})

		it('returns weight for optional priority', () => {
			const priority = createPriorityAdapter()

			expect(priority.getWeight('optional')).toBe(0.1)
		})

		it('uses custom weights', () => {
			const priority = createPriorityAdapter({
				weights: {
					critical: 2.0,
					high: 1.5,
				},
			})

			expect(priority.getWeight('critical')).toBe(2.0)
			expect(priority.getWeight('high')).toBe(1.5)
			// Others use defaults
			expect(priority.getWeight('normal')).toBe(0.5)
		})
	})

	describe('compare', () => {
		it('returns negative for higher priority first', () => {
			const priority = createPriorityAdapter()
			const high = createContextFrame('1', 'high', 'high')
			const low = createContextFrame('2', 'low', 'low')

			// Negative means 'a' (high) comes before 'b' (low)
			expect(priority.compare(high, low)).toBeLessThan(0)
		})

		it('returns positive for lower priority first', () => {
			const priority = createPriorityAdapter()
			const high = createContextFrame('1', 'high', 'high')
			const low = createContextFrame('2', 'low', 'low')

			// Positive means 'a' (low) comes after 'b' (high)
			expect(priority.compare(low, high)).toBeGreaterThan(0)
		})

		it('returns zero for equal priority', () => {
			const priority = createPriorityAdapter()
			const first = createContextFrame('1', 'first', 'normal')
			const second = createContextFrame('2', 'second', 'normal')

			expect(priority.compare(first, second)).toBe(0)
		})

		it('treats missing priority as normal', () => {
			const priority = createPriorityAdapter()
			const normal = createContextFrame('1', 'normal', 'normal')
			const missing = createContextFrame('2', 'missing')

			expect(priority.compare(normal, missing)).toBe(0)
		})
	})
})
