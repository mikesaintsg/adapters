/**
 * SSEStreamer Tests
 *
 * Tests for the SSE streamer implementation.
 */

import { describe, it, expect } from 'vitest'
import { createSSEStreamer } from '@mikesaintsg/adapters'
import type { SSEEvent } from '@mikesaintsg/core'

describe('SSEStreamer', () => {
	describe('createSSEStreamer', () => {
		it('creates a streamer with onEvent callback', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})
			expect(streamer).toBeDefined()
			expect(typeof streamer.feed).toBe('function')
			expect(typeof streamer.end).toBe('function')
			expect(typeof streamer.reset).toBe('function')
		})

		it('accepts custom delimiters', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				lineDelimiter: '\r\n',
				eventDelimiter: '\r\n\r\n',
				onEvent: (e: SSEEvent) => events.push(e),
			})
			expect(streamer).toBeDefined()
		})
	})

	describe('feed', () => {
		it('parses complete SSE event', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('data: {"token": "hello"}\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('{"token": "hello"}')
		})

		it('handles chunked data across multiple feed calls', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('data: {"tok')
			streamer.feed('en": "hello"}\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('{"token": "hello"}')
		})

		it('parses multiple events in one chunk', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('data: first\n\ndata: second\n\ndata: third\n\n')

			expect(events).toHaveLength(3)
			expect(events[0]?.data).toBe('first')
			expect(events[1]?.data).toBe('second')
			expect(events[2]?.data).toBe('third')
		})

		it('handles multi-line data fields', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('data: line1\ndata: line2\ndata: line3\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('line1\nline2\nline3')
		})

		it('parses event field', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('event: message\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('message')
			expect(events[0]?.data).toBe('hello')
		})

		it('parses id field', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('id: 123\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.id).toBe('123')
			expect(events[0]?.data).toBe('hello')
		})

		it('parses retry field', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('retry: 5000\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.retry).toBe(5000)
			expect(events[0]?.data).toBe('hello')
		})

		it('handles all fields together', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('event: update\nid: abc-123\nretry: 3000\ndata: payload\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('update')
			expect(events[0]?.id).toBe('abc-123')
			expect(events[0]?.retry).toBe(3000)
			expect(events[0]?.data).toBe('payload')
		})

		it('ignores invalid retry values', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('retry: invalid\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.retry).toBeUndefined()
		})

		it('handles empty data field', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('data:\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('')
		})
	})

	describe('end', () => {
		it('flushes remaining buffer on end', () => {
			const events: SSEEvent[] = []
			let ended = false
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
				onEnd: () => { ended = true },
			})

			streamer.feed('data: final')
			expect(events).toHaveLength(0)

			streamer.end()
			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('final')
			expect(ended).toBe(true)
		})

		it('calls onEnd callback', () => {
			let ended = false
			const streamer = createSSEStreamer({
				onEvent: () => {},
				onEnd: () => { ended = true },
			})

			streamer.end()
			expect(ended).toBe(true)
		})
	})

	describe('reset', () => {
		it('clears buffer and current event', () => {
			const events: SSEEvent[] = []
			const streamer = createSSEStreamer({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			streamer.feed('data: partial')
			streamer.reset()
			streamer.feed('data: new\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('new')
		})
	})

	describe('error handling', () => {
		it('calls onError when event handler throws', () => {
			let caughtError: Error | undefined
			const streamer = createSSEStreamer({
				onEvent: () => {
					throw new Error('Handler error')
				},
				onError: (error: Error) => { caughtError = error },
			})

			streamer.feed('data: test\n\n')

			expect(caughtError).toBeDefined()
			expect(caughtError?.message).toBe('Handler error')
		})
	})
})
