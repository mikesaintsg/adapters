/**
 * SSEParser Tests
 *
 * Tests for the SSE parser implementation.
 */

import { describe, it, expect } from 'vitest'
import { createSSEParser } from '@mikesaintsg/adapters'
import type { SSEEvent } from '@mikesaintsg/core'

describe('SSEParser', () => {
	describe('createSSEParser', () => {
		it('creates an adapter with create method', () => {
			const adapter = createSSEParser()
			expect(typeof adapter.create).toBe('function')
		})

		it('creates a parser with onEvent callback', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})
			expect(parser).toBeDefined()
			expect(typeof parser.feed).toBe('function')
			expect(typeof parser.end).toBe('function')
			expect(typeof parser.reset).toBe('function')
		})

		it('accepts custom delimiters', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				lineDelimiter: '\r\n',
				eventDelimiter: '\r\n\r\n',
				onEvent: (e: SSEEvent) => events.push(e),
			})
			expect(parser).toBeDefined()
		})
	})

	describe('feed', () => {
		it('parses complete SSE event', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: {"token": "hello"}\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('{"token": "hello"}')
		})

		it('handles chunked data across multiple feed calls', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: {"tok')
			parser.feed('en": "hello"}\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('{"token": "hello"}')
		})

		it('parses multiple events in one chunk', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: first\n\ndata: second\n\ndata: third\n\n')

			expect(events).toHaveLength(3)
			expect(events[0]?.data).toBe('first')
			expect(events[1]?.data).toBe('second')
			expect(events[2]?.data).toBe('third')
		})

		it('handles multi-line data fields', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: line1\ndata: line2\ndata: line3\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('line1\nline2\nline3')
		})

		it('parses event field', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('event: message\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('message')
			expect(events[0]?.data).toBe('hello')
		})

		it('parses id field', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('id: 123\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.id).toBe('123')
			expect(events[0]?.data).toBe('hello')
		})

		it('parses retry field', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('retry: 5000\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.retry).toBe(5000)
			expect(events[0]?.data).toBe('hello')
		})

		it('handles all fields together', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('event: update\nid: abc-123\nretry: 3000\ndata: payload\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('update')
			expect(events[0]?.id).toBe('abc-123')
			expect(events[0]?.retry).toBe(3000)
			expect(events[0]?.data).toBe('payload')
		})

		it('ignores invalid retry values', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('retry: invalid\ndata: hello\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.retry).toBeUndefined()
		})

		it('handles empty data field', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data:\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('')
		})
	})

	describe('end', () => {
		it('flushes remaining buffer on end', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			let ended = false
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
				onEnd: () => { ended = true },
			})

			parser.feed('data: final')
			expect(events).toHaveLength(0)

			parser.end()
			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('final')
			expect(ended).toBe(true)
		})

		it('calls onEnd callback', () => {
			const adapter = createSSEParser()
			let ended = false
			const parser = adapter.create({
				onEvent: () => {},
				onEnd: () => { ended = true },
			})

			parser.end()
			expect(ended).toBe(true)
		})
	})

	describe('reset', () => {
		it('clears buffer and current event', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: partial')
			parser.reset()
			parser.feed('data: new\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('new')
		})
	})

	describe('error handling', () => {
		it('calls onError when event handler throws', () => {
			const adapter = createSSEParser()
			let caughtError: Error | undefined
			const parser = adapter.create({
				onEvent: () => {
					throw new Error('Handler error')
				},
				onError: (error: Error) => { caughtError = error },
			})

			parser.feed('data: test\n\n')

			expect(caughtError).toBeDefined()
			expect(caughtError?.message).toBe('Handler error')
		})
	})

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles very long data fields', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			const longData = 'x'.repeat(100000)
			parser.feed(`data: ${longData}\n\n`)

			expect(events).toHaveLength(1)
			expect(events[0]?.data.length).toBe(100000)
		})

		it('handles unicode in data', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: Hello 🌍 日本語 مرحبا\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('Hello 🌍 日本語 مرحبا')
		})

		it('handles JSON with special characters in data', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			const json = JSON.stringify({ text: 'Line1\nLine2\tTab' })
			parser.feed(`data: ${json}\n\n`)

			expect(events).toHaveLength(1)
			const parsed = JSON.parse(events[0]?.data ?? '{}') as { text: string }
			expect(parsed.text).toBe('Line1\nLine2\tTab')
		})

		it('handles events with only event type (no data)', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('event: ping\n\n')

			// No data means no event emitted per SSE spec
			expect(events).toHaveLength(0)
		})

		it('handles event with data that contains colons', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: key: value: more: colons\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('key: value: more: colons')
		})

		it('handles event with data that starts with space', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			// Per SSE spec, a single space after colon is optional and trimmed
			// To preserve leading space, use two spaces after colon
			parser.feed('data:  leading space\n\n')

			expect(events).toHaveLength(1)
			// First space after colon is trimmed, second space is preserved
			expect(events[0]?.data).toBe('leading space')
		})

		it('ignores comment lines', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed(': this is a comment\ndata: actual data\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('actual data')
		})

		it('ignores unknown field names', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('unknown: value\ndata: actual data\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('actual data')
		})

		it('handles many small chunks', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			const message = 'data: hello world\n\n'
			for (const char of message) {
				parser.feed(char)
			}

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('hello world')
		})

		it('handles chunk split in middle of field name', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('da')
			parser.feed('ta: he')
			parser.feed('llo\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('hello')
		})

		it('handles chunk split at delimiter boundary', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: first\n')
			parser.feed('\ndata: second\n\n')

			expect(events).toHaveLength(2)
		})

		it('handles Windows-style line endings with custom delimiter', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				lineDelimiter: '\r\n',
				eventDelimiter: '\r\n\r\n',
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: test\r\n\r\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('test')
		})

		it('handles rapid event emission', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			let data = ''
			for (let i = 0; i < 1000; i++) {
				data += `data: event${i}\n\n`
			}
			parser.feed(data)

			expect(events).toHaveLength(1000)
		})

		it('continues parsing after error in handler', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			let errorCount = 0
			let eventIndex = 0
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => {
					eventIndex++
					if (eventIndex === 2) {
						throw new Error('Handler error')
					}
					events.push(e)
				},
				onError: () => { errorCount++ },
			})

			parser.feed('data: first\n\ndata: second\n\ndata: third\n\n')

			expect(events.length).toBe(2)
			expect(errorCount).toBe(1)
		})

		it('handles [DONE] message correctly', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('data: {"token":"hi"}\n\ndata: [DONE]\n\n')

			expect(events).toHaveLength(2)
			expect(events[1]?.data).toBe('[DONE]')
		})

		it('handles empty data with other fields', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('event: message\nid: 123\ndata:\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('message')
			expect(events[0]?.id).toBe('123')
			expect(events[0]?.data).toBe('')
		})

		it('reset clears partial event state', () => {
			const adapter = createSSEParser()
			const events: SSEEvent[] = []
			const parser = adapter.create({
				onEvent: (e: SSEEvent) => events.push(e),
			})

			parser.feed('event: message\nid: 123\ndata: part')
			parser.reset()
			parser.feed('data: fresh\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBeUndefined()
			expect(events[0]?.id).toBeUndefined()
			expect(events[0]?.data).toBe('fresh')
		})

		it('adapter can create multiple independent parsers', () => {
			const adapter = createSSEParser()
			const events1: SSEEvent[] = []
			const events2: SSEEvent[] = []

			const parser1 = adapter.create({
				onEvent: (e: SSEEvent) => events1.push(e),
			})
			const parser2 = adapter.create({
				onEvent: (e: SSEEvent) => events2.push(e),
			})

			parser1.feed('data: one\n\n')
			parser2.feed('data: two\n\n')

			expect(events1).toHaveLength(1)
			expect(events2).toHaveLength(1)
			expect(events1[0]?.data).toBe('one')
			expect(events2[0]?.data).toBe('two')
		})
	})
})
