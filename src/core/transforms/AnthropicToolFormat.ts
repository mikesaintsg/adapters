/**
 * Anthropic Tool Format Adapter
 *
 * Converts tool schemas to Anthropic tool use format and parses
 * tool calls from Anthropic responses.
 */

import type {
	ToolFormatAdapterInterface,
	ToolCall,
	ToolResult,
	ToolSchema,
} from '@mikesaintsg/core'
import type {
	AnthropicToolFormatAdapterOptions,
	AnthropicTool,
	AnthropicToolUseBlock,
	AnthropicToolResponse,
} from '../../types.js'

// ============================================================================
// Implementation
// ============================================================================

export class AnthropicToolFormat implements ToolFormatAdapterInterface {
	#toolChoice: unknown

	constructor(options?: AnthropicToolFormatAdapterOptions) {
		this.#toolChoice = options?.toolChoice
	}

	formatSchemas(schemas: readonly ToolSchema[]): unknown {
		const tools: AnthropicTool[] = schemas.map((schema) => ({
			name: schema.name,
			description: schema.description,
			input_schema: schema.parameters ?? { type: 'object', properties: {} },
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
		const anthropicResponse = response as AnthropicToolResponse
		const content = anthropicResponse?.content
		if (!content || content.length === 0) {
			return []
		}

		// Filter for tool_use blocks
		const toolUseBlocks = content.filter(
			(block): block is AnthropicToolUseBlock => block.type === 'tool_use',
		)

		return toolUseBlocks.map((block): ToolCall => ({
			id: block.id,
			name: block.name,
			arguments: block.input,
		}))
	}

	formatResult(result: ToolResult): unknown {
		const content = typeof result.value === 'string'
			? result.value
			: JSON.stringify(result.value)

		return {
			type: 'tool_result',
			tool_use_id: result.callId,
			content,
		}
	}
}
