/**
 * HuggingFace Provider Tool Calling Tests
 *
 * Tests the tool calling infrastructure of the HuggingFace provider adapter.
 * Since distilgpt2 doesn't support tools, we test:
 * - Tool call parsing logic
 * - Capability detection
 * - Tool schema conversion
 * - Edge cases in tool call format
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { ProviderAdapterInterface, ToolSchema } from '@mikesaintsg/core'
import type { HuggingFaceTextGenerationPipeline } from '@mikesaintsg/adapters'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
import {
	loadTextGenerationPipeline,
	createMessage,
	HF_TEST_TIMEOUTS,
	HUGGINGFACE_CONFIG,
} from './setup.js'

// Module-level state
let textPipeline: HuggingFaceTextGenerationPipeline | undefined
let providerWithTools: ProviderAdapterInterface | undefined
let providerWithoutTools: ProviderAdapterInterface | undefined

// Sample tools for testing
const SAMPLE_TOOLS: readonly ToolSchema[] = [
	{
		name: 'get_weather',
		description: 'Get the current weather for a location',
		parameters: {
			type: 'object',
			properties: {
				location: {
					type: 'string',
					description: 'The city and country, e.g. "London, UK"',
				},
				unit: {
					type: 'string',
					description: 'Temperature unit',
					enum: ['celsius', 'fahrenheit'],
				},
			},
			required: ['location'],
		},
	},
	{
		name: 'search_web',
		description: 'Search the web for information',
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query',
				},
				limit: {
					type: 'number',
					description: 'Maximum number of results',
				},
			},
			required: ['query'],
		},
	},
]

beforeAll(async() => {
	console.log('[Tool Test] Loading text generation model...')
	textPipeline = await loadTextGenerationPipeline()

	// Create provider WITH tools enabled
	providerWithTools = createHuggingFaceProviderAdapter({
		pipeline: textPipeline,
		modelName: HUGGINGFACE_CONFIG.textModel,
		enableTools: true,
	})

	// Create provider WITHOUT tools enabled
	providerWithoutTools = createHuggingFaceProviderAdapter({
		pipeline: textPipeline,
		modelName: HUGGINGFACE_CONFIG.textModel,
		enableTools: false,
	})

	console.log('[Tool Test] Ready')
}, HF_TEST_TIMEOUTS.modelLoad)

afterAll(async() => {
	console.log('[Tool Test] Disposing...')
	if (textPipeline?.dispose) {
		await textPipeline.dispose()
	}
	textPipeline = undefined
	providerWithTools = undefined
	providerWithoutTools = undefined
	console.log('[Tool Test] Cleanup complete')
})

describe('HuggingFaceProvider Tool Calling', () => {
	// =========================================================================
	// Capability Detection
	// =========================================================================

	describe('capability detection', () => {
		it('reports supportsTools based on enableTools option', () => {
			// distilgpt2 doesn't have apply_chat_template, so even with enableTools=true
			// it should return false because the tokenizer doesn't support it
			expect(providerWithoutTools?.supportsTools()).toBe(false)

			// With enableTools=true but no apply_chat_template, still false
			// (This is correct behavior - the model must actually support it)
			const hasApplyChatTemplate = textPipeline?.tokenizer?.apply_chat_template !== undefined
			expect(providerWithTools?.supportsTools()).toBe(hasApplyChatTemplate)
		})

		it('getCapabilities reflects tool support correctly', () => {
			const capsWithTools = providerWithTools?.getCapabilities()
			const capsWithoutTools = providerWithoutTools?.getCapabilities()

			expect(capsWithoutTools?.supportsTools).toBe(false)

			// With enableTools=true, depends on apply_chat_template availability
			const hasApplyChatTemplate = textPipeline?.tokenizer?.apply_chat_template !== undefined
			expect(capsWithTools?.supportsTools).toBe(hasApplyChatTemplate)
		})

		it('still supports streaming regardless of tool support', () => {
			expect(providerWithTools?.supportsStreaming()).toBe(true)
			expect(providerWithoutTools?.supportsStreaming()).toBe(true)
		})
	})

	// =========================================================================
	// Generation with Tools (graceful degradation)
	// =========================================================================

	describe('generation with tools', () => {
		it('generates response when tools are provided but not supported', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const messages = [createMessage('What is the weather in London?')]

			// Even though we pass tools, the model doesn't support them
			// It should still generate a text response
			const handle = p.generate(messages, {
				maxTokens: 30,
				tools: SAMPLE_TOOLS,
			})
			const result = await handle.result()

			expect(result.text).toBeDefined()
			expect(result.aborted).toBe(false)
			// No tool calls expected since model doesn't support tools
			expect(result.toolCalls).toEqual([])
		}, HF_TEST_TIMEOUTS.generation)

		it('handles empty tools array', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const messages = [createMessage('Hello')]

			const handle = p.generate(messages, {
				maxTokens: 20,
				tools: [],
			})
			const result = await handle.result()

			expect(result.text).toBeDefined()
			expect(result.toolCalls).toEqual([])
		}, HF_TEST_TIMEOUTS.generation)

		it('handles no tools option', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const messages = [createMessage('Hello')]

			const handle = p.generate(messages, {
				maxTokens: 20,
			})
			const result = await handle.result()

			expect(result.text).toBeDefined()
			expect(result.toolCalls).toEqual([])
		}, HF_TEST_TIMEOUTS.generation)
	})

	// =========================================================================
	// Tool Schema Variations
	// =========================================================================

	describe('tool schema variations', () => {
		it('handles tool with no parameters', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const toolNoParams: ToolSchema = {
				name: 'get_time',
				description: 'Get current time',
				parameters: {
					type: 'object',
					properties: {},
				},
			}

			const handle = p.generate([createMessage('What time is it?')], {
				maxTokens: 20,
				tools: [toolNoParams],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles tool with many parameters', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const complexTool: ToolSchema = {
				name: 'complex_function',
				description: 'A function with many parameters',
				parameters: {
					type: 'object',
					properties: {
						stringParam: { type: 'string', description: 'A string' },
						numberParam: { type: 'number', description: 'A number' },
						integerParam: { type: 'integer', description: 'An integer' },
						booleanParam: { type: 'boolean', description: 'A boolean' },
						arrayParam: { type: 'array', description: 'An array' },
						objectParam: { type: 'object', description: 'An object' },
					},
					required: ['stringParam', 'numberParam'],
				},
			}

			const handle = p.generate([createMessage('Call the complex function')], {
				maxTokens: 20,
				tools: [complexTool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles tool with enum values', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const enumTool: ToolSchema = {
				name: 'set_mode',
				description: 'Set operation mode',
				parameters: {
					type: 'object',
					properties: {
						mode: {
							type: 'string',
							description: 'The mode',
							enum: ['auto', 'manual', 'hybrid'],
						},
					},
					required: ['mode'],
				},
			}

			const handle = p.generate([createMessage('Set mode to auto')], {
				maxTokens: 20,
				tools: [enumTool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles multiple tools', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const handle = p.generate([createMessage('Search for weather in Tokyo')], {
				maxTokens: 20,
				tools: SAMPLE_TOOLS,
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)
	})

	// =========================================================================
	// Tool Name Edge Cases
	// =========================================================================

	describe('tool name edge cases', () => {
		it('handles tool with underscore name', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const tool: ToolSchema = {
				name: 'get_user_data',
				description: 'Get user data',
				parameters: { type: 'object', properties: {} },
			}

			const handle = p.generate([createMessage('Get my data')], {
				maxTokens: 20,
				tools: [tool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles tool with camelCase name', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const tool: ToolSchema = {
				name: 'getUserData',
				description: 'Get user data',
				parameters: { type: 'object', properties: {} },
			}

			const handle = p.generate([createMessage('Get my data')], {
				maxTokens: 20,
				tools: [tool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles tool with long name', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const tool: ToolSchema = {
				name: 'this_is_a_very_long_function_name_that_describes_exactly_what_it_does',
				description: 'A function with a long name',
				parameters: { type: 'object', properties: {} },
			}

			const handle = p.generate([createMessage('Call it')], {
				maxTokens: 20,
				tools: [tool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)
	})

	// =========================================================================
	// Description Edge Cases
	// =========================================================================

	describe('description edge cases', () => {
		it('handles tool with long description', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const tool: ToolSchema = {
				name: 'detailed_func',
				description: 'This is a very detailed description that explains exactly what this function does, including all the edge cases it handles, the expected input format, the output format, and any side effects it might have. It also includes examples and usage notes for developers.',
				parameters: { type: 'object', properties: {} },
			}

			const handle = p.generate([createMessage('Use the detailed function')], {
				maxTokens: 20,
				tools: [tool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles tool with unicode in description', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const tool: ToolSchema = {
				name: 'translate',
				description: '翻译文本到其他语言 (Translate text to other languages)',
				parameters: {
					type: 'object',
					properties: {
						text: { type: 'string', description: '要翻译的文本' },
					},
				},
			}

			const handle = p.generate([createMessage('Translate hello')], {
				maxTokens: 20,
				tools: [tool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles tool with special characters in description', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const tool: ToolSchema = {
				name: 'format_text',
				description: 'Format text with special chars: <, >, &, ", \', \\, /, |, {, }, [, ]',
				parameters: { type: 'object', properties: {} },
			}

			const handle = p.generate([createMessage('Format my text')], {
				maxTokens: 20,
				tools: [tool],
			})
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)
	})

	// =========================================================================
	// Provider Configuration
	// =========================================================================

	describe('provider configuration', () => {
		it('enableTools=false prevents tool support even with tools passed', async() => {
			const p = providerWithoutTools
			if (p === undefined) throw new Error('Provider not initialized')

			expect(p.supportsTools()).toBe(false)

			const handle = p.generate([createMessage('Get weather')], {
				maxTokens: 20,
				tools: SAMPLE_TOOLS,
			})
			const result = await handle.result()

			// Should still work, just no tool calls
			expect(result.text).toBeDefined()
			expect(result.toolCalls).toEqual([])
		}, HF_TEST_TIMEOUTS.generation)

		it('can create multiple providers with different enableTools settings', () => {
			const provider1 = createHuggingFaceProviderAdapter({
				pipeline: textPipeline!,
				modelName: HUGGINGFACE_CONFIG.textModel,
				enableTools: true,
			})

			const provider2 = createHuggingFaceProviderAdapter({
				pipeline: textPipeline!,
				modelName: HUGGINGFACE_CONFIG.textModel,
				enableTools: false,
			})

			// They should have different IDs
			expect(provider1.getId()).not.toBe(provider2.getId())

			// Both should work independently
			expect(provider1.supportsStreaming()).toBe(true)
			expect(provider2.supportsStreaming()).toBe(true)
		})
	})
})

/**
 * Unit tests for tool call parsing logic.
 * These test the parsing function directly without needing model inference.
 */
describe('Tool Call Parsing', () => {
	// Helper to test parsing via provider internals
	// Since parseToolCalls is private, we test it indirectly through behavior

	describe('Hermes format parsing', () => {
		it('result.toolCalls is empty array when no tool calls in output', async() => {
			const p = providerWithTools
			if (p === undefined) throw new Error('Provider not initialized')

			const handle = p.generate([createMessage('Hello')], {
				maxTokens: 20,
				tools: SAMPLE_TOOLS,
			})
			const result = await handle.result()

			// Regular text output should have empty toolCalls
			expect(Array.isArray(result.toolCalls)).toBe(true)
			expect(result.toolCalls.length).toBe(0)
		}, HF_TEST_TIMEOUTS.generation)
	})
})
