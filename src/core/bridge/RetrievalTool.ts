/**
 * Retrieval Tool Adapter
 *
 * Creates a tool that queries a vector store for RAG patterns.
 */

import type {
	RetrievalToolInterface,
	RetrievalToolOptions,
	ToolSchema,
	ScoredResult,
} from '@mikesaintsg/core'

/**
 * Creates a Retrieval Tool adapter
 *
 * Generates a tool schema and handler that queries a vector store.
 * Useful for RAG (Retrieval-Augmented Generation) patterns.
 *
 * @param options - Retrieval tool configuration
 * @returns RetrievalToolInterface with schema and handler
 *
 * @example
 * ```ts
 * const retrievalTool = createRetrievalTool({
 *   vectorStore: myVectorStore,
 *   name: 'search_docs',
 *   description: 'Search documentation for relevant information',
 *   defaultLimit: 5,
 *   scoreThreshold: 0.7,
 * })
 *
 * // Register with tool registry
 * toolRegistry.register(retrievalTool.schema, retrievalTool.handler)
 * ```
 */
export function createRetrievalTool(
	options: RetrievalToolOptions,
): RetrievalToolInterface {
	const {
		vectorStore,
		name,
		description,
		defaultLimit = 5,
		scoreThreshold = 0.7,
		formatResult,
	} = options

	const schema: ToolSchema = {
		name,
		description,
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query',
				},
				limit: {
					type: 'number',
					description: 'Maximum number of results',
				},
			},
			required: ['query'],
		},
	}

	const handler = async(
		args: Readonly<Record<string, unknown>>,
	): Promise<readonly unknown[]> => {
		const query = args.query as string
		const limit = (args.limit as number) ?? defaultLimit

		const results = await vectorStore.search(query, {
			limit,
		})

		// Filter by score threshold if provided
		const filtered = scoreThreshold !== undefined
			? results.filter((r: ScoredResult) => r.score >= scoreThreshold)
			: results

		if (formatResult) {
			return filtered.map((result: ScoredResult) => formatResult(result))
		}

		return filtered.map((r: ScoredResult) => r.content)
	}

	return { schema, handler }
}
