/**
 * LIFOTruncation Adapter Tests
 *
 * Tests for LIFO (Last-In-First-Out) truncation strategy.
 */

import { describe, it, expect } from 'vitest'
import { createLIFOTruncationAdapter } from '@mikesaintsg/adapters'
import type { ContextFrame } from '@mikesaintsg/core'
import { createContextFrame } from '../../setup.js'

describe('LIFOTruncationAdapter', () => {
	describe('sort', () => {
		it('preserves order (newest at end for removal)', () => {
			const truncator = createLIFOTruncationAdapter()
			const first = createContextFrame('1', 'first')
			const second = createContextFrame('2', 'second')
			const third = createContextFrame('3', 'third')

			const sorted = truncator.sort([first, second, third])

			// Order preserved: newest (third) at end, gets removed first
			expect(sorted[0]).toBe(first)
			expect(sorted[sorted.length - 1]).toBe(third)
		})

		it('handles empty array', () => {
			const truncator = createLIFOTruncationAdapter()

			const sorted = truncator.sort([])

			expect(sorted).toHaveLength(0)
		})

		it('handles single frame', () => {
			const truncator = createLIFOTruncationAdapter()
			const frame = createContextFrame('1', 'only')

			const sorted = truncator.sort([frame])

			expect(sorted).toHaveLength(1)
			expect(sorted[0]).toBe(frame)
		})

		it('does not mutate original array', () => {
			const truncator = createLIFOTruncationAdapter()
			const frames = [
				createContextFrame('1', 'first'),
				createContextFrame('2', 'second'),
			]
			const originalFirst = frames[0]

			truncator.sort(frames)

			expect(frames[0]).toBe(originalFirst)
		})

		it('handles many frames', () => {
			const truncator = createLIFOTruncationAdapter()
			const frames = Array.from({ length: 100 }, (_, i) =>
				createContextFrame(`${i}`, `content-${i}`),
			)

			const sorted = truncator.sort(frames)

			expect(sorted).toHaveLength(100)
			// First stays first
			expect(sorted[0]?.id).toBe('0')
			// Last stays last
			expect(sorted[99]?.id).toBe('99')
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames', () => {
			const truncator = createLIFOTruncationAdapter()
			const frame = createContextFrame('1', 'critical content', 'critical')

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve high priority frames', () => {
			const truncator = createLIFOTruncationAdapter()
			const frame = createContextFrame('1', 'high priority', 'high')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve normal priority frames', () => {
			const truncator = createLIFOTruncationAdapter()
			const frame = createContextFrame('1', 'normal', 'normal')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve low priority frames', () => {
			const truncator = createLIFOTruncationAdapter()
			const frame = createContextFrame('1', 'low', 'low')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve optional priority frames', () => {
			const truncator = createLIFOTruncationAdapter()
			const frame = createContextFrame('1', 'optional', 'optional')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('handles frame without priority metadata', () => {
			const truncator = createLIFOTruncationAdapter()
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
