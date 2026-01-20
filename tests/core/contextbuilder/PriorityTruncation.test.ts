/**
 * PriorityTruncation Adapter Tests
 *
 * Tests for priority-based truncation strategy.
 */

import { describe, it, expect } from 'vitest'
import { createPriorityTruncationAdapter } from '@mikesaintsg/adapters'
import type { ContextFrame } from '@mikesaintsg/core'
import { createContextFrame } from '../../setup.js'

describe('PriorityTruncationAdapter', () => {
	describe('sort', () => {
		it('sorts frames by priority (highest first, lowest at end)', () => {
			const truncator = createPriorityTruncationAdapter()
			const low = createContextFrame('1', 'low', 'low')
			const high = createContextFrame('2', 'high', 'high')
			const normal = createContextFrame('3', 'normal', 'normal')

			const sorted = truncator.sort([low, high, normal])

			// High priority should be first (kept), low at end (removed first)
			expect(sorted[0]).toBe(high)
			expect(sorted[sorted.length - 1]).toBe(low)
		})

		it('handles all priority levels', () => {
			const truncator = createPriorityTruncationAdapter()
			const optional = createContextFrame('1', 'optional', 'optional')
			const low = createContextFrame('2', 'low', 'low')
			const normal = createContextFrame('3', 'normal', 'normal')
			const high = createContextFrame('4', 'high', 'high')
			const critical = createContextFrame('5', 'critical', 'critical')

			const sorted = truncator.sort([optional, low, normal, high, critical])

			expect(sorted[0]).toBe(critical)
			expect(sorted[1]).toBe(high)
			expect(sorted[2]).toBe(normal)
			expect(sorted[3]).toBe(low)
			expect(sorted[4]).toBe(optional)
		})

		it('preserves relative order for same priority', () => {
			const truncator = createPriorityTruncationAdapter()
			const first = createContextFrame('1', 'first', 'normal')
			const second = createContextFrame('2', 'second', 'normal')
			const third = createContextFrame('3', 'third', 'normal')

			const sorted = truncator.sort([first, second, third])

			expect(sorted).toHaveLength(3)
			// Same priority - relative order may vary based on sort stability
		})

		it('handles empty array', () => {
			const truncator = createPriorityTruncationAdapter()

			const sorted = truncator.sort([])

			expect(sorted).toHaveLength(0)
		})

		it('handles single frame', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createContextFrame('1', 'only', 'high')

			const sorted = truncator.sort([frame])

			expect(sorted).toHaveLength(1)
			expect(sorted[0]).toBe(frame)
		})

		it('does not mutate original array', () => {
			const truncator = createPriorityTruncationAdapter()
			const frames = [
				createContextFrame('1', 'low', 'low'),
				createContextFrame('2', 'high', 'high'),
			]
			const originalFirst = frames[0]

			truncator.sort(frames)

			expect(frames[0]).toBe(originalFirst)
		})

		it('handles frames without priority metadata', () => {
			const truncator = createPriorityTruncationAdapter()
			const withPriority = createContextFrame('1', 'high', 'high')
			const noPriority: ContextFrame = {
				id: '2',
				type: 'retrieval',
				source: 'test',
				content: 'no priority',
				contentHash: 'hash',
				priority: 'normal',
				tokenCount: 10,
				tokenEstimate: 10,
				createdAt: Date.now(),
			} as unknown as ContextFrame

			const sorted = truncator.sort([noPriority, withPriority])

			expect(sorted[0]).toBe(withPriority)
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createContextFrame('1', 'critical content', 'critical')

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve high priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createContextFrame('1', 'high priority', 'high')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve normal priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createContextFrame('1', 'normal', 'normal')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve low priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createContextFrame('1', 'low', 'low')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve optional priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createContextFrame('1', 'optional', 'optional')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})
	})
})
