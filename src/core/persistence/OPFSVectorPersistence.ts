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
import type { OPFSVectorPersistenceOptions, StoredDocumentRecord } from '../../types.js'
import {
	DEFAULT_OPFS_CHUNK_SIZE,
	DEFAULT_OPFS_METADATA_FILE,
	DEFAULT_OPFS_DOCUMENTS_PREFIX,
} from '../../constants.js'
import { chunkArray } from '../../helpers.js'

// ============================================================================
// Implementation
// ============================================================================

export class OPFSVectorPersistence implements VectorStorePersistenceAdapterInterface {
	#directory: MinimalDirectoryAccess
	#chunkSize: number

	constructor(options: OPFSVectorPersistenceOptions) {
		this.#directory = options.directory
		this.#chunkSize = options.chunkSize ?? DEFAULT_OPFS_CHUNK_SIZE
	}

	async save(docs: StoredDocument | readonly StoredDocument[]): Promise<void> {
		const documents: readonly StoredDocument[] = Array.isArray(docs) ? docs : [docs]

		// Clear existing document files
		const files = await this.#directory.listFiles()
		for (const file of files) {
			const name = file.getName()
			if (name.startsWith(DEFAULT_OPFS_DOCUMENTS_PREFIX)) {
				await this.#directory.removeFile(name)
			}
		}

		// Chunk and save documents
		const chunks = chunkArray(documents, this.#chunkSize)

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i]
			if (!chunk) continue

			const serialized: StoredDocumentRecord[] = chunk.map((doc: StoredDocument) => ({
				id: doc.id,
				content: doc.content,
				embedding: Array.from(doc.embedding),
				metadata: doc.metadata,
			}))

			const fileName = `${DEFAULT_OPFS_DOCUMENTS_PREFIX}${i.toString().padStart(6, '0')}.json`
			const file = await this.#directory.createFile(fileName)
			await file.write(JSON.stringify(serialized))
		}
	}

	async load(): Promise<readonly StoredDocument[]> {
		const files = await this.#directory.listFiles()
		const documentFiles = files
			.filter((file) => file.getName().startsWith(DEFAULT_OPFS_DOCUMENTS_PREFIX))
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
		if (await this.#directory.hasFile(DEFAULT_OPFS_METADATA_FILE)) {
			await this.#directory.removeFile(DEFAULT_OPFS_METADATA_FILE)
		}
		const file = await this.#directory.createFile(DEFAULT_OPFS_METADATA_FILE)
		await file.write(JSON.stringify(metadata))
	}

	async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
		const file = await this.#directory.getFile(DEFAULT_OPFS_METADATA_FILE)
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
}
