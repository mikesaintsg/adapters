/**
 * Tool Call Bridge Adapter
 *
 * Bridges tool calls from LLM inference to contextprotocol tool handlers.
 * Supports single and batch execution with timeout and error handling.
 */

import type {
	ToolCallBridgeInterface,
	ToolCallBridgeOptions,
	ToolRegistryMinimal,
	ToolCall,
	ToolResult,
} from '@mikesaintsg/core'

/**
 * Tool Call Bridge implementation
 *
 * Connects inference tool calls to contextprotocol handlers with:
 * - Single and batch execution
 * - Optional timeout
 * - Error callback for handling failures
 */
class ToolCallBridge implements ToolCallBridgeInterface {
	#registry: ToolRegistryMinimal
	#timeout: number | undefined
	#onError: ((error: unknown, toolCall: ToolCall) => void) | undefined

	constructor(options: ToolCallBridgeOptions) {
		this.#registry = options.registry
		this.#timeout = options.timeout
		this.#onError = options.onError
	}

	execute(toolCall: ToolCall): Promise<ToolResult>
	execute(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	async execute(
		input: ToolCall | readonly ToolCall[],
	): Promise<ToolResult | readonly ToolResult[]> {
		if (Array.isArray(input)) {
			const toolCalls = input as readonly ToolCall[]
			return Promise.all(toolCalls.map((tc) => this.#executeSingle(tc)))
		}
		const singleCall = input as ToolCall
		return this.#executeSingle(singleCall)
	}

	hasTool(name: string): boolean {
		return this.#registry.has(name)
	}

	async #executeSingle(toolCall: ToolCall): Promise<ToolResult> {
		if (!this.#registry.has(toolCall.name)) {
			return {
				callId: toolCall.id,
				name: toolCall.name,
				success: false,
				value: null,
				error: `Tool not found: ${toolCall.name}`,
			}
		}

		try {
			const promise = this.#registry.execute(toolCall.name, toolCall.arguments)
			const value = await this.#withTimeout(promise, this.#timeout)
			return {
				callId: toolCall.id,
				name: toolCall.name,
				success: true,
				value,
			}
		} catch (error) {
			this.#onError?.(error, toolCall)
			return {
				callId: toolCall.id,
				name: toolCall.name,
				success: false,
				value: null,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	async #withTimeout<T>(promise: Promise<T>, timeout: number | undefined): Promise<T> {
		if (timeout === undefined) {
			return promise
		}

		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Tool execution timed out after ${timeout}ms`))
			}, timeout)

			promise
				.then((value) => {
					clearTimeout(timer)
					resolve(value)
				})
				.catch((error: unknown) => {
					clearTimeout(timer)
					reject(error instanceof Error ? error : new Error(String(error)))
				})
		})
	}
}

/**
 * Creates a Tool Call Bridge adapter
 *
 * @param options - Bridge configuration
 * @returns ToolCallBridgeInterface implementation
 *
 * @example
 * ```ts
 * const bridge = createToolCallBridge({
 *   registry: toolRegistry,
 *   timeout: 5000,
 *   onError: (error, toolCall) => console.error(`Tool ${toolCall.name} failed:`, error),
 * })
 *
 * const result = await bridge.execute({
 *   id: 'call_123',
 *   name: 'get_weather',
 *   arguments: { city: 'Paris' },
 * })
 * ```
 */
export function createToolCallBridge(
	options: ToolCallBridgeOptions,
): ToolCallBridgeInterface {
	return new ToolCallBridge(options)
}
