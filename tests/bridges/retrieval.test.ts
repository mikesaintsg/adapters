/**
 * @mikesaintsg/adapters
 *
 * Tests for Retrieval Tool Factory.
 */

import { describe, it, expect, vi } from 'vitest'
import { createRetrievalTool } from '../../src/bridges/retrieval.js'
import type { VectorStoreInterface, SearchResult } from '../../src/types.js'

// Helper to create a mock vector store
function createMockVectorStore(results: SearchResult[] = []): VectorStoreInterface {
	return {
		search: vi.fn().mockResolvedValue(results),
	}
}

describe('createRetrievalTool', () => {
	describe('factory', () => {
		it('creates a retrieval tool with schema and execute function', () => {
			const vectorStore = createMockVectorStore()
			const { schema, execute } = createRetrievalTool({
				vectorStore,
				name: 'search_docs',
				description: 'Search documents',
			})

			expect(schema).toBeDefined()
			expect(schema.name).toBe('search_docs')
			expect(schema.description).toBe('Search documents')
			expect(execute).toBeTypeOf('function')
		})

		it('generates correct tool schema', () => {
			const vectorStore = createMockVectorStore()
			const { schema } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search for relevant content',
			})

			expect(schema.parameters).toEqual({
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'The search query to find relevant documents',
					},
				},
				required: ['query'],
			})
		})
	})

	describe('execute', () => {
		it('calls vector store search with query', async() => {
			const vectorStore = createMockVectorStore([])
			const { execute } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search',
			})

			await execute({ query: 'test query' })

			expect(vectorStore.search).toHaveBeenCalledWith('test query', {
				topK: 5,
				minScore: 0.7,
			})
		})

		it('uses custom topK and minScore', async() => {
			const vectorStore = createMockVectorStore([])
			const { execute } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search',
				topK: 10,
				minScore: 0.8,
			})

			await execute({ query: 'test' })

			expect(vectorStore.search).toHaveBeenCalledWith('test', {
				topK: 10,
				minScore: 0.8,
			})
		})

		it('returns search results', async() => {
			const mockResults: SearchResult[] = [
				{ id: 'doc1', content: 'First result', score: 0.9 },
				{ id: 'doc2', content: 'Second result', score: 0.85 },
			]
			const vectorStore = createMockVectorStore(mockResults)
			const { execute } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search',
			})

			const results = await execute({ query: 'test' })

			expect(results).toEqual(mockResults)
		})

		it('applies formatResult to results', async() => {
			const mockResults: SearchResult[] = [
				{ id: 'doc1', content: 'Content 1', score: 0.9, metadata: { source: 'wiki' } },
			]
			const vectorStore = createMockVectorStore(mockResults)
			const { execute } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search',
				formatResult: (result) => `[${result.id}] ${result.content}`,
			})

			const results = await execute({ query: 'test' })

			expect(results[0]?.content).toBe('[doc1] Content 1')
		})

		it('returns empty array when no results', async() => {
			const vectorStore = createMockVectorStore([])
			const { execute } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search',
			})

			const results = await execute({ query: 'nothing' })

			expect(results).toEqual([])
		})
	})

	describe('default values', () => {
		it('uses default topK of 5', async() => {
			const vectorStore = createMockVectorStore([])
			const { execute } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search',
			})

			await execute({ query: 'test' })

			expect(vectorStore.search).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ topK: 5 }),
			)
		})

		it('uses default minScore of 0.7', async() => {
			const vectorStore = createMockVectorStore([])
			const { execute } = createRetrievalTool({
				vectorStore,
				name: 'search',
				description: 'Search',
			})

			await execute({ query: 'test' })

			expect(vectorStore.search).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ minScore: 0.7 }),
			)
		})
	})
})
