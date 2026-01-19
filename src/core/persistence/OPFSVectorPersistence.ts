/**
 * OPFS Vector Persistence Adapter
 *
 * Persists vector store documents and metadata to the Origin Private File System.
 * Uses chunked storage for large datasets.
 */

import type {
	VectorStorePersistenceAdapterInterface,
	StoredDocument,
	VectorStoreMetadata,
	MinimalDirectoryAccess,
} from '@mikesaintsg/core'
import type { OPFSVectorPersistenceOptions } from '../../types.js'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CHUNK_SIZE = 100
const METADATA_FILE = 'metadata.json'
const DOCUMENTS_PREFIX = 'documents_'

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

class OPFSVectorPersistence implements VectorStorePersistenceAdapterInterface {
	#directory: MinimalDirectoryAccess
	#chunkSize: number

	constructor(options: OPFSVectorPersistenceOptions) {
		this.#directory = options.directory
		this.#chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
	}

	async save(docs: StoredDocument | readonly StoredDocument[]): Promise<void> {
		const documents: readonly StoredDocument[] = Array.isArray(docs) ? docs : [docs]

		// Clear existing document files
		const files = await this.#directory.listFiles()
		for (const file of files) {
			const name = file.getName()
			if (name.startsWith(DOCUMENTS_PREFIX)) {
				await this.#directory.removeFile(name)
			}
		}

		// Chunk and save documents
		const chunks = this.#chunkArray(documents, this.#chunkSize)

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i]
			if (!chunk) continue

			const serialized: StoredDocumentRecord[] = chunk.map((doc: StoredDocument) => ({
				id: doc.id,
				content: doc.content,
				embedding: Array.from(doc.embedding),
				metadata: doc.metadata,
			}))

			const fileName = `${DOCUMENTS_PREFIX}${i.toString().padStart(6, '0')}.json`
			const file = await this.#directory.createFile(fileName)
			await file.write(JSON.stringify(serialized))
		}
	}

	async load(): Promise<readonly StoredDocument[]> {
		const files = await this.#directory.listFiles()
		const documentFiles = files
			.filter((file) => file.getName().startsWith(DOCUMENTS_PREFIX))
			.sort((a, b) => a.getName().localeCompare(b.getName()))

		const allDocuments: StoredDocument[] = []

		for (const file of documentFiles) {
			const content = await file.getText()
			const records: StoredDocumentRecord[] = JSON.parse(content) as StoredDocumentRecord[]

			for (const record of records) {
				const parsedDoc: StoredDocument = {
					id: record.id,
					content: record.content,
					embedding: new Float32Array(record.embedding),
				}
				if (record.metadata !== undefined) {
					allDocuments.push({ ...parsedDoc, metadata: record.metadata })
				} else {
					allDocuments.push(parsedDoc)
				}
			}
		}

		return allDocuments
	}

	async saveMetadata(metadata: VectorStoreMetadata): Promise<void> {
		// Remove existing metadata file if exists
		if (await this.#directory.hasFile(METADATA_FILE)) {
			await this.#directory.removeFile(METADATA_FILE)
		}
		const file = await this.#directory.createFile(METADATA_FILE)
		await file.write(JSON.stringify(metadata))
	}

	async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
		const file = await this.#directory.getFile(METADATA_FILE)
		if (!file) {
			return undefined
		}

		try {
			const content = await file.getText()
			return JSON.parse(content) as VectorStoreMetadata
		} catch {
			return undefined
		}
	}

	async remove(ids: string | readonly string[]): Promise<void> {
		const idArray = new Set(Array.isArray(ids) ? ids : [ids])

		// Load all documents, filter, and save back
		const allDocs = await this.load()
		const remaining = allDocs.filter((doc) => !idArray.has(doc.id))
		await this.save(remaining)
	}

	async clear(): Promise<void> {
		const files = await this.#directory.listFiles()
		for (const file of files) {
			await this.#directory.removeFile(file.getName())
		}
	}

	async isAvailable(): Promise<boolean> {
		try {
			await this.#directory.listFiles()
			return true
		} catch {
			return false
		}
	}

	#chunkArray<T>(array: readonly T[], size: number): T[][] {
		const chunks: T[][] = []
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size))
		}
		return chunks
	}
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an OPFS vector persistence adapter.
 *
 * Uses the Origin Private File System for persistent storage.
 * Chunks documents for efficient storage and retrieval of large datasets.
 *
 * @example
 * ```ts
 * const persistence = createOPFSVectorPersistenceAdapter({
 *   directory: myDirectoryAccess,
 *   chunkSize: 100,
 * })
 *
 * await persistence.save([{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) }])
 * const docs = await persistence.load()
 * ```
 */
export function createOPFSVectorPersistenceAdapter(
	options: OPFSVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	return new OPFSVectorPersistence(options)
}
