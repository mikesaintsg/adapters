/**
 * @mikesaintsg/adapters
 *
 * Tests for Anthropic tool format adapter.
 */

import { describe, it, expect } from 'vitest'
import { createAnthropicToolFormatAdapter } from '@mikesaintsg/adapters'
import type { ToolSchema, ToolResult } from '@mikesaintsg/core'

/** Anthropic tool format for type assertions */
interface AnthropicTool {
	readonly name: string
	readonly description: string
	readonly input_schema: unknown
}

describe('Anthropic Tool Format Adapter', () => {
	describe('formatSchemas', () => {
		it('formats single schema correctly', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const schema: ToolSchema = {
				name: 'get_weather',
				description: 'Get the weather for a city',
				parameters: {
					type: 'object',
					properties: {
						city: { type: 'string' },
					},
					required: ['city'],
				},
			}

			const formatted = adapter.formatSchemas([schema]) as readonly AnthropicTool[]

			expect(formatted).toHaveLength(1)
			expect(formatted[0]).toEqual({
				name: 'get_weather',
				description: 'Get the weather for a city',
				input_schema: schema.parameters,
			})
		})

		it('formats multiple schemas correctly', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const schemas: ToolSchema[] = [
				{
					name: 'tool1',
					description: 'First tool',
					parameters: { type: 'object' },
				},
				{
					name: 'tool2',
					description: 'Second tool',
					parameters: { type: 'object' },
				},
			]

			const formatted = adapter.formatSchemas(schemas) as readonly AnthropicTool[]

			expect(formatted).toHaveLength(2)
			expect(formatted[0]!.name).toBe('tool1')
			expect(formatted[1]!.name).toBe('tool2')
		})

		it('handles empty schemas array', () => {
			const adapter = createAnthropicToolFormatAdapter()

			const formatted = adapter.formatSchemas([])

			expect(formatted).toEqual([])
		})

		it('uses input_schema instead of parameters', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const schema: ToolSchema = {
				name: 'test',
				description: 'Test tool',
				parameters: { type: 'object', properties: {} },
			}

			const formatted = adapter.formatSchemas([schema]) as readonly AnthropicTool[]

			expect(formatted[0]).toHaveProperty('input_schema')
			expect(formatted[0]).not.toHaveProperty('parameters')
		})
	})

	describe('parseToolCalls', () => {
		it('parses valid Anthropic response', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{
						type: 'tool_use',
						id: 'toolu_123',
						name: 'get_weather',
						input: { city: 'London' },
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(1)
			expect(calls[0]).toEqual({
				id: 'toolu_123',
				name: 'get_weather',
				arguments: { city: 'London' },
			})
		})

		it('parses multiple tool uses', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{
						type: 'text',
						text: 'I will use some tools...',
					},
					{
						type: 'tool_use',
						id: 'toolu_1',
						name: 'tool1',
						input: { a: 1 },
					},
					{
						type: 'tool_use',
						id: 'toolu_2',
						name: 'tool2',
						input: { b: 2 },
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(2)
			expect(calls[0]!.name).toBe('tool1')
			expect(calls[1]!.name).toBe('tool2')
		})

		it('returns empty array for null response', () => {
			const adapter = createAnthropicToolFormatAdapter()

			expect(adapter.parseToolCalls(null)).toEqual([])
		})

		it('returns empty array for undefined response', () => {
			const adapter = createAnthropicToolFormatAdapter()

			expect(adapter.parseToolCalls(undefined)).toEqual([])
		})

		it('returns empty array for primitive response', () => {
			const adapter = createAnthropicToolFormatAdapter()

			expect(adapter.parseToolCalls('string')).toEqual([])
			expect(adapter.parseToolCalls(123)).toEqual([])
			expect(adapter.parseToolCalls(true)).toEqual([])
		})

		it('returns empty array for missing content', () => {
			const adapter = createAnthropicToolFormatAdapter()

			expect(adapter.parseToolCalls({})).toEqual([])
		})

		it('returns empty array for empty content', () => {
			const adapter = createAnthropicToolFormatAdapter()

			expect(adapter.parseToolCalls({ content: [] })).toEqual([])
		})

		it('ignores non-tool_use blocks', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{ type: 'text', text: 'Hello' },
					{ type: 'image', source: {} },
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toEqual([])
		})

		it('skips malformed tool_use blocks', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					null,
					{ type: 'tool_use' }, // Missing id, name, input
					{ type: 'tool_use', id: 123 }, // Invalid id type
					{ type: 'tool_use', id: 'valid', name: 'tool', input: {} },
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(1)
			expect(calls[0]!.name).toBe('tool')
		})

		it('handles non-object input', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{
						type: 'tool_use',
						id: 'toolu_array',
						name: 'array_input',
						input: [1, 2, 3], // Array instead of object
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toEqual([])
		})

		it('handles null input', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{
						type: 'tool_use',
						id: 'toolu_null',
						name: 'null_input',
						input: null,
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toEqual([])
		})
	})

	describe('formatResult', () => {
		it('formats successful result', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const result: ToolResult = {
				callId: 'toolu_123',
				name: 'get_weather',
				success: true,
				value: { temperature: 20, unit: 'celsius' },
			}

			const formatted = adapter.formatResult(result)

			expect(formatted).toEqual({
				type: 'tool_result',
				tool_use_id: 'toolu_123',
				content: JSON.stringify({ temperature: 20, unit: 'celsius' }),
				is_error: false,
			})
		})

		it('formats error result', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const result: ToolResult = {
				callId: 'toolu_456',
				name: 'get_weather',
				success: false,
				error: 'City not found',
			}

			const formatted = adapter.formatResult(result)

			expect(formatted).toEqual({
				type: 'tool_result',
				tool_use_id: 'toolu_456',
				content: JSON.stringify({ error: 'City not found' }),
				is_error: true,
			})
		})

		it('uses tool_use_id instead of tool_call_id', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const result: ToolResult = {
				callId: 'toolu_test',
				name: 'test_tool',
				success: true,
				value: 'result',
			}

			const formatted = adapter.formatResult(result)

			expect(formatted).toHaveProperty('tool_use_id')
			expect(formatted).not.toHaveProperty('tool_call_id')
		})

		it('includes is_error field', () => {
			const adapter = createAnthropicToolFormatAdapter()

			const success: ToolResult = {
				callId: 'id1',
				name: 'success_tool',
				success: true,
				value: 'ok',
			}
			const failure: ToolResult = {
				callId: 'id2',
				name: 'failure_tool',
				success: false,
				error: 'fail',
			}

			expect(adapter.formatResult(success)).toHaveProperty('is_error', false)
			expect(adapter.formatResult(failure)).toHaveProperty('is_error', true)
		})
	})

	describe('Edge Cases', () => {
		it('handles schema with empty description', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const schema: ToolSchema = {
				name: 'empty_desc',
				description: '',
				parameters: {},
			}

			const formatted = adapter.formatSchemas([schema]) as readonly AnthropicTool[]

			expect(formatted[0]!.description).toBe('')
		})

		it('handles options parameter', () => {
			const adapter = createAnthropicToolFormatAdapter({
				toolChoice: 'auto',
			})

			expect(adapter).toBeDefined()
		})

		it('handles complex nested input', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{
						type: 'tool_use',
						id: 'toolu_nested',
						name: 'nested_tool',
						input: {
							level1: {
								level2: {
									level3: 'deep',
								},
							},
							array: [1, { nested: true }],
						},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls[0]!.arguments).toEqual({
				level1: { level2: { level3: 'deep' } },
				array: [1, { nested: true }],
			})
		})

		it('handles tool_use with numeric id (invalid)', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{
						type: 'tool_use',
						id: 12345,
						name: 'tool',
						input: {},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toEqual([])
		})

		it('handles tool_use with numeric name (invalid)', () => {
			const adapter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{
						type: 'tool_use',
						id: 'valid',
						name: 123,
						input: {},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toEqual([])
		})
	})
})
