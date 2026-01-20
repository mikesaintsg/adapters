/**
 * ScoreTruncation Adapter Tests
 *
 * Tests for score-based truncation strategy.
 */

import { describe, it, expect } from 'vitest'
import { createScoreTruncationAdapter } from '@mikesaintsg/adapters'
import { createContextFrame } from '../../setup.js'

describe('ScoreTruncationAdapter', () => {
	describe('sort', () => {
		it('sorts frames by score (highest first, lowest at end)', () => {
			const truncator = createScoreTruncationAdapter()
			const low = createContextFrame('1', 'low', undefined, 0.3)
			const high = createContextFrame('2', 'high', undefined, 0.9)
			const medium = createContextFrame('3', 'medium', undefined, 0.6)

			const sorted = truncator.sort([low, high, medium])

			// High score first (kept), low score at end (removed first)
			expect(sorted[0]).toBe(high)
			expect(sorted[1]).toBe(medium)
			expect(sorted[sorted.length - 1]).toBe(low)
		})

		it('handles missing scores as 0', () => {
			const truncator = createScoreTruncationAdapter()
			const withScore = createContextFrame('1', 'with score', undefined, 0.5)
			const noScore = createContextFrame('2', 'no score')

			const sorted = truncator.sort([noScore, withScore])

			expect(sorted[0]).toBe(withScore)
			expect(sorted[1]).toBe(noScore)
		})

		it('handles all zero scores', () => {
			const truncator = createScoreTruncationAdapter()
			const first = createContextFrame('1', 'first', undefined, 0)
			const second = createContextFrame('2', 'second', undefined, 0)

			const sorted = truncator.sort([first, second])

			expect(sorted).toHaveLength(2)
		})

		it('handles negative scores', () => {
			const truncator = createScoreTruncationAdapter()
			const negative = createContextFrame('1', 'negative', undefined, -0.5)
			const positive = createContextFrame('2', 'positive', undefined, 0.5)
			const zero = createContextFrame('3', 'zero', undefined, 0)

			const sorted = truncator.sort([negative, positive, zero])

			expect(sorted[0]).toBe(positive)
			expect(sorted[1]).toBe(zero)
			expect(sorted[2]).toBe(negative)
		})

		it('handles scores at boundaries', () => {
			const truncator = createScoreTruncationAdapter()
			const min = createContextFrame('1', 'min', undefined, 0)
			const max = createContextFrame('2', 'max', undefined, 1)

			const sorted = truncator.sort([min, max])

			expect(sorted[0]).toBe(max)
			expect(sorted[1]).toBe(min)
		})

		it('handles empty array', () => {
			const truncator = createScoreTruncationAdapter()

			const sorted = truncator.sort([])

			expect(sorted).toHaveLength(0)
		})

		it('handles single frame', () => {
			const truncator = createScoreTruncationAdapter()
			const frame = createContextFrame('1', 'only', undefined, 0.5)

			const sorted = truncator.sort([frame])

			expect(sorted).toHaveLength(1)
			expect(sorted[0]).toBe(frame)
		})

		it('does not mutate original array', () => {
			const truncator = createScoreTruncationAdapter()
			const frames = [
				createContextFrame('1', 'low', undefined, 0.1),
				createContextFrame('2', 'high', undefined, 0.9),
			]
			const originalFirst = frames[0]

			truncator.sort(frames)

			expect(frames[0]).toBe(originalFirst)
		})

		it('handles many frames with various scores', () => {
			const truncator = createScoreTruncationAdapter()
			const frames = Array.from({ length: 100 }, (_, i) =>
				createContextFrame(`${i}`, `content-${i}`, undefined, i / 100),
			)

			const sorted = truncator.sort(frames)

			expect(sorted).toHaveLength(100)
			// Highest score (0.99) should be first
			expect(sorted[0]?.id).toBe('99')
			// Lowest score (0) should be last
			expect(sorted[99]?.id).toBe('0')
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames regardless of score', () => {
			const truncator = createScoreTruncationAdapter()
			const frame = createContextFrame('1', 'critical', 'critical', 0.1)

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve high score frames without critical priority', () => {
			const truncator = createScoreTruncationAdapter()
			const frame = createContextFrame('1', 'high score', 'high', 0.99)

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve normal priority frames', () => {
			const truncator = createScoreTruncationAdapter()
			const frame = createContextFrame('1', 'normal', 'normal', 0.5)

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve low priority frames', () => {
			const truncator = createScoreTruncationAdapter()
			const frame = createContextFrame('1', 'low', 'low', 0.8)

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})
	})
})
