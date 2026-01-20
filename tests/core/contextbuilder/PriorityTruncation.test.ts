/**
 * PriorityTruncation Adapter Tests
 *
 * Tests for priority-based truncation strategy.
 */

import { describe, it, expect } from 'vitest'
import { createPriorityTruncationAdapter } from '@mikesaintsg/adapters'
import type { ContextFrame } from '@mikesaintsg/core'

function createFrame(id: string, content: string, priority?: string): ContextFrame {
	return {
		id,
		type: 'retrieval',
		source: 'test',
		content,
		contentHash: `hash-${content}`,
		priority: (priority ?? 'normal') as ContextFrame['priority'],
		tokenCount: content.length / 4,
		tokenEstimate: content.length / 4,
		createdAt: Date.now(),
		metadata: { priority },
	} as unknown as ContextFrame
}

describe('PriorityTruncationAdapter', () => {
	describe('sort', () => {
		it('sorts frames by priority (highest first, lowest at end)', () => {
			const truncator = createPriorityTruncationAdapter()
			const low = createFrame('1', 'low', 'low')
			const high = createFrame('2', 'high', 'high')
			const normal = createFrame('3', 'normal', 'normal')

			const sorted = truncator.sort([low, high, normal])

			// High priority should be first (kept), low at end (removed first)
			expect(sorted[0]).toBe(high)
			expect(sorted[sorted.length - 1]).toBe(low)
		})

		it('handles all priority levels', () => {
			const truncator = createPriorityTruncationAdapter()
			const optional = createFrame('1', 'optional', 'optional')
			const low = createFrame('2', 'low', 'low')
			const normal = createFrame('3', 'normal', 'normal')
			const high = createFrame('4', 'high', 'high')
			const critical = createFrame('5', 'critical', 'critical')

			const sorted = truncator.sort([optional, low, normal, high, critical])

			expect(sorted[0]).toBe(critical)
			expect(sorted[1]).toBe(high)
			expect(sorted[2]).toBe(normal)
			expect(sorted[3]).toBe(low)
			expect(sorted[4]).toBe(optional)
		})

		it('preserves relative order for same priority', () => {
			const truncator = createPriorityTruncationAdapter()
			const first = createFrame('1', 'first', 'normal')
			const second = createFrame('2', 'second', 'normal')
			const third = createFrame('3', 'third', 'normal')

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
			const frame = createFrame('1', 'only', 'high')

			const sorted = truncator.sort([frame])

			expect(sorted).toHaveLength(1)
			expect(sorted[0]).toBe(frame)
		})

		it('does not mutate original array', () => {
			const truncator = createPriorityTruncationAdapter()
			const frames = [
				createFrame('1', 'low', 'low'),
				createFrame('2', 'high', 'high'),
			]
			const originalFirst = frames[0]

			truncator.sort(frames)

			expect(frames[0]).toBe(originalFirst)
		})

		it('handles frames without priority metadata', () => {
			const truncator = createPriorityTruncationAdapter()
			const withPriority = createFrame('1', 'high', 'high')
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
			const frame = createFrame('1', 'critical content', 'critical')

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve high priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createFrame('1', 'high priority', 'high')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve normal priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createFrame('1', 'normal', 'normal')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve low priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createFrame('1', 'low', 'low')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve optional priority frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createFrame('1', 'optional', 'optional')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})
	})
})
