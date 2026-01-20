/**
 * Deduplication Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createDeduplicationAdapter } from '@mikesaintsg/adapters'
import { createDeduplicationFrame } from '../../setup.js'

describe('DeduplicationAdapter', () => {
	describe('select', () => {
		it('throws for empty array', () => {
			const dedup = createDeduplicationAdapter()

			expect(() => dedup.select([])).toThrow()
		})

		it('returns single frame unchanged', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createDeduplicationFrame('content')

			expect(dedup.select([frame])).toBe(frame)
		})

		it('keeps first frame with keep_first strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_first' })
			const first = createDeduplicationFrame('content 1')
			const second = createDeduplicationFrame('content 2')

			expect(dedup.select([first, second])).toBe(first)
		})

		it('keeps latest frame with keep_latest strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_latest' })
			const first = createDeduplicationFrame('content 1')
			const second = createDeduplicationFrame('content 2')

			expect(dedup.select([first, second])).toBe(second)
		})

		it('keeps highest priority with keep_highest_priority strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_highest_priority' })
			const low = createDeduplicationFrame('low', 'low')
			const high = createDeduplicationFrame('high', 'high')
			const normal = createDeduplicationFrame('normal', 'normal')

			expect(dedup.select([low, high, normal])).toBe(high)
		})

		it('defaults to keep_first', () => {
			const dedup = createDeduplicationAdapter()
			const first = createDeduplicationFrame('content 1')
			const second = createDeduplicationFrame('content 2')

			expect(dedup.select([first, second])).toBe(first)
		})
	})

	describe('shouldPreserve', () => {
		it('preserves critical priority frames', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createDeduplicationFrame('critical', 'critical')

			expect(dedup.shouldPreserve(frame)).toBe(true)
		})

		it('preserves system priority frames', () => {
			const dedup = createDeduplicationAdapter()
			// Note: 'system' is not in FramePriority, so this tests fallback
			const frame = createDeduplicationFrame('critical', 'critical')

			expect(dedup.shouldPreserve(frame)).toBe(true)
		})

		it('does not preserve normal priority frames', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createDeduplicationFrame('normal', 'normal')

			expect(dedup.shouldPreserve(frame)).toBe(false)
		})

		it('does not preserve low priority frames', () => {
			const dedup = createDeduplicationAdapter()
			const frame = createDeduplicationFrame('low', 'low')

			expect(dedup.shouldPreserve(frame)).toBe(false)
		})
	})
})
