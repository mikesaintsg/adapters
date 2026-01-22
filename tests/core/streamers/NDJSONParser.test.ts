/**
 * NDJSONParser Tests
 *
 * Tests for the NDJSON parser implementation.
 */

import { describe, it, expect } from 'vitest'
import { createNDJSONParser } from '@mikesaintsg/adapters'

describe('NDJSONParser', () => {
	describe('createNDJSONParser', () => {
		it('creates an adapter with create method', () => {
			const adapter = createNDJSONParser()
			expect(typeof adapter.create).toBe('function')
		})

		it('creates a parser with onObject callback', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})
			expect(parser).toBeDefined()
			expect(typeof parser.feed).toBe('function')
			expect(typeof parser.end).toBe('function')
			expect(typeof parser.reset).toBe('function')
		})
	})

	describe('feed', () => {
		it('parses complete NDJSON line', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"message":"hello"}\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ message: 'hello' })
		})

		it('handles chunked data across multiple feed calls', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"mess')
			parser.feed('age":"hello"}\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ message: 'hello' })
		})

		it('parses multiple objects in one chunk', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"a":1}\n{"b":2}\n{"c":3}\n')

			expect(objects).toHaveLength(3)
			expect(objects[0]).toEqual({ a: 1 })
			expect(objects[1]).toEqual({ b: 2 })
			expect(objects[2]).toEqual({ c: 3 })
		})

		it('handles empty lines', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"a":1}\n\n{"b":2}\n')

			expect(objects).toHaveLength(2)
		})

		it('parses arrays', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('[1,2,3]\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual([1, 2, 3])
		})

		it('parses nested objects', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"outer":{"inner":"value"}}\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ outer: { inner: 'value' } })
		})
	})

	describe('end', () => {
		it('flushes remaining buffer on end', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			let ended = false
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
				onEnd: () => { ended = true },
			})

			parser.feed('{"final":true}')
			expect(objects).toHaveLength(0)

			parser.end()
			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ final: true })
			expect(ended).toBe(true)
		})

		it('calls onEnd callback', () => {
			const adapter = createNDJSONParser()
			let ended = false
			const parser = adapter.create({
				onObject: () => {},
				onEnd: () => { ended = true },
			})

			parser.end()
			expect(ended).toBe(true)
		})
	})

	describe('reset', () => {
		it('clears buffer', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"partial":')
			parser.reset()
			parser.feed('{"new":"object"}\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ new: 'object' })
		})
	})

	describe('error handling', () => {
		it('calls onError for invalid JSON', () => {
			const adapter = createNDJSONParser()
			let caughtError: Error | undefined
			const parser = adapter.create({
				onObject: () => {},
				onError: (error: Error) => { caughtError = error },
			})

			parser.feed('not valid json\n')

			expect(caughtError).toBeDefined()
			expect(caughtError?.message).toContain('Failed to parse NDJSON')
		})

		it('continues parsing after error', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
				onError: () => {},
			})

			parser.feed('invalid\n{"valid":true}\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ valid: true })
		})
	})

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles very long JSON objects', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			const longValue = 'x'.repeat(100000)
			parser.feed(`{"value":"${longValue}"}\n`)

			expect(objects).toHaveLength(1)
			expect((objects[0] as { value: string }).value.length).toBe(100000)
		})

		it('handles unicode in JSON', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"text":"Hello 🌍 日本語 مرحبا"}\n')

			expect(objects).toHaveLength(1)
			expect((objects[0] as { text: string }).text).toBe('Hello 🌍 日本語 مرحبا')
		})

		it('handles JSON with escaped characters', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"text":"Line1\\nLine2\\tTab\\r\\nCRLF"}\n')

			expect(objects).toHaveLength(1)
			expect((objects[0] as { text: string }).text).toBe('Line1\nLine2\tTab\r\nCRLF')
		})

		it('handles deeply nested JSON', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			const nested = { a: { b: { c: { d: { e: { f: 'deep' } } } } } }
			parser.feed(`${JSON.stringify(nested)}\n`)

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual(nested)
		})

		it('handles primitive JSON values', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('42\n')
			parser.feed('"string"\n')
			parser.feed('true\n')
			parser.feed('false\n')
			parser.feed('null\n')

			expect(objects).toEqual([42, 'string', true, false, null])
		})

		it('handles many small chunks', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			const message = '{"message":"hello world"}\n'
			for (const char of message) {
				parser.feed(char)
			}

			expect(objects).toHaveLength(1)
			expect((objects[0] as { message: string }).message).toBe('hello world')
		})

		it('handles chunk split in middle of JSON', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"ke')
			parser.feed('y":"val')
			parser.feed('ue"}\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ key: 'value' })
		})

		it('handles chunk split at newline boundary', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"a":1}')
			parser.feed('\n{"b":2}\n')

			expect(objects).toHaveLength(2)
		})

		it('handles rapid object parsing', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			let data = ''
			for (let i = 0; i < 1000; i++) {
				data += `{"index":${i}}\n`
			}
			parser.feed(data)

			expect(objects).toHaveLength(1000)
		})

		it('handles whitespace-only lines', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"a":1}\n   \n\t\n{"b":2}\n')

			expect(objects).toHaveLength(2)
		})

		it('handles trailing whitespace in line', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"a":1}   \n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ a: 1 })
		})

		it('handles multiple consecutive newlines', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"a":1}\n\n\n\n{"b":2}\n')

			expect(objects).toHaveLength(2)
		})

		it('handles Ollama-style streaming chunks', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			// Simulating Ollama NDJSON stream
			parser.feed('{"model":"llama2","created_at":"2024-01-01","message":{"content":"Hello"},"done":false}\n')
			parser.feed('{"model":"llama2","created_at":"2024-01-01","message":{"content":" World"},"done":false}\n')
			parser.feed('{"model":"llama2","created_at":"2024-01-01","message":{"content":""},"done":true}\n')

			expect(objects).toHaveLength(3)
			expect((objects[0] as { message: { content: string } }).message.content).toBe('Hello')
			expect((objects[2] as { done: boolean }).done).toBe(true)
		})

		it('continues after multiple errors', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			let errorCount = 0
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
				onError: () => { errorCount++ },
			})

			parser.feed('bad1\nbad2\nbad3\n{"good":true}\nbad4\n{"also":"good"}\n')

			expect(objects).toHaveLength(2)
			expect(errorCount).toBe(4)
		})

		it('reset clears partial buffer', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"partial":')
			parser.reset()
			parser.feed('{"fresh":"start"}\n')

			expect(objects).toHaveLength(1)
			expect(objects[0]).toEqual({ fresh: 'start' })
		})

		it('adapter can create multiple independent parsers', () => {
			const adapter = createNDJSONParser()
			const objects1: unknown[] = []
			const objects2: unknown[] = []

			const parser1 = adapter.create({
				onObject: (obj: unknown) => objects1.push(obj),
			})
			const parser2 = adapter.create({
				onObject: (obj: unknown) => objects2.push(obj),
			})

			parser1.feed('{"id":1}\n')
			parser2.feed('{"id":2}\n')

			expect(objects1).toHaveLength(1)
			expect(objects2).toHaveLength(1)
			expect((objects1[0] as { id: number }).id).toBe(1)
			expect((objects2[0] as { id: number }).id).toBe(2)
		})

		it('handles JSON with null bytes', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"text":"before\\u0000after"}\n')

			expect(objects).toHaveLength(1)
			expect((objects[0] as { text: string }).text).toBe('before\0after')
		})

		it('handles empty object and array', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{}\n')
			parser.feed('[]\n')

			expect(objects).toEqual([{}, []])
		})

		it('handles negative and floating point numbers', () => {
			const adapter = createNDJSONParser()
			const objects: unknown[] = []
			const parser = adapter.create({
				onObject: (obj: unknown) => objects.push(obj),
			})

			parser.feed('{"int":-42,"float":3.14159,"exp":1.5e10,"negExp":-2.5e-5}\n')

			expect(objects).toHaveLength(1)
			const obj = objects[0] as { int: number; float: number; exp: number; negExp: number }
			expect(obj.int).toBe(-42)
			expect(obj.float).toBeCloseTo(3.14159)
			expect(obj.exp).toBe(1.5e10)
			expect(obj.negExp).toBeCloseTo(-2.5e-5)
		})
	})
})
