/**
 * OpenAI Tool Format Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createOpenAIToolFormatAdapter } from '@mikesaintsg/adapters'

describe('OpenAIToolFormat', () => {
	describe('formatSchemas', () => {
		it('formats single schema to OpenAI function format', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const schemas = [{
				name: 'get_weather',
				description: 'Get the current weather',
				parameters: {
					type: 'object',
					properties: { city: { type: 'string' } },
					required: ['city'],
				},
			}]

			const formatted = formatter.formatSchemas(schemas) as unknown[]

			expect(formatted).toEqual([{
				type: 'function',
				function: {
					name: 'get_weather',
					description: 'Get the current weather',
					parameters: {
						type: 'object',
						properties: { city: { type: 'string' } },
						required: ['city'],
					},
				},
			}])
		})

		it('formats multiple schemas', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const schemas = [
				{ name: 'tool1', description: 'First tool', parameters: {} },
				{ name: 'tool2', description: 'Second tool', parameters: {} },
			]

			const formatted = formatter.formatSchemas(schemas) as unknown[]

			expect(formatted).toHaveLength(2)
			expect((formatted[0] as { function: { name: string } }).function.name).toBe('tool1')
			expect((formatted[1] as { function: { name: string } }).function.name).toBe('tool2')
		})

		it('includes tool_choice when specified', () => {
			const formatter = createOpenAIToolFormatAdapter({
				toolChoice: 'required',
			})
			const schemas = [{ name: 'test', description: 'Test', parameters: {} }]

			const formatted = formatter.formatSchemas(schemas) as { tools: unknown[]; tool_choice: string }

			expect(formatted.tool_choice).toBe('required')
			expect(formatted.tools).toHaveLength(1)
		})
	})

	describe('parseToolCalls', () => {
		it('parses tool calls from OpenAI response', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [{
					message: {
						tool_calls: [{
							id: 'call_123',
							type: 'function',
							function: {
								name: 'get_weather',
								arguments: '{"city":"Paris"}',
							},
						}],
					},
				}],
			}

			const toolCalls = formatter.parseToolCalls(response)

			expect(toolCalls).toEqual([{
				id: 'call_123',
				name: 'get_weather',
				arguments: { city: 'Paris' },
			}])
		})

		it('returns empty array for response without tool calls', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const response = { choices: [{ message: {} }] }

			const toolCalls = formatter.parseToolCalls(response)

			expect(toolCalls).toEqual([])
		})

		it('handles invalid JSON in arguments', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [{
					message: {
						tool_calls: [{
							id: 'call_123',
							type: 'function',
							function: {
								name: 'test',
								arguments: 'invalid json',
							},
						}],
					},
				}],
			}

			const toolCalls = formatter.parseToolCalls(response)

			expect(toolCalls[0]?.arguments).toEqual({})
		})

		it('parses multiple tool calls', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const response = {
				choices: [{
					message: {
						tool_calls: [
							{ id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
							{ id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' } },
						],
					},
				}],
			}

			const toolCalls = formatter.parseToolCalls(response)

			expect(toolCalls).toHaveLength(2)
		})
	})

	describe('formatResult', () => {
		it('formats string result', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const result = { callId: 'call_123', name: 'test', success: true, value: 'Hello world' }

			const formatted = formatter.formatResult(result) as { role: string; tool_call_id: string; content: string }

			expect(formatted).toEqual({
				role: 'tool',
				tool_call_id: 'call_123',
				content: 'Hello world',
			})
		})

		it('formats object result as JSON', () => {
			const formatter = createOpenAIToolFormatAdapter()
			const result = { callId: 'call_123', name: 'test', success: true, value: { temperature: 72 } }

			const formatted = formatter.formatResult(result) as { content: string }

			expect(formatted.content).toBe('{"temperature":72}')
		})
	})
})
