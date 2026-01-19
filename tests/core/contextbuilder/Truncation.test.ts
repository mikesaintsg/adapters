/**
 * Truncation Adapters Tests
 */

import { describe, it, expect } from 'vitest'
import {
	createPriorityTruncationAdapter,
	createFIFOTruncationAdapter,
	createLIFOTruncationAdapter,
	createScoreTruncationAdapter,
} from '@mikesaintsg/adapters'
import type { ContextFrame } from '@mikesaintsg/core'

function createFrame(id: string, content: string, priority?: string, score?: number): ContextFrame {
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
		metadata: { priority, score },
	} as unknown as ContextFrame
}

describe('PriorityTruncationAdapter', () => {
	describe('sort', () => {
		it('sorts frames by priority (highest first)', () => {
			const truncator = createPriorityTruncationAdapter()
			const low = createFrame('1', 'low', 'low')
			const high = createFrame('2', 'high', 'high')
			const normal = createFrame('3', 'normal', 'normal')

			const sorted = truncator.sort([low, high, normal])

			// High priority should be first (kept), low at end (removed first)
			expect(sorted[0]).toBe(high)
			expect(sorted[sorted.length - 1]).toBe(low)
		})

		it('preserves order for same priority', () => {
			const truncator = createPriorityTruncationAdapter()
			const first = createFrame('1', 'first', 'normal')
			const second = createFrame('2', 'second', 'normal')

			const sorted = truncator.sort([first, second])

			expect(sorted).toHaveLength(2)
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createFrame('1', 'critical', 'critical')

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve normal frames', () => {
			const truncator = createPriorityTruncationAdapter()
			const frame = createFrame('1', 'normal', 'normal')

			expect(truncator.shouldPreserve(frame)).toBe(false)
		})
	})
})

describe('FIFOTruncationAdapter', () => {
	describe('sort', () => {
		it('reverses order (oldest at end)', () => {
			const truncator = createFIFOTruncationAdapter()
			const first = createFrame('1', 'first')
			const second = createFrame('2', 'second')
			const third = createFrame('3', 'third')

			const sorted = truncator.sort([first, second, third])

			// Original order reversed: oldest (first) at end
			expect(sorted[0]).toBe(third)
			expect(sorted[sorted.length - 1]).toBe(first)
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames', () => {
			const truncator = createFIFOTruncationAdapter()
			const frame = createFrame('1', 'critical', 'critical')

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})
	})
})

describe('LIFOTruncationAdapter', () => {
	describe('sort', () => {
		it('preserves order (newest at end)', () => {
			const truncator = createLIFOTruncationAdapter()
			const first = createFrame('1', 'first')
			const second = createFrame('2', 'second')
			const third = createFrame('3', 'third')

			const sorted = truncator.sort([first, second, third])

			// Order preserved: newest (third) at end, gets removed first
			expect(sorted[0]).toBe(first)
			expect(sorted[sorted.length - 1]).toBe(third)
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames', () => {
			const truncator = createLIFOTruncationAdapter()
			const frame = createFrame('1', 'critical', 'critical')

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})
	})
})

describe('ScoreTruncationAdapter', () => {
	describe('sort', () => {
		it('sorts frames by score (highest first)', () => {
			const truncator = createScoreTruncationAdapter()
			const low = createFrame('1', 'low', undefined, 0.3)
			const high = createFrame('2', 'high', undefined, 0.9)
			const medium = createFrame('3', 'medium', undefined, 0.6)

			const sorted = truncator.sort([low, high, medium])

			// High score first (kept), low score at end (removed first)
			expect(sorted[0]).toBe(high)
			expect(sorted[sorted.length - 1]).toBe(low)
		})

		it('handles missing scores as 0', () => {
			const truncator = createScoreTruncationAdapter()
			const withScore = createFrame('1', 'with score', undefined, 0.5)
			const noScore = createFrame('2', 'no score')

			const sorted = truncator.sort([noScore, withScore])

			expect(sorted[0]).toBe(withScore)
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical frames', () => {
			const truncator = createScoreTruncationAdapter()
			const frame = createFrame('1', 'critical', 'critical', 0.1)

			expect(truncator.shouldPreserve(frame)).toBe(true)
		})
	})
})
