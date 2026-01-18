/**
 * @mikesaintsg/adapters
 *
 * Tests for context builder adapters.
 */

import { describe, it, expect } from 'vitest'
import {
	createDeduplicationAdapter,
	createPriorityTruncationAdapter,
	createFIFOTruncationAdapter,
	createLIFOTruncationAdapter,
	createScoreTruncationAdapter,
	createPriorityAdapter,
} from '@mikesaintsg/adapters'
import type { ContextFrame, FramePriority, FrameType, ContentHash } from '@mikesaintsg/core'

/** Helper to create test frames */
function createFrame(overrides: Partial<ContextFrame> & { id: string }): ContextFrame {
	return {
		type: 'document' as FrameType,
		content: 'test content',
		contentHash: 'hash123' as ContentHash,
		priority: 'normal' as FramePriority,
		tokenEstimate: 10,
		createdAt: Date.now(),
		...overrides,
	}
}

describe('Context Builder Adapters', () => {
	describe('createDeduplicationAdapter', () => {
		it('creates adapter with default options', () => {
			const dedup = createDeduplicationAdapter()
			const frames = [createFrame({ id: '1' })]

			expect(dedup.select(frames)).toBe(frames[0])
		})

		it('select returns first frame with keep_first strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_first' })
			const frames = [
				createFrame({ id: '1', content: 'first' }),
				createFrame({ id: '2', content: 'second' }),
				createFrame({ id: '3', content: 'third' }),
			]

			expect(dedup.select(frames).id).toBe('1')
		})

		it('select returns last frame with keep_latest strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_latest' })
			const frames = [
				createFrame({ id: '1', content: 'first' }),
				createFrame({ id: '2', content: 'second' }),
				createFrame({ id: '3', content: 'third' }),
			]

			expect(dedup.select(frames).id).toBe('3')
		})

		it('select returns highest priority with keep_highest_priority strategy', () => {
			const dedup = createDeduplicationAdapter({ strategy: 'keep_highest_priority' })
			const frames = [
				createFrame({ id: '1', priority: 'low' }),
				createFrame({ id: '2', priority: 'critical' }),
				createFrame({ id: '3', priority: 'normal' }),
			]

			expect(dedup.select(frames).id).toBe('2')
		})

		it('select prefers system frames', () => {
			const dedup = createDeduplicationAdapter()
			const frames = [
				createFrame({ id: '1', priority: 'critical' }),
				createFrame({ id: '2', type: 'system' as FrameType }),
				createFrame({ id: '3', priority: 'high' }),
			]

			expect(dedup.select(frames).id).toBe('2')
		})

		it('shouldPreserve returns true for system frames', () => {
			const dedup = createDeduplicationAdapter()
			const systemFrame = createFrame({ id: '1', type: 'system' as FrameType })
			const docFrame = createFrame({ id: '2', type: 'document' as FrameType })

			expect(dedup.shouldPreserve(systemFrame)).toBe(true)
			expect(dedup.shouldPreserve(docFrame)).toBe(false)
		})

		it('throws for empty frames array', () => {
			const dedup = createDeduplicationAdapter()

			expect(() => dedup.select([])).toThrow('Cannot select from empty frames array')
		})
	})

	describe('createPriorityTruncationAdapter', () => {
		it('creates adapter with default options', () => {
			const truncation = createPriorityTruncationAdapter()
			const systemFrame = createFrame({ id: '1', type: 'system' as FrameType })

			expect(truncation.shouldPreserve(systemFrame)).toBe(true)
		})

		it('sort orders by priority (highest first)', () => {
			const truncation = createPriorityTruncationAdapter()
			const frames = [
				createFrame({ id: '1', priority: 'low' }),
				createFrame({ id: '2', priority: 'critical' }),
				createFrame({ id: '3', priority: 'normal' }),
				createFrame({ id: '4', priority: 'high' }),
			]

			const sorted = truncation.sort(frames)

			expect(sorted[0]!.id).toBe('2') // critical
			expect(sorted[1]!.id).toBe('4') // high
			expect(sorted[2]!.id).toBe('3') // normal
			expect(sorted[3]!.id).toBe('1') // low
		})

		it('shouldPreserve returns true for system frames', () => {
			const truncation = createPriorityTruncationAdapter()
			const systemFrame = createFrame({ id: '1', type: 'system' as FrameType })
			const docFrame = createFrame({ id: '2', type: 'document' as FrameType })

			expect(truncation.shouldPreserve(systemFrame)).toBe(true)
			expect(truncation.shouldPreserve(docFrame)).toBe(false)
		})

		it('shouldPreserve respects preserveSystem option', () => {
			const truncation = createPriorityTruncationAdapter({ preserveSystem: false })
			const systemFrame = createFrame({ id: '1', type: 'system' as FrameType })

			expect(truncation.shouldPreserve(systemFrame)).toBe(false)
		})
	})

	describe('createFIFOTruncationAdapter', () => {
		it('sort orders oldest last (for removal)', () => {
			const truncation = createFIFOTruncationAdapter()
			const now = Date.now()
			const frames = [
				createFrame({ id: '1', createdAt: now - 1000 }),
				createFrame({ id: '2', createdAt: now - 3000 }), // Oldest
				createFrame({ id: '3', createdAt: now - 500 }), // Newest
			]

			const sorted = truncation.sort(frames)

			// Newest first (preserved), oldest last (removed)
			expect(sorted[0]!.id).toBe('3')
			expect(sorted[sorted.length - 1]!.id).toBe('2')
		})
	})

	describe('createLIFOTruncationAdapter', () => {
		it('sort orders newest last (for removal)', () => {
			const truncation = createLIFOTruncationAdapter()
			const now = Date.now()
			const frames = [
				createFrame({ id: '1', createdAt: now - 1000 }),
				createFrame({ id: '2', createdAt: now - 3000 }), // Oldest
				createFrame({ id: '3', createdAt: now - 500 }), // Newest
			]

			const sorted = truncation.sort(frames)

			// Oldest first (preserved), newest last (removed)
			expect(sorted[0]!.id).toBe('2')
			expect(sorted[sorted.length - 1]!.id).toBe('3')
		})
	})

	describe('createScoreTruncationAdapter', () => {
		it('sort orders by score (highest first)', () => {
			const truncation = createScoreTruncationAdapter()
			const frames = [
				createFrame({ id: '1', metadata: { score: 0.5 } }),
				createFrame({ id: '2', metadata: { score: 0.9 } }),
				createFrame({ id: '3', metadata: { score: 0.2 } }),
			]

			const sorted = truncation.sort(frames)

			expect(sorted[0]!.id).toBe('2') // Highest score
			expect(sorted[sorted.length - 1]!.id).toBe('3') // Lowest score
		})

		it('handles missing scores as 0', () => {
			const truncation = createScoreTruncationAdapter()
			const frames = [
				createFrame({ id: '1', metadata: { score: 0.5 } }),
				createFrame({ id: '2' }), // No score, defaults to 0
			]

			const sorted = truncation.sort(frames)

			expect(sorted[0]!.id).toBe('1')
			expect(sorted[1]!.id).toBe('2')
		})
	})

	describe('createPriorityAdapter', () => {
		it('creates adapter with default weights', () => {
			const priority = createPriorityAdapter()

			expect(priority.getWeight('critical')).toBe(1000)
			expect(priority.getWeight('high')).toBe(100)
			expect(priority.getWeight('normal')).toBe(10)
			expect(priority.getWeight('low')).toBe(1)
			expect(priority.getWeight('optional')).toBe(0)
		})

		it('creates adapter with custom weights', () => {
			const priority = createPriorityAdapter({
				weights: { critical: 5000 } as Record<string, number>,
			})

			expect(priority.getWeight('critical')).toBe(5000)
			expect(priority.getWeight('high')).toBe(100) // Default
		})

		it('compare orders by priority weight', () => {
			const priority = createPriorityAdapter()
			const critical = createFrame({ id: '1', priority: 'critical' })
			const low = createFrame({ id: '2', priority: 'low' })
			const normal = createFrame({ id: '3', priority: 'normal' })

			// Higher priority comes first (negative comparison result)
			expect(priority.compare(critical, low)).toBeLessThan(0)
			expect(priority.compare(low, critical)).toBeGreaterThan(0)
			expect(priority.compare(critical, critical)).toBe(0)
			expect(priority.compare(normal, low)).toBeLessThan(0)
		})
	})

	describe('Edge Cases', () => {
		it('handles single frame', () => {
			const dedup = createDeduplicationAdapter()
			const truncation = createPriorityTruncationAdapter()
			const frame = createFrame({ id: '1' })

			expect(dedup.select([frame])).toBe(frame)
			expect(truncation.sort([frame])).toHaveLength(1)
		})

		it('handles frames with same priority', () => {
			const truncation = createPriorityTruncationAdapter()
			const frames = [
				createFrame({ id: '1', priority: 'normal' }),
				createFrame({ id: '2', priority: 'normal' }),
				createFrame({ id: '3', priority: 'normal' }),
			]

			const sorted = truncation.sort(frames)
			expect(sorted).toHaveLength(3)
		})

		it('handles frames with same score', () => {
			const truncation = createScoreTruncationAdapter()
			const frames = [
				createFrame({ id: '1', metadata: { score: 0.5 } }),
				createFrame({ id: '2', metadata: { score: 0.5 } }),
			]

			const sorted = truncation.sort(frames)
			expect(sorted).toHaveLength(2)
		})

		it('sort does not mutate original array', () => {
			const truncation = createPriorityTruncationAdapter()
			const frames = [
				createFrame({ id: '1', priority: 'low' }),
				createFrame({ id: '2', priority: 'high' }),
			]
			const originalOrder = [...frames]

			truncation.sort(frames)

			expect(frames[0]!.id).toBe(originalOrder[0]!.id)
			expect(frames[1]!.id).toBe(originalOrder[1]!.id)
		})
	})
})
