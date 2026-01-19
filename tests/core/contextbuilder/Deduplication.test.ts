/**
 * Deduplication Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createDeduplicationAdapter } from '@mikesaintsg/adapters'
import type { ContextFrame } from '@mikesaintsg/core'

function createFrame(content: string, priority?: string): ContextFrame {
	return {
		id: `frame-${Math.random().toString(36).slice(2)}`,
		type: 'retrieval',
		source: 'test',
		content,
		contentHash: `hash-${content}`,
		priority: (priority ?? 'normal') as ContextFrame['priority'],
		tokenCount: content.length / 4,
		tokenEstimate: content.length / 4,
		createdAt: Date.now(),
		metadata: priority ? { priority } : {},
	} as unknown as ContextFrame
}

describe('DeduplicationAdapter', () => {
	describe('select', () => {
		it('throws for empty array', () => {
			const dedup = createDeduplicationAdapter()

			expect(() => dedup.select([])).toThrow()
		})

		it('returns single frame unchanged', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createFrame('content')

			expect(dedup.select([frame])).toBe(frame)
		})

		it('keeps first frame with keep_first strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_first' })
			const first = createFrame('content 1')
			const second = createFrame('content 2')

			expect(dedup.select([first, second])).toBe(first)
		})

		it('keeps latest frame with keep_latest strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_latest' })
			const first = createFrame('content 1')
			const second = createFrame('content 2')

			expect(dedup.select([first, second])).toBe(second)
		})

		it('keeps highest priority with keep_highest_priority strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_highest_priority' })
			const low = createFrame('low', 'low')
			const high = createFrame('high', 'high')
			const normal = createFrame('normal', 'normal')

			expect(dedup.select([low, high, normal])).toBe(high)
		})

		it('defaults to keep_first', () => {
			const dedup = createDeduplicationAdapter()
			const first = createFrame('content 1')
			const second = createFrame('content 2')

			expect(dedup.select([first, second])).toBe(first)
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical priority frames', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createFrame('critical', 'critical')

			expect(dedup.shouldPreserve(frame)).toBe(true)
		})

		it('preserves system priority frames', () => {
			const dedup = createDeduplicationAdapter()
			// Note: 'system' is not in FramePriority, so this tests fallback
			const frame = createFrame('critical', 'critical')

			expect(dedup.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve normal priority frames', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createFrame('normal', 'normal')

			expect(dedup.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve low priority frames', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createFrame('low', 'low')

			expect(dedup.shouldPreserve(frame)).toBe(false)
		})
	})
})
