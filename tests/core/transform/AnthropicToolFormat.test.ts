/**
 * Anthropic Tool Format Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createAnthropicToolFormatAdapter } from '@mikesaintsg/adapters'

describe('AnthropicToolFormat', () => {
	describe('formatSchemas', () => {
		it('formats single schema to Anthropic format', () => {
			const formatter = createAnthropicToolFormatAdapter()
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
				name: 'get_weather',
				description: 'Get the current weather',
				input_schema: {
					type: 'object',
					properties: { city: { type: 'string' } },
					required: ['city'],
				},
			}])
		})

		it('uses default input_schema when parameters empty', () => {
			const formatter = createAnthropicToolFormatAdapter()
			const schemas = [{ name: 'test', description: 'Test', parameters: {} }]

			const formatted = formatter.formatSchemas(schemas) as { input_schema: unknown }[]

			expect(formatted[0]?.input_schema).toEqual({})
		})

		it('formats multiple schemas', () => {
			const formatter = createAnthropicToolFormatAdapter()
			const schemas = [
				{ name: 'tool1', description: 'First tool', parameters: {} },
				{ name: 'tool2', description: 'Second tool', parameters: {} },
			]

			const formatted = formatter.formatSchemas(schemas) as unknown[]

			expect(formatted).toHaveLength(2)
		})

		it('includes tool_choice when specified', () => {
			const formatter = createAnthropicToolFormatAdapter({
				toolChoice: 'any',
			})
			const schemas = [{ name: 'test', description: 'Test', parameters: {} }]

			const formatted = formatter.formatSchemas(schemas) as { tools: unknown[]; tool_choice: string }

			expect(formatted.tool_choice).toBe('any')
			expect(formatted.tools).toHaveLength(1)
		})
	})

	describe('parseToolCalls', () => {
		it('parses tool use blocks from Anthropic response', () => {
			const formatter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{ type: 'text', text: 'Let me check the weather.' },
					{
						type: 'tool_use',
						id: 'toolu_123',
						name: 'get_weather',
						input: { city: 'Paris' },
					},
				],
			}

			const toolCalls = formatter.parseToolCalls(response)

			expect(toolCalls).toEqual([{
				id: 'toolu_123',
				name: 'get_weather',
				arguments: { city: 'Paris' },
			}])
		})

		it('returns empty array for response without tool use', () => {
			const formatter = createAnthropicToolFormatAdapter()
			const response = {
				content: [{ type: 'text', text: 'Hello!' }],
			}

			const toolCalls = formatter.parseToolCalls(response)

			expect(toolCalls).toEqual([])
		})

		it('parses multiple tool use blocks', () => {
			const formatter = createAnthropicToolFormatAdapter()
			const response = {
				content: [
					{ type: 'tool_use', id: 'toolu_1', name: 'tool1', input: {} },
					{ type: 'text', text: 'And also...' },
					{ type: 'tool_use', id: 'toolu_2', name: 'tool2', input: {} },
				],
			}

			const toolCalls = formatter.parseToolCalls(response)

			expect(toolCalls).toHaveLength(2)
			expect(toolCalls[0]?.id).toBe('toolu_1')
			expect(toolCalls[1]?.id).toBe('toolu_2')
		})
	})

	describe('formatResult', () => {
		it('formats string result', () => {
			const formatter = createAnthropicToolFormatAdapter()
			const result = { callId: 'toolu_123', name: 'test', success: true, value: 'Hello world' }

			const formatted = formatter.formatResult(result) as { type: string; tool_use_id: string; content: string }

			expect(formatted).toEqual({
				type: 'tool_result',
				tool_use_id: 'toolu_123',
				content: 'Hello world',
			})
		})

		it('formats object result as JSON', () => {
			const formatter = createAnthropicToolFormatAdapter()
			const result = { callId: 'toolu_123', name: 'test', success: true, value: { temperature: 72 } }

			const formatted = formatter.formatResult(result) as { content: string }

			expect(formatted.content).toBe('{"temperature":72}')
		})
	})
})
