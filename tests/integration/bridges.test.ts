/**
 * @mikesaintsg/adapters
 *
 * Integration tests for bridge functions.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	createToolCallBridge,
	createRetrievalTool,
} from '@mikesaintsg/adapters'
import type {
	ToolRegistryInterface,
	VectorStoreInterface,
	SearchResult,
} from '@mikesaintsg/adapters'

describe('Bridge Integration', () => {
	describe('Tool Call Bridge with Registry', () => {
		function createMockRegistry(): ToolRegistryInterface {
			const tools = new Map<string, (args: unknown) => unknown>()

			tools.set('get_weather', (args) => {
				const { location } = args as { location: string }
				return { temperature: 72, location, conditions: 'sunny' }
			})

			tools.set('calculate', (args) => {
				const { a, b, operation } = args as { a: number; b: number; operation: string }
				switch (operation) {
					case 'add': return a + b
					case 'subtract': return a - b
					case 'multiply': return a * b
					case 'divide': return b !== 0 ? a / b : NaN
					default: throw new Error(`Unknown operation: ${operation}`)
				}
			})

			return {
				getSchemas: () => [
					{
						name: 'get_weather',
						description: 'Get weather for a location',
						parameters: {
							type: 'object' as const,
							properties: { location: { type: 'string' } },
							required: ['location'],
						},
					},
					{
						name: 'calculate',
						description: 'Perform calculation',
						parameters: {
							type: 'object' as const,
							properties: {
								a: { type: 'number' },
								b: { type: 'number' },
								operation: { type: 'string' },
							},
							required: ['a', 'b', 'operation'],
						},
					},
				],
				execute: (name: string, args: unknown) => {
					const fn = tools.get(name)
					if (!fn) throw new Error(`Tool not found: ${name}`)
					return Promise.resolve(fn(args))
				},
				has: (name: string) => tools.has(name),
			}
		}

		it('executes single tool call', async() => {
			const registry = createMockRegistry()
			const bridge = createToolCallBridge({ registry })

			const result = await bridge.execute({
				id: 'call_1',
				name: 'get_weather',
				arguments: { location: 'San Francisco' },
			})

			expect(result.success).toBe(true)
			expect(result.value).toEqual({
				temperature: 72,
				location: 'San Francisco',
				conditions: 'sunny',
			})
		})

		it('executes multiple tool calls in parallel', async() => {
			const registry = createMockRegistry()
			const bridge = createToolCallBridge({ registry })

			const results = await bridge.executeAll([
				{ id: 'call_1', name: 'get_weather', arguments: { location: 'NYC' } },
				{ id: 'call_2', name: 'calculate', arguments: { a: 5, b: 3, operation: 'add' } },
			])

			expect(results).toHaveLength(2)
			expect(results[0]?.success).toBe(true)
			expect(results[1]?.success).toBe(true)
			expect(results[1]?.value).toBe(8)
		})

		it('handles tool not found error', async() => {
			const registry = createMockRegistry()
			const bridge = createToolCallBridge({ registry })

			const result = await bridge.execute({
				id: 'call_1',
				name: 'unknown_tool',
				arguments: {},
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('unknown_tool')
		})

		it('calls lifecycle hooks in correct order', async() => {
			const registry = createMockRegistry()
			const calls: string[] = []

			const bridge = createToolCallBridge({
				registry,
				onBeforeExecute: () => calls.push('before'),
				onAfterExecute: () => calls.push('after'),
			})

			await bridge.execute({
				id: 'call_1',
				name: 'get_weather',
				arguments: { location: 'Boston' },
			})

			expect(calls).toEqual(['before', 'after'])
		})

		it('calls onError hook on failure', async() => {
			const registry = createMockRegistry()
			const errorHandler = vi.fn()

			const bridge = createToolCallBridge({
				registry,
				onError: errorHandler,
			})

			await bridge.execute({
				id: 'call_1',
				name: 'unknown_tool',
				arguments: {},
			})

			expect(errorHandler).toHaveBeenCalled()
		})

		it('respects timeout for slow operations', async() => {
			const slowRegistry: ToolRegistryInterface = {
				getSchemas: () => [],
				execute: async() => {
					await new Promise((resolve) => setTimeout(resolve, 500))
					return { result: 'done' }
				},
				has: () => true,
			}

			const bridge = createToolCallBridge({
				registry: slowRegistry,
				timeout: 50, // 50ms timeout
			})

			const result = await bridge.execute({
				id: 'call_1',
				name: 'slow_tool',
				arguments: {},
			})

			expect(result.success).toBe(false)
			expect(result.error).toBeDefined()
		})
	})

	describe('Retrieval Tool with VectorStore', () => {
		function createMockVectorStore(): VectorStoreInterface {
			const documents: SearchResult[] = [
				{ id: 'doc1', content: 'TypeScript is a typed superset of JavaScript', score: 0 },
				{ id: 'doc2', content: 'JavaScript is a dynamic programming language', score: 0 },
				{ id: 'doc3', content: 'React is a JavaScript library for building UIs', score: 0 },
				{ id: 'doc4', content: 'Node.js is a JavaScript runtime', score: 0 },
			]

			return {
				search: (query: string, options?: { topK?: number; minScore?: number }) => {
					// Simulate semantic search with simple text matching
					const topK = options?.topK ?? 5
					const minScore = options?.minScore ?? 0

					const results = documents
						.map((doc) => ({
							...doc,
							score: doc.content.toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.3,
						}))
						.filter((r) => r.score >= minScore)
						.sort((a, b) => b.score - a.score)
						.slice(0, topK)

					return Promise.resolve(results)
				},
			}
		}

		it('creates retrieval tool with correct schema', () => {
			const vectorStore = createMockVectorStore()

			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				topK: 3,
				minScore: 0.5,
			})

			expect(tool.schema.name).toBe('search_docs')
			expect(tool.schema.description).toBe('Search documentation')
			expect(tool.execute).toBeInstanceOf(Function)
		})

		it('executes search and returns results', async() => {
			const vectorStore = createMockVectorStore()

			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				topK: 5,
				minScore: 0.5,
			})

			const results = await tool.execute({ query: 'TypeScript' })

			expect(results.length).toBeGreaterThan(0)
			expect(results[0]?.content).toContain('TypeScript')
			expect(results[0]?.score).toBeGreaterThanOrEqual(0.5)
		})

		it('respects topK limit', async() => {
			const vectorStore = createMockVectorStore()

			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				topK: 2,
				minScore: 0,
			})

			const results = await tool.execute({ query: 'JavaScript' })

			expect(results.length).toBeLessThanOrEqual(2)
		})

		it('respects minScore threshold', async() => {
			const vectorStore = createMockVectorStore()

			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				topK: 10,
				minScore: 0.8,
			})

			const results = await tool.execute({ query: 'JavaScript' })

			for (const result of results) {
				expect(result.score).toBeGreaterThanOrEqual(0.8)
			}
		})

		it('integrates with tool call bridge', async() => {
			const vectorStore = createMockVectorStore()

			const retrievalTool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				topK: 3,
			})

			// Create registry with retrieval tool
			const registry: ToolRegistryInterface = {
				getSchemas: () => [retrievalTool.schema],
				execute: async(name: string, args: unknown) => {
					if (name === 'search_docs') {
						return retrievalTool.execute(args as { query: string })
					}
					throw new Error(`Unknown tool: ${name}`)
				},
				has: (name: string) => name === 'search_docs',
			}

			const bridge = createToolCallBridge({ registry })

			const result = await bridge.execute({
				id: 'call_1',
				name: 'search_docs',
				arguments: { query: 'React' },
			})

			expect(result.success).toBe(true)
			expect(Array.isArray(result.value)).toBe(true)
		})
	})
})
