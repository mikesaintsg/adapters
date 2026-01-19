/**
 * OpenAI Tool Format Adapter
 *
 * Converts tool schemas to OpenAI function calling format and parses
 * tool calls from OpenAI responses.
 */

import type {
	ToolFormatAdapterInterface,
	ToolCall,
	ToolResult,
	ToolSchema,
} from '@mikesaintsg/core'
import type { OpenAIToolFormatAdapterOptions } from '../../types.js'

// ============================================================================
// OpenAI API Types
// ============================================================================

interface OpenAITool {
	readonly type: 'function'
	readonly function: {
		readonly name: string
		readonly description?: string
		readonly parameters?: unknown
	}
}

interface OpenAIToolCall {
	readonly id: string
	readonly type: 'function'
	readonly function: {
		readonly name: string
		readonly arguments: string
	}
}

interface OpenAIMessage {
	readonly tool_calls?: readonly OpenAIToolCall[]
}

interface OpenAIChoice {
	readonly message?: OpenAIMessage
}

interface OpenAIResponse {
	readonly choices?: readonly OpenAIChoice[]
}

// ============================================================================
// Implementation
// ============================================================================

class OpenAIToolFormat implements ToolFormatAdapterInterface {
	#toolChoice: unknown

	constructor(options?: OpenAIToolFormatAdapterOptions) {
		this.#toolChoice = options?.toolChoice
	}

	formatSchemas(schemas: readonly ToolSchema[]): unknown {
		const tools: OpenAITool[] = schemas.map((schema) => ({
			type: 'function',
			function: {
				name: schema.name,
				description: schema.description,
				parameters: schema.parameters,
			},
		}))

		// If tool_choice is specified, include it in the result
		if (this.#toolChoice !== undefined) {
			return {
				tools,
				tool_choice: this.#toolChoice,
			}
		}

		return tools
	}

	parseToolCalls(response: unknown): readonly ToolCall[] {
		const openaiResponse = response as OpenAIResponse
		const choices = openaiResponse?.choices
		if (!choices || choices.length === 0) {
			return []
		}

		const message = choices[0]?.message
		if (!message?.tool_calls || message.tool_calls.length === 0) {
			return []
		}

		return message.tool_calls.map((toolCall): ToolCall => {
			let parsedArguments: unknown = {}
			try {
				parsedArguments = JSON.parse(toolCall.function.arguments)
			} catch {
				// If parsing fails, use empty object
				parsedArguments = {}
			}

			return {
				id: toolCall.id,
				name: toolCall.function.name,
				arguments: parsedArguments as Record<string, unknown>,
			}
		})
	}

	formatResult(result: ToolResult): unknown {
		return {
			role: 'tool',
			tool_call_id: result.callId,
			content: typeof result.value === 'string'
				? result.value
				: JSON.stringify(result.value),
		}
	}
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an OpenAI tool format adapter.
 *
 * @example
 * ```ts
 * const formatter = createOpenAIToolFormatAdapter()
 *
 * const schemas = [{
 *   name: 'get_weather',
 *   description: 'Get the current weather',
 *   parameters: { type: 'object', properties: { city: { type: 'string' } } }
 * }]
 *
 * const formatted = formatter.formatSchemas(schemas)
 * // [{ type: 'function', function: { name: 'get_weather', ... } }]
 * ```
 */
export function createOpenAIToolFormatAdapter(
	options?: OpenAIToolFormatAdapterOptions,
): ToolFormatAdapterInterface {
	return new OpenAIToolFormat(options)
}
