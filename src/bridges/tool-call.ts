/**
 * @mikesaintsg/adapters
 *
 * Tool Call Bridge - connects inference tool calls to contextprotocol execution.
 * Provides lifecycle hooks and timeout handling.
 */

import type {
	ToolCallBridgeInterface,
	ToolCallBridgeOptions,
} from '../types.js'
import type { ToolCall, ToolResult } from '@mikesaintsg/core'

/** Default timeout for tool execution (30 seconds) */
const DEFAULT_TOOL_TIMEOUT_MS = 30000

/**
 * Create a tool call bridge that connects inference to contextprotocol.
 *
 * @param options - Bridge configuration
 * @returns A tool call bridge instance
 *
 * @example
 * ```ts
 * const bridge = createToolCallBridge({
 *   registry: toolRegistry,
 *   timeout: 10000,
 *   onBeforeExecute: (toolCall) => console.log(`Executing ${toolCall.name}`),
 *   onAfterExecute: (toolCall, result) => console.log(`Result:`, result),
 *   onError: (error, toolCall) => console.error(`Error in ${toolCall.name}:`, error),
 * })
 *
 * const result = await bridge.execute(toolCall)
 * ```
 */
export function createToolCallBridge(
	options: ToolCallBridgeOptions,
): ToolCallBridgeInterface {
	const {
		registry,
		timeout = DEFAULT_TOOL_TIMEOUT_MS,
		onError,
		onBeforeExecute,
		onAfterExecute,
	} = options

	/**
	 * Execute a tool call with timeout and error handling.
	 */
	async function executeWithTimeout(toolCall: ToolCall): Promise<ToolResult> {
		const { id, name, arguments: args } = toolCall

		// Check if tool exists
		if (!registry.has(name)) {
			const error = new Error(`Tool not found: ${name}`)
			onError?.(error, toolCall)
			return {
				callId: id,
				name,
				success: false,
				error: `Tool not found: ${name}`,
			}
		}

		// Call onBeforeExecute hook
		onBeforeExecute?.(toolCall)

		try {
			// Create timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error(`Tool execution timed out after ${timeout}ms`)), timeout)
			})

			// Race between execution and timeout
			const result = await Promise.race([
				registry.execute(name, args),
				timeoutPromise,
			])

			// Call onAfterExecute hook
			onAfterExecute?.(toolCall, result)

			// Return successful result
			return {
				callId: id,
				name,
				success: true,
				value: result,
			}
		} catch (error) {
			// Call onError hook
			onError?.(error, toolCall)

			// Return error result
			const errorMessage = error instanceof Error ? error.message : String(error)
			return {
				callId: id,
				name,
				success: false,
				error: errorMessage,
			}
		}
	}

	return {
		async execute(toolCall: ToolCall): Promise<ToolResult> {
			return executeWithTimeout(toolCall)
		},

		async executeAll(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]> {
			// Execute all tool calls in parallel
			return Promise.all(toolCalls.map(toolCall => executeWithTimeout(toolCall)))
		},

		hasTool(name: string): boolean {
			return registry.has(name)
		},
	}
}
