/**
 * @mikesaintsg/adapters
 *
 * Tests for Tool Call Bridge.
 */

import { describe, it, expect, vi } from 'vitest'
import { createToolCallBridge } from '../../src/bridges/tool-call.js'
import type { ToolRegistryInterface } from '../../src/types.js'
import type { ToolCall } from '@mikesaintsg/core'

// Helper to create a mock tool registry
function createMockRegistry(tools: Record<string, (args: unknown) => unknown>): ToolRegistryInterface {
	return {
		getSchemas: () => Object.keys(tools).map(name => ({
			name,
			description: `Mock tool: ${name}`,
			parameters: { type: 'object' as const, properties: {} },
		})),
		execute: (name: string, args: unknown) => {
			const tool = tools[name]
			if (!tool) throw new Error(`Tool not found: ${name}`)
			return Promise.resolve(tool(args))
		},
		has: (name: string) => name in tools,
	}
}

// Helper to create a tool call
function createToolCall(name: string, args: Record<string, unknown> = {}): ToolCall {
	return {
		id: `call-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		name,
		arguments: args,
	}
}

describe('createToolCallBridge', () => {
	describe('factory', () => {
		it('creates a tool call bridge', () => {
			const registry = createMockRegistry({})
			const bridge = createToolCallBridge({ registry })

			expect(bridge).toBeDefined()
			expect(bridge.execute).toBeTypeOf('function')
			expect(bridge.executeAll).toBeTypeOf('function')
			expect(bridge.hasTool).toBeTypeOf('function')
		})
	})

	describe('hasTool', () => {
		it('returns true for existing tool', () => {
			const registry = createMockRegistry({
				myTool: () => 'result',
			})
			const bridge = createToolCallBridge({ registry })

			expect(bridge.hasTool('myTool')).toBe(true)
		})

		it('returns false for non-existent tool', () => {
			const registry = createMockRegistry({})
			const bridge = createToolCallBridge({ registry })

			expect(bridge.hasTool('nonExistent')).toBe(false)
		})
	})

	describe('execute', () => {
		it('executes a tool successfully', async() => {
			const registry = createMockRegistry({
				greet: (args: unknown) => {
					const { name } = args as { name: string }
					return `Hello, ${name}!`
				},
			})
			const bridge = createToolCallBridge({ registry })

			const toolCall = createToolCall('greet', { name: 'World' })
			const result = await bridge.execute(toolCall)

			expect(result.success).toBe(true)
			expect(result.value).toBe('Hello, World!')
			expect(result.callId).toBe(toolCall.id)
			expect(result.name).toBe('greet')
		})

		it('returns error for non-existent tool', async() => {
			const registry = createMockRegistry({})
			const bridge = createToolCallBridge({ registry })

			const toolCall = createToolCall('nonExistent')
			const result = await bridge.execute(toolCall)

			expect(result.success).toBe(false)
			expect(result.error).toBe('Tool not found: nonExistent')
		})

		it('handles tool execution errors', async() => {
			const registry = createMockRegistry({
				failingTool: () => {
					throw new Error('Something went wrong')
				},
			})
			const bridge = createToolCallBridge({ registry })

			const toolCall = createToolCall('failingTool')
			const result = await bridge.execute(toolCall)

			expect(result.success).toBe(false)
			expect(result.error).toBe('Something went wrong')
		})

		it('handles async tool execution', async() => {
			const registry = createMockRegistry({
				asyncTool: async() => {
					await new Promise(r => setTimeout(r, 10))
					return { status: 'completed' }
				},
			})
			const bridge = createToolCallBridge({ registry })

			const toolCall = createToolCall('asyncTool')
			const result = await bridge.execute(toolCall)

			expect(result.success).toBe(true)
			expect(result.value).toEqual({ status: 'completed' })
		})

		it('times out long-running tools', async() => {
			const registry = createMockRegistry({
				slowTool: async() => {
					await new Promise(r => setTimeout(r, 1000))
					return 'done'
				},
			})
			const bridge = createToolCallBridge({ registry, timeout: 50 })

			const toolCall = createToolCall('slowTool')
			const result = await bridge.execute(toolCall)

			expect(result.success).toBe(false)
			expect(result.error).toContain('timed out')
		})
	})

	describe('executeAll', () => {
		it('executes multiple tools in parallel', async() => {
			const registry = createMockRegistry({
				tool1: () => 'result1',
				tool2: () => 'result2',
			})
			const bridge = createToolCallBridge({ registry })

			const results = await bridge.executeAll([
				createToolCall('tool1'),
				createToolCall('tool2'),
			])

			expect(results.length).toBe(2)
			expect(results[0]?.success).toBe(true)
			expect(results[0]?.value).toBe('result1')
			expect(results[1]?.success).toBe(true)
			expect(results[1]?.value).toBe('result2')
		})

		it('handles mixed success and failure', async() => {
			const registry = createMockRegistry({
				working: () => 'ok',
				failing: () => { throw new Error('fail') },
			})
			const bridge = createToolCallBridge({ registry })

			const results = await bridge.executeAll([
				createToolCall('working'),
				createToolCall('failing'),
			])

			expect(results[0]?.success).toBe(true)
			expect(results[1]?.success).toBe(false)
		})
	})

	describe('lifecycle hooks', () => {
		it('calls onBeforeExecute before tool execution', async() => {
			const registry = createMockRegistry({
				myTool: () => 'result',
			})
			const onBeforeExecute = vi.fn()
			const bridge = createToolCallBridge({ registry, onBeforeExecute })

			const toolCall = createToolCall('myTool')
			await bridge.execute(toolCall)

			expect(onBeforeExecute).toHaveBeenCalledWith(toolCall)
		})

		it('calls onAfterExecute after successful execution', async() => {
			const registry = createMockRegistry({
				myTool: () => 'result',
			})
			const onAfterExecute = vi.fn()
			const bridge = createToolCallBridge({ registry, onAfterExecute })

			const toolCall = createToolCall('myTool')
			await bridge.execute(toolCall)

			expect(onAfterExecute).toHaveBeenCalledWith(toolCall, 'result')
		})

		it('calls onError when tool execution fails', async() => {
			const registry = createMockRegistry({
				failingTool: () => { throw new Error('test error') },
			})
			const onError = vi.fn()
			const bridge = createToolCallBridge({ registry, onError })

			const toolCall = createToolCall('failingTool')
			await bridge.execute(toolCall)

			expect(onError).toHaveBeenCalled()
			expect(onError.mock.calls[0]?.[1]).toBe(toolCall)
		})

		it('calls onError for non-existent tool', async() => {
			const registry = createMockRegistry({})
			const onError = vi.fn()
			const bridge = createToolCallBridge({ registry, onError })

			await bridge.execute(createToolCall('nonExistent'))

			expect(onError).toHaveBeenCalled()
		})
	})
})
