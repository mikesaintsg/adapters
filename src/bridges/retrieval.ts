/**
 * @mikesaintsg/adapters
 *
 * Retrieval Tool Factory - creates a tool for querying VectorStore.
 * Generates a tool schema and execute function for use with tool registries.
 */

import type {
	RetrievalToolOptions,
	RetrievalToolResult,
	SearchResult,
} from '../types.js'
import type { ToolSchema } from '@mikesaintsg/core'

/** Default topK for retrieval */
const DEFAULT_TOP_K = 5

/** Default minimum similarity score */
const DEFAULT_MIN_SCORE = 0.7

/**
 * Create a retrieval tool for querying a VectorStore.
 *
 * @param options - Retrieval tool configuration
 * @returns A tool schema and execute function
 *
 * @example
 * ```ts
 * const { schema, execute } = createRetrievalTool({
 *   vectorStore: myVectorStore,
 *   name: 'search_docs',
 *   description: 'Search technical documentation',
 *   topK: 10,
 *   minScore: 0.8,
 * })
 *
 * // Register with tool registry
 * registry.register(schema, execute)
 *
 * // Or use directly
 * const results = await execute({ query: 'how to configure logging' })
 * ```
 */
export function createRetrievalTool(
	options: RetrievalToolOptions,
): RetrievalToolResult {
	const {
		vectorStore,
		name,
		description,
		topK = DEFAULT_TOP_K,
		minScore = DEFAULT_MIN_SCORE,
		formatResult,
	} = options

	// Create the tool schema
	const schema: ToolSchema = {
		name,
		description,
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query to find relevant documents',
				},
			},
			required: ['query'],
		},
	}

	// Create the execute function
	async function execute(params: { readonly query: string }): Promise<readonly SearchResult[]> {
		const { query } = params

		// Search the vector store
		const results = await vectorStore.search(query, {
			topK,
			minScore,
		})

		// Apply custom formatting if provided
		if (formatResult) {
			return results.map(result => {
				const formatted = formatResult(result)
				return {
					...result,
					content: typeof formatted === 'string' ? formatted : JSON.stringify(formatted),
				}
			})
		}

		return results
	}

	return {
		schema,
		execute,
	}
}
