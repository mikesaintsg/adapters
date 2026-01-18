/**
 * @mikesaintsg/adapters
 *
 * Tests for OpenAI tool format adapter.
 */

import { describe, it, expect } from 'vitest'
import { createOpenAIToolFormatAdapter } from '@mikesaintsg/adapters'
import type { ToolSchema, ToolResult } from '@mikesaintsg/core'

/** OpenAI tool format for type assertions */
interface OpenAITool {
	readonly type: 'function'
	readonly function: {
		readonly name: string
		readonly description: string
		readonly parameters: unknown
	}
}

describe('OpenAI Tool Format Adapter', () => {
	describe('formatSchemas', () => {
		it('formats single schema correctly', () => {
			const adapter = createOpenAIToolFormatAdapter()
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

			const formatted = adapter.formatSchemas([schema]) as readonly OpenAITool[]

			expect(formatted).toHaveLength(1)
			expect(formatted[0]).toEqual({
				type: 'function',
				function: {
					name: 'get_weather',
					description: 'Get the weather for a city',
					parameters: schema.parameters,
				},
			})
		})

		it('formats multiple schemas correctly', () => {
			const adapter = createOpenAIToolFormatAdapter()
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

			const formatted = adapter.formatSchemas(schemas) as readonly OpenAITool[]

			expect(formatted).toHaveLength(2)
			expect(formatted[0]!.function.name).toBe('tool1')
			expect(formatted[1]!.function.name).toBe('tool2')
		})

		it('handles empty schemas array', () => {
			const adapter = createOpenAIToolFormatAdapter()

			const formatted = adapter.formatSchemas([])

			expect(formatted).toEqual([])
		})

		it('preserves complex parameters', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const schema: ToolSchema = {
				name: 'complex_tool',
				description: 'A complex tool',
				parameters: {
					type: 'object',
					properties: {
						nested: {
							type: 'object',
							properties: {
								value: { type: 'number' },
							},
						},
						array: {
							type: 'array',
							items: { type: 'string' },
						},
					},
				},
			}

			const formatted = adapter.formatSchemas([schema]) as readonly OpenAITool[]

			expect(formatted[0]!.function.parameters).toEqual(schema.parameters)
		})
	})

	describe('parseToolCalls', () => {
		it('parses valid OpenAI response', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [
					{
						message: {
							tool_calls: [
								{
									id: 'call_123',
									type: 'function',
									function: {
										name: 'get_weather',
										arguments: '{"city":"London"}',
									},
								},
							],
						},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(1)
			expect(calls[0]).toEqual({
				id: 'call_123',
				name: 'get_weather',
				arguments: { city: 'London' },
			})
		})

		it('parses multiple tool calls', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [
					{
						message: {
							tool_calls: [
								{
									id: 'call_1',
									type: 'function',
									function: {
										name: 'tool1',
										arguments: '{"a":1}',
									},
								},
								{
									id: 'call_2',
									type: 'function',
									function: {
										name: 'tool2',
										arguments: '{"b":2}',
									},
								},
							],
						},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(2)
			expect(calls[0]!.name).toBe('tool1')
			expect(calls[1]!.name).toBe('tool2')
		})

		it('returns empty array for null response', () => {
			const adapter = createOpenAIToolFormatAdapter()

			expect(adapter.parseToolCalls(null)).toEqual([])
		})

		it('returns empty array for undefined response', () => {
			const adapter = createOpenAIToolFormatAdapter()

			expect(adapter.parseToolCalls(undefined)).toEqual([])
		})

		it('returns empty array for primitive response', () => {
			const adapter = createOpenAIToolFormatAdapter()

			expect(adapter.parseToolCalls('string')).toEqual([])
			expect(adapter.parseToolCalls(123)).toEqual([])
			expect(adapter.parseToolCalls(true)).toEqual([])
		})

		it('returns empty array for missing choices', () => {
			const adapter = createOpenAIToolFormatAdapter()

			expect(adapter.parseToolCalls({})).toEqual([])
		})

		it('returns empty array for missing tool_calls', () => {
			const adapter = createOpenAIToolFormatAdapter()

			expect(adapter.parseToolCalls({ choices: [{ message: {} }] })).toEqual([])
		})

		it('handles invalid JSON in arguments', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [
					{
						message: {
							tool_calls: [
								{
									id: 'call_1',
									type: 'function',
									function: {
										name: 'tool1',
										arguments: 'not valid json',
									},
								},
							],
						},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(1)
			expect(calls[0]!.arguments).toEqual({})
		})

		it('handles array arguments (non-object)', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [
					{
						message: {
							tool_calls: [
								{
									id: 'call_1',
									type: 'function',
									function: {
										name: 'tool1',
										arguments: '[1,2,3]',
									},
								},
							],
						},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(1)
			expect(calls[0]!.arguments).toEqual({})
		})

		it('skips malformed tool calls', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [
					{
						message: {
							tool_calls: [
								null,
								{ id: 'no_function' },
								{
									id: 'call_1',
									function: {
										name: 'valid',
										arguments: '{}',
									},
								},
							],
						},
					},
				],
			}

			const calls = adapter.parseToolCalls(response)

			expect(calls).toHaveLength(1)
			expect(calls[0]!.name).toBe('valid')
		})
	})

	describe('formatResult', () => {
		it('formats successful result', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const result: ToolResult = {
				callId: 'call_123',
				name: 'get_weather',
				success: true,
				value: { temperature: 20, unit: 'celsius' },
			}

			const formatted = adapter.formatResult(result)

			expect(formatted).toEqual({
				tool_call_id: 'call_123',
				role: 'tool',
				content: JSON.stringify({ temperature: 20, unit: 'celsius' }),
			})
		})

		it('formats error result', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const result: ToolResult = {
				callId: 'call_456',
				name: 'get_weather',
				success: false,
				error: 'City not found',
			}

			const formatted = adapter.formatResult(result)

			expect(formatted).toEqual({
				tool_call_id: 'call_456',
				role: 'tool',
				content: JSON.stringify({ error: 'City not found' }),
			})
		})

		it('handles null value', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const result: ToolResult = {
				callId: 'call_789',
				name: 'null_tool',
				success: true,
				value: null,
			}

			const formatted = adapter.formatResult(result)

			expect(formatted).toEqual({
				tool_call_id: 'call_789',
				role: 'tool',
				content: 'null',
			})
		})

		it('handles empty string error', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const result: ToolResult = {
				callId: 'call_abc',
				name: 'error_tool',
				success: false,
				error: '',
			}

			const formatted = adapter.formatResult(result)

			expect(formatted).toEqual({
				tool_call_id: 'call_abc',
				role: 'tool',
				content: JSON.stringify({ error: '' }),
			})
		})
	})

	describe('Edge Cases', () => {
		it('handles schema with empty description', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const schema: ToolSchema = {
				name: 'empty_desc',
				description: '',
				parameters: {},
			}

			const formatted = adapter.formatSchemas([schema]) as readonly OpenAITool[]

			expect(formatted[0]!.function.description).toBe('')
		})

		it('handles options parameter', () => {
			const adapter = createOpenAIToolFormatAdapter({
				toolChoice: 'auto',
			})

			expect(adapter).toBeDefined()
		})

		it('handles complex nested arguments', () => {
			const adapter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [
					{
						message: {
							tool_calls: [
								{
									id: 'call_nested',
									type: 'function',
									function: {
										name: 'nested_tool',
										arguments: JSON.stringify({
											level1: {
												level2: {
													level3: 'deep',
												},
											},
											array: [1, { nested: true }],
										}),
									},
								},
							],
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
	})
})
