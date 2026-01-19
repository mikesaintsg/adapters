/**
 * Retrieval Tool Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { createRetrievalTool } from '@mikesaintsg/adapters'
import type { VectorStoreMinimal, ScoredResult } from '@mikesaintsg/core'

function createMockVectorStore(): VectorStoreMinimal {
	return {
		search: vi.fn().mockResolvedValue([
			{ content: 'Document 1 content', score: 0.9 },
			{ content: 'Document 2 content', score: 0.8 },
			{ content: 'Document 3 content', score: 0.5 },
		] as ScoredResult[]),
	}
}

describe('RetrievalTool', () => {
	describe('schema', () => {
		it('creates tool schema with correct name and description', () => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
			})

			expect(tool.schema.name).toBe('search_docs')
			expect(tool.schema.description).toBe('Search documentation')
		})

		it('schema has query parameter', () => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
			})

			const params = tool.schema.parameters as {
				type: string
				properties: Record<string, unknown>
				required: string[]
			}

			expect(params.properties.query).toBeDefined()
			expect(params.required).toContain('query')
		})
	})

	describe('handler', () => {
		it('calls vectorStore.search with query', async() => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
			})

			await tool.handler({ query: 'test query' })

			expect(vectorStore.search).toHaveBeenCalledWith('test query', { limit: 5 })
		})

		it('uses custom limit', async() => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				defaultLimit: 10,
			})

			await tool.handler({ query: 'test query' })

			expect(vectorStore.search).toHaveBeenCalledWith('test query', { limit: 10 })
		})

		it('allows overriding limit in args', async() => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
			})

			await tool.handler({ query: 'test query', limit: 3 })

			expect(vectorStore.search).toHaveBeenCalledWith('test query', { limit: 3 })
		})

		it('returns content from results', async() => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				scoreThreshold: 0, // No threshold to get all results
			})

			const results = await tool.handler({ query: 'test query' })

			expect(results).toEqual([
				'Document 1 content',
				'Document 2 content',
				'Document 3 content',
			])
		})

		it('filters by score threshold', async() => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				scoreThreshold: 0.7,
			})

			const results = await tool.handler({ query: 'test query' })

			expect(results).toHaveLength(2)
			expect(results).toContain('Document 1 content')
			expect(results).toContain('Document 2 content')
		})

		it('uses custom formatResult function', async() => {
			const vectorStore = createMockVectorStore()
			const tool = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documentation',
				formatResult: (r: ScoredResult) => ({ text: r.content, relevance: r.score }),
			})

			const results = await tool.handler({ query: 'test query' })

			expect(results[0]).toEqual({ text: 'Document 1 content', relevance: 0.9 })
		})
	})
})
