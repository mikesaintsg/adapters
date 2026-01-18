/**
 * @mikesaintsg/adapters
 *
 * Helper functions and type guards.
 */

// ============================================================================
// Content Hashing Helpers
// ============================================================================

import type { ContentHash, Embedding, Message, StoredDocument } from '@mikesaintsg/core'
import type { NodeLlamaCppChatHistoryItem } from './types.js'

/**
 * Compute a SHA-256 content hash for text.
 *
 * @param text - The text to hash
 * @returns A hex string content hash
 *
 * @example
 * ```ts
 * const hash = await computeContentHash('Hello, world!')
 * // hash = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
 * ```
 */
export async function computeContentHash(text: string): Promise<ContentHash> {
	const encoder = new TextEncoder()
	const data = encoder.encode(text)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================================
// Document Serialization Helpers
// ============================================================================

/**
 * Serialize a stored document for JSON storage.
 * Converts Float32Array embeddings to regular arrays.
 *
 * @param doc - The document to serialize
 * @returns A plain object suitable for JSON.stringify
 *
 * @example
 * ```ts
 * const serialized = serializeStoredDocument(doc)
 * const json = JSON.stringify(serialized)
 * ```
 */
export function serializeStoredDocument(doc: StoredDocument): Record<string, unknown> {
	return {
		...doc,
		embedding: Array.from(doc.embedding),
	}
}

/**
 * Deserialize a stored document from JSON storage.
 * Converts array embeddings back to Float32Array.
 *
 * @param data - The plain object from JSON.parse
 * @returns A StoredDocument with proper Float32Array embedding
 *
 * @example
 * ```ts
 * const data = JSON.parse(json)
 * const doc = deserializeStoredDocument(data)
 * ```
 */
export function deserializeStoredDocument(data: Record<string, unknown>): StoredDocument {
	const embedding = data.embedding
	return {
		...data,
		embedding: new Float32Array(embedding as number[]),
	} as StoredDocument
}

// ============================================================================
// Embedding Helpers
// ============================================================================

/**
 * Estimate the byte size of an embedding.
 *
 * @param embedding - The embedding to measure
 * @returns The byte length of the embedding
 */
export function estimateEmbeddingBytes(embedding: Embedding): number {
	return embedding.byteLength
}

// ============================================================================
// Iterator Helpers
// ============================================================================

/**
 * Create a done iterator result for async iterators.
 * This helper provides a type-safe way to signal iteration completion.
 *
 * @returns An IteratorResult indicating completion
 *
 * @example
 * ```ts
 * if (iteratorDone) {
 *   return Promise.resolve(createDoneIteratorResult<string>())
 * }
 * ```
 */
export function createDoneIteratorResult<T>(): IteratorResult<T> {
	return { value: undefined as unknown as T, done: true }
}

// ============================================================================
// node-llama-cpp Message Conversion Helpers
// ============================================================================

/**
 * Convert Message array to node-llama-cpp chat history format.
 *
 * @param messages - The messages to convert
 * @returns Array of NodeLlamaCppChatHistoryItem
 *
 * @example
 * ```ts
 * const chatHistory = convertMessagesToChatHistory([
 *   { id: '1', role: 'user', content: 'Hello', createdAt: Date.now() }
 * ])
 * ```
 */
export function convertMessagesToChatHistory(
	messages: readonly Message[],
): NodeLlamaCppChatHistoryItem[] {
	const history: NodeLlamaCppChatHistoryItem[] = []

	for (const msg of messages) {
		const content = typeof msg.content === 'string' ? msg.content : ''

		switch (msg.role) {
			case 'system':
				history.push({ type: 'system', text: content })
				break
			case 'user':
				history.push({ type: 'user', text: content })
				break
			case 'assistant':
				history.push({ type: 'model', response: [content] })
				break
			// Tool messages are handled differently - skip for now
		}
	}

	return history
}
