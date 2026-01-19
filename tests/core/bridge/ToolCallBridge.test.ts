/**
 * Tool Call Bridge Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { createToolCallBridge } from '@mikesaintsg/adapters'
import type { ToolRegistryMinimal } from '@mikesaintsg/core'

function createMockRegistry(): ToolRegistryMinimal {
	const tools = new Map<string, (args: Readonly<Record<string, unknown>>) => Promise<unknown>>()

	return {
		has(name: string): boolean {
			return tools.has(name)
		},
		async execute(name: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
			const handler = tools.get(name)
			if (!handler) {
				throw new Error(`Tool not found: ${name}`)
			}
			return handler(args)
		},
		// Helper for testing
		register(name: string, handler: (args: Readonly<Record<string, unknown>>) => Promise<unknown>): void {
			tools.set(name, handler)
		},
	} as ToolRegistryMinimal & { register: (name: string, handler: (args: Readonly<Record<string, unknown>>) => Promise<unknown>) => void }
}

describe('ToolCallBridge', () => {
	describe('hasTool', () => {
		it('returns true for registered tools', () => {
			const registry = createMockRegistry()
			;(registry as unknown as { register: (name: string, handler: () => Promise<unknown>) => void }).register('get_weather', () => Promise.resolve({ temp: 72 }))

			const bridge = createToolCallBridge({ registry })

			expect(bridge.hasTool('get_weather')).toBe(true)
		})

		it('returns false for unregistered tools', () => {
			const registry = createMockRegistry()
			const bridge = createToolCallBridge({ registry })

			expect(bridge.hasTool('nonexistent')).toBe(false)
		})
	})

	describe('execute', () => {
		it('executes single tool call', async() => {
			const registry = createMockRegistry()
			;(registry as unknown as { register: (name: string, handler: () => Promise<unknown>) => void }).register('get_weather', () => Promise.resolve({ temperature: 72 }))

			const bridge = createToolCallBridge({ registry })

			const result = await bridge.execute({
				id: 'call_123',
				name: 'get_weather',
				arguments: { city: 'Paris' },
			})

			expect(result.success).toBe(true)
			expect(result.value).toEqual({ temperature: 72 })
			expect(result.callId).toBe('call_123')
		})

		it('returns error for non-existent tool', async() => {
			const registry = createMockRegistry()
			const bridge = createToolCallBridge({ registry })

			const result = await bridge.execute({
				id: 'call_123',
				name: 'nonexistent',
				arguments: {},
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('Tool not found')
		})

		it('executes multiple tool calls in parallel', async() => {
			const registry = createMockRegistry()
			;(registry as unknown as { register: (name: string, handler: (args: Readonly<Record<string, unknown>>) => Promise<unknown>) => void }).register('get_weather', (args) => Promise.resolve({ city: args.city, temp: 72 }))

			const bridge = createToolCallBridge({ registry })

			const results = await bridge.execute([
				{ id: 'call_1', name: 'get_weather', arguments: { city: 'Paris' } },
				{ id: 'call_2', name: 'get_weather', arguments: { city: 'London' } },
			])

			expect(results).toHaveLength(2)
			expect(results[0]?.success).toBe(true)
			expect(results[1]?.success).toBe(true)
		})

		it('calls onError callback on failure', async() => {
			const registry = createMockRegistry()
			;(registry as unknown as { register: (name: string, handler: () => Promise<unknown>) => void }).register('failing_tool', () => Promise.reject(new Error('Tool failed')))

			const onError = vi.fn()
			const bridge = createToolCallBridge({ registry, onError })

			const result = await bridge.execute({
				id: 'call_123',
				name: 'failing_tool',
				arguments: {},
			})

			expect(result.success).toBe(false)
			expect(onError).toHaveBeenCalled()
		})

		it('handles timeout', async() => {
			const registry = createMockRegistry()
			;(registry as unknown as { register: (name: string, handler: () => Promise<unknown>) => void }).register('slow_tool', async() => {
				await new Promise((resolve) => setTimeout(resolve, 100))
				return { result: 'done' }
			})

			const bridge = createToolCallBridge({ registry, timeout: 10 })

			const result = await bridge.execute({
				id: 'call_123',
				name: 'slow_tool',
				arguments: {},
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('timed out')
		})
	})
})
