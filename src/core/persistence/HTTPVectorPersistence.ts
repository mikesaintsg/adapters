/**
 * HTTP Vector Persistence Adapter
 *
 * Persists vector store documents and metadata to a remote HTTP API.
 */

import type {
	VectorStorePersistenceAdapterInterface,
	StoredDocument,
	VectorStoreMetadata,
} from '@mikesaintsg/core'
import type { HTTPVectorPersistenceOptions } from '../../types.js'
import { createAdapterError } from '../../helpers.js'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT = 30000

// ============================================================================
// Internal Types
// ============================================================================

interface StoredDocumentRecord {
	readonly id: string
	readonly content: string
	readonly embedding: readonly number[]
	readonly metadata?: Readonly<Record<string, unknown>> | undefined
}

// ============================================================================
// Implementation
// ============================================================================

class HTTPVectorPersistence implements VectorStorePersistenceAdapterInterface {
	#baseURL: string
	#headers: Record<string, string>
	#timeout: number

	constructor(options: HTTPVectorPersistenceOptions) {
		this.#baseURL = options.baseURL.replace(/\/$/, '') // Remove trailing slash
		this.#headers = {
			'Content-Type': 'application/json',
			...(options.headers ?? {}),
		}
		this.#timeout = options.timeout ?? DEFAULT_TIMEOUT
	}

	async save(docs: StoredDocument | readonly StoredDocument[]): Promise<void> {
		const documents: readonly StoredDocument[] = Array.isArray(docs) ? docs : [docs]
		const serialized: StoredDocumentRecord[] = documents.map((doc: StoredDocument) => ({
			id: doc.id,
			content: doc.content,
			embedding: Array.from(doc.embedding),
			metadata: doc.metadata,
		}))

		const response = await this.#fetch(`${this.#baseURL}/documents`, {
			method: 'PUT',
			body: JSON.stringify(serialized),
		})

		if (!response.ok) {
			throw createAdapterError(
				'SERVICE_ERROR',
				`Failed to save documents: ${response.status} ${response.statusText}`,
			)
		}
	}

	async load(): Promise<readonly StoredDocument[]> {
		const response = await this.#fetch(`${this.#baseURL}/documents`, {
			method: 'GET',
		})

		if (!response.ok) {
			if (response.status === 404) {
				return []
			}
			throw createAdapterError(
				'SERVICE_ERROR',
				`Failed to load documents: ${response.status} ${response.statusText}`,
			)
		}

		const records: StoredDocumentRecord[] = (await response.json()) as StoredDocumentRecord[]

		return records.map((record: StoredDocumentRecord): StoredDocument => {
			const parsedDoc: StoredDocument = {
				id: record.id,
				content: record.content,
				embedding: new Float32Array(record.embedding),
			}
			if (record.metadata !== undefined) {
				return { ...parsedDoc, metadata: record.metadata }
			}
			return parsedDoc
		})
	}

	async saveMetadata(metadata: VectorStoreMetadata): Promise<void> {
		const response = await this.#fetch(`${this.#baseURL}/metadata`, {
			method: 'PUT',
			body: JSON.stringify(metadata),
		})

		if (!response.ok) {
			throw createAdapterError(
				'SERVICE_ERROR',
				`Failed to save metadata: ${response.status} ${response.statusText}`,
			)
		}
	}

	async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
		const response = await this.#fetch(`${this.#baseURL}/metadata`, {
			method: 'GET',
		})

		if (!response.ok) {
			if (response.status === 404) {
				return undefined
			}
			throw createAdapterError(
				'SERVICE_ERROR',
				`Failed to load metadata: ${response.status} ${response.statusText}`,
			)
		}

		return (await response.json()) as VectorStoreMetadata
	}

	async remove(ids: string | readonly string[]): Promise<void> {
		const idArray = Array.isArray(ids) ? ids : [ids]

		const response = await this.#fetch(`${this.#baseURL}/documents`, {
			method: 'DELETE',
			body: JSON.stringify({ ids: idArray }),
		})

		if (!response.ok && response.status !== 404) {
			throw createAdapterError(
				'SERVICE_ERROR',
				`Failed to remove documents: ${response.status} ${response.statusText}`,
			)
		}
	}

	async clear(): Promise<void> {
		const response = await this.#fetch(`${this.#baseURL}/documents`, {
			method: 'DELETE',
		})

		if (!response.ok && response.status !== 404) {
			throw createAdapterError(
				'SERVICE_ERROR',
				`Failed to clear documents: ${response.status} ${response.statusText}`,
			)
		}

		const metaResponse = await this.#fetch(`${this.#baseURL}/metadata`, {
			method: 'DELETE',
		})

		if (!metaResponse.ok && metaResponse.status !== 404) {
			throw createAdapterError(
				'SERVICE_ERROR',
				`Failed to clear metadata: ${metaResponse.status} ${metaResponse.statusText}`,
			)
		}
	}

	async isAvailable(): Promise<boolean> {
		try {
			const response = await this.#fetch(`${this.#baseURL}/health`, {
				method: 'GET',
			})
			return response.ok
		} catch {
			return false
		}
	}

	async #fetch(url: string, init: RequestInit): Promise<Response> {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.#timeout)

		try {
			return await fetch(url, {
				...init,
				headers: this.#headers,
				signal: controller.signal,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw createAdapterError('TIMEOUT_ERROR', `Request timed out after ${this.#timeout}ms`)
			}
			throw createAdapterError(
				'NETWORK_ERROR',
				error instanceof Error ? error.message : 'Network request failed',
			)
		} finally {
			clearTimeout(timeoutId)
		}
	}
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an HTTP vector persistence adapter.
 *
 * Persists vector store data to a remote HTTP API.
 * Expects endpoints:
 * - PUT /documents - Save documents
 * - GET /documents - Load documents
 * - DELETE /documents - Clear/remove documents
 * - PUT /metadata - Save metadata
 * - GET /metadata - Load metadata
 * - DELETE /metadata - Clear metadata
 * - GET /health - Health check
 *
 * @example
 * ```ts
 * const persistence = createHTTPVectorPersistenceAdapter({
 *   baseURL: 'https://api.example.com/vectorstore',
 *   headers: { 'Authorization': 'Bearer token' },
 * })
 *
 * await persistence.save([{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) }])
 * const docs = await persistence.load()
 * ```
 */
export function createHTTPVectorPersistenceAdapter(
	options: HTTPVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	return new HTTPVectorPersistence(options)
}
