/**
 * HuggingFace Tool Call Parsing Unit Tests
 *
 * Tests the Hermes-style tool call parsing logic without requiring model inference.
 * These tests verify the parsing of <tool_call> tags from model output.
 */

import { describe, it, expect } from 'vitest'

/**
 * Parse tool calls from Hermes-style output.
 * This is the same logic used in HuggingFaceProvider.
 * Format: <tool_call>\n{"name": "func", "arguments": {...}}\n</tool_call>
 */
function parseToolCalls(text: string): readonly { id: string; name: string; arguments: Record<string, unknown> }[] {
	const toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[] = []
	const toolCallRegex = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g

	let match: RegExpExecArray | null
	while ((match = toolCallRegex.exec(text)) !== null) {
		try {
			const jsonStr = match[1]
			if (jsonStr === undefined) continue

			const parsed = JSON.parse(jsonStr) as { name?: string; arguments?: Record<string, unknown> }
			if (typeof parsed.name === 'string') {
				const args = parsed.arguments
				toolCalls.push({
					id: crypto.randomUUID(),
					name: parsed.name,
					arguments: (typeof args === 'object' && args !== null) ? args : {},
				})
			}
		} catch {
			// Skip malformed tool calls
		}
	}

	return toolCalls
}

describe('Tool Call Parsing', () => {
	// =========================================================================
	// Basic Parsing
	// =========================================================================

	describe('basic parsing', () => {
		it('parses single tool call', () => {
			const text = `<tool_call>
{"name": "get_weather", "arguments": {"location": "Tokyo"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.name).toBe('get_weather')
			expect(calls[0]?.arguments).toEqual({ location: 'Tokyo' })
		})

		it('parses multiple tool calls', () => {
			const text = `<tool_call>
{"name": "get_weather", "arguments": {"location": "Tokyo"}}
</tool_call>
<tool_call>
{"name": "get_time", "arguments": {"timezone": "JST"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(2)
			expect(calls[0]?.name).toBe('get_weather')
			expect(calls[1]?.name).toBe('get_time')
		})

		it('parses tool call with no arguments', () => {
			const text = `<tool_call>
{"name": "get_current_time", "arguments": {}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.name).toBe('get_current_time')
			expect(calls[0]?.arguments).toEqual({})
		})

		it('parses tool call without arguments field', () => {
			const text = `<tool_call>
{"name": "get_current_time"}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.name).toBe('get_current_time')
			expect(calls[0]?.arguments).toEqual({})
		})
	})

	// =========================================================================
	// Complex Arguments
	// =========================================================================

	describe('complex arguments', () => {
		it('parses nested object arguments', () => {
			const text = `<tool_call>
{"name": "create_event", "arguments": {"event": {"title": "Meeting", "time": {"hour": 14, "minute": 30}}}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.arguments).toEqual({
				event: {
					title: 'Meeting',
					time: { hour: 14, minute: 30 },
				},
			})
		})

		it('parses array arguments', () => {
			const text = `<tool_call>
{"name": "send_emails", "arguments": {"recipients": ["alice@example.com", "bob@example.com"]}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.arguments).toEqual({
				recipients: ['alice@example.com', 'bob@example.com'],
			})
		})

		it('parses various value types', () => {
			const text = `<tool_call>
{"name": "test_func", "arguments": {"str": "hello", "num": 42, "float": 3.14, "bool": true, "null_val": null}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.arguments).toEqual({
				str: 'hello',
				num: 42,
				float: 3.14,
				bool: true,
				null_val: null,
			})
		})
	})

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('returns empty array for text without tool calls', () => {
			const text = 'The weather in Tokyo is sunny today.'

			const calls = parseToolCalls(text)

			expect(calls).toEqual([])
		})

		it('returns empty array for empty string', () => {
			const calls = parseToolCalls('')

			expect(calls).toEqual([])
		})

		it('ignores malformed JSON in tool call', () => {
			const text = `<tool_call>
{"name": "get_weather", invalid json here}
</tool_call>
<tool_call>
{"name": "valid_func", "arguments": {}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.name).toBe('valid_func')
		})

		it('ignores tool call without name', () => {
			const text = `<tool_call>
{"arguments": {"location": "Tokyo"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toEqual([])
		})

		it('parses tool call with extra whitespace', () => {
			const text = `<tool_call>

  {"name": "get_weather", "arguments": {"location": "Tokyo"}}

</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.name).toBe('get_weather')
		})

		it('handles tool call mixed with regular text', () => {
			const text = `I'll check the weather for you.
<tool_call>
{"name": "get_weather", "arguments": {"location": "Tokyo"}}
</tool_call>
Let me know if you need anything else.`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.name).toBe('get_weather')
		})
	})

	// =========================================================================
	// Unicode and Special Characters
	// =========================================================================

	describe('unicode and special characters', () => {
		it('parses tool call with unicode arguments', () => {
			const text = `<tool_call>
{"name": "translate", "arguments": {"text": "こんにちは", "target": "en"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.arguments).toEqual({
				text: 'こんにちは',
				target: 'en',
			})
		})

		it('parses tool call with emoji', () => {
			const text = `<tool_call>
{"name": "send_message", "arguments": {"message": "Hello! 👋🎉"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.arguments).toEqual({
				message: 'Hello! 👋🎉',
			})
		})

		it('parses tool call with escaped characters', () => {
			const text = `<tool_call>
{"name": "format", "arguments": {"text": "Line1\\nLine2\\tTabbed"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.arguments).toEqual({
				text: 'Line1\nLine2\tTabbed',
			})
		})

		it('parses tool call with quotes in arguments', () => {
			const text = `<tool_call>
{"name": "search", "arguments": {"query": "He said \\"hello\\""}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.arguments).toEqual({
				query: 'He said "hello"',
			})
		})
	})

	// =========================================================================
	// ID Generation
	// =========================================================================

	describe('id generation', () => {
		it('generates unique IDs for each tool call', () => {
			const text = `<tool_call>
{"name": "func1", "arguments": {}}
</tool_call>
<tool_call>
{"name": "func2", "arguments": {}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(2)
			expect(calls[0]?.id).toBeDefined()
			expect(calls[1]?.id).toBeDefined()
			expect(calls[0]?.id).not.toBe(calls[1]?.id)
		})

		it('generates valid UUID format', () => {
			const text = `<tool_call>
{"name": "test", "arguments": {}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			expect(calls[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
		})
	})

	// =========================================================================
	// Real-world Examples (from function_call.md)
	// =========================================================================

	describe('real-world examples', () => {
		it('parses weather tool call example', () => {
			const text = `<tool_call>
{"name": "get_current_temperature", "arguments": {"location": "San Francisco, CA, USA"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(1)
			expect(calls[0]?.name).toBe('get_current_temperature')
			expect(calls[0]?.arguments).toEqual({
				location: 'San Francisco, CA, USA',
			})
		})

		it('parses parallel tool calls example', () => {
			const text = `<tool_call>
{"name": "get_current_temperature", "arguments": {"location": "San Francisco, CA, USA"}}
</tool_call>
<tool_call>
{"name": "get_temperature_date", "arguments": {"location": "San Francisco, CA, USA", "date": "2024-10-01"}}
</tool_call>`

			const calls = parseToolCalls(text)

			expect(calls).toHaveLength(2)
			expect(calls[0]?.name).toBe('get_current_temperature')
			expect(calls[1]?.name).toBe('get_temperature_date')
			expect(calls[1]?.arguments).toEqual({
				location: 'San Francisco, CA, USA',
				date: '2024-10-01',
			})
		})
	})
})
