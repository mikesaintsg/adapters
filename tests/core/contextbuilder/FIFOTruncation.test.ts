/**
 * FIFOTruncation Adapter Tests
 *
 * Tests for FIFO (First-In-First-Out) truncation strategy.
 */

import { describe, it, expect } from 'vitest'
import { createFIFOTruncationAdapter } from '@mikesaintsg/adapters'
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

describe('FIFOTruncationAdapter', () => {
	describe('sort', () => {
		it('reverses order (oldest at end for removal)', () => {
			const truncator = createFIFOTruncationAdapter()
			const first = createFrame('1', 'first')
			const second = createFrame('2', 'second')
			const third = createFrame('3', 'third')

			const sorted = truncator.sort([first, second, third])

			// Original order reversed: oldest (first) at end
			expect(sorted[0]).toBe(third)
			expect(sorted[sorted.length - 1]).toBe(first)
		})

		it('handles empty array', () => {
			const truncator = createFIFOTruncationAdapter()

			const sorted = truncator.sort([])

			expect(sorted).toHaveLength(0)
		})

		it('handles single frame', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame = createFrame('1', 'only')

			const sorted = truncator.sort([frame])

			expect(sorted).toHaveLength(1)
			expect(sorted[0]).toBe(frame)
		})

		it('does not mutate original array', () => {
			const truncator = createFIFOTruncationAdapter()
			const frames = [
				createFrame('1', 'first'),
				createFrame('2', 'second'),
			]
			const originalFirst = frames[0]

			truncator.sort(frames)

			expect(frames[0]).toBe(originalFirst)
		})

		it('handles many frames', () => {
			const truncator = createFIFOTruncationAdapter()
			const frames = Array.from({ length: 100 }, (_, i) =>
				createFrame(`${i}`, `content-${i}`),
			)

			const sorted = truncator.sort(frames)

			expect(sorted).toHaveLength(100)
			// First becomes last
			expect(sorted[99]?.id).toBe('0')
			// Last becomes first
			expect(sorted[0]?.id).toBe('99')
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame = createFrame('1', 'critical content', 'critical')

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve high priority frames', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame = createFrame('1', 'high priority', 'high')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve normal priority frames', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame = createFrame('1', 'normal', 'normal')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve low priority frames', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame = createFrame('1', 'low', 'low')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve optional priority frames', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame = createFrame('1', 'optional', 'optional')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('handles frame without priority metadata', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame: ContextFrame = {
				id: '1',
				type: 'retrieval',
				source: 'test',
				content: 'no priority',
				contentHash: 'hash',
				priority: 'normal',
				tokenCount: 10,
				tokenEstimate: 10,
				createdAt: Date.now(),
			} as unknown as ContextFrame

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})
	})
})
