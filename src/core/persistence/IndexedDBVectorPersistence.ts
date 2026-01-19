/**
 * IndexedDB Vector Persistence Adapter
 *
 * Persists vector store documents and metadata to IndexedDB.
 */

import type {
	VectorStorePersistenceAdapterInterface,
	StoredDocument,
	VectorStoreMetadata,
	MinimalDatabaseAccess,
} from '@mikesaintsg/core'
import type { IndexedDBVectorPersistenceOptions } from '../../types.js'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DOCUMENTS_STORE = 'documents'
const DEFAULT_METADATA_STORE = 'metadata'
const METADATA_KEY = 'vectorstore_metadata'

// ============================================================================
// Internal Types
// ============================================================================

interface StoredDocumentRecord {
	readonly id: string
	readonly content: string
	readonly embedding: readonly number[]
	readonly metadata?: Readonly<Record<string, unknown>> | undefined
}

interface MetadataRecord {
	readonly id: string
	readonly dimensions: number
	readonly model: string
	readonly provider: string
	readonly documentCount: number
	readonly createdAt: number
	readonly updatedAt: number
}

// ============================================================================
// Implementation
// ============================================================================

class IndexedDBVectorPersistence implements VectorStorePersistenceAdapterInterface {
	#database: MinimalDatabaseAccess
	#documentsStore: string
	#metadataStore: string

	constructor(options: IndexedDBVectorPersistenceOptions) {
		this.#database = options.database
		this.#documentsStore = options.documentsStore ?? DEFAULT_DOCUMENTS_STORE
		this.#metadataStore = options.metadataStore ?? DEFAULT_METADATA_STORE
	}

	async save(docs: StoredDocument | readonly StoredDocument[]): Promise<void> {
		const documents: readonly StoredDocument[] = Array.isArray(docs) ? docs : [docs]
		const store = this.#database.store<StoredDocumentRecord>(this.#documentsStore)

		for (const doc of documents) {
			const record: StoredDocumentRecord = {
				id: doc.id,
				content: doc.content,
				embedding: Array.from(doc.embedding),
				metadata: doc.metadata,
			}
			await store.set(record, doc.id)
		}
	}

	async load(): Promise<readonly StoredDocument[]> {
		const store = this.#database.store<StoredDocumentRecord>(this.#documentsStore)
		const records = await store.all()

		return records.map((record: StoredDocumentRecord): StoredDocument => {
			const doc: StoredDocument = {
				id: record.id,
				content: record.content,
				embedding: new Float32Array(record.embedding),
			}
			if (record.metadata !== undefined) {
				return { ...doc, metadata: record.metadata }
			}
			return doc
		})
	}

	async saveMetadata(metadata: VectorStoreMetadata): Promise<void> {
		const store = this.#database.store<MetadataRecord>(this.#metadataStore)
		await store.set({
			id: METADATA_KEY,
			...metadata,
		}, METADATA_KEY)
	}

	async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
		const store = this.#database.store<MetadataRecord>(this.#metadataStore)
		const record = await store.get(METADATA_KEY)
		if (!record) {
			return undefined
		}

		return {
			dimensions: record.dimensions,
			model: record.model,
			provider: record.provider,
			documentCount: record.documentCount,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		}
	}

	async remove(ids: string | readonly string[]): Promise<void> {
		const idArray: readonly string[] = Array.isArray(ids) ? ids : [ids]
		const store = this.#database.store<StoredDocumentRecord>(this.#documentsStore)

		for (const id of idArray) {
			await store.remove(id)
		}
	}

	async clear(): Promise<void> {
		const docsStore = this.#database.store<StoredDocumentRecord>(this.#documentsStore)
		const metaStore = this.#database.store<MetadataRecord>(this.#metadataStore)
		await docsStore.clear()
		await metaStore.clear()
	}

	isAvailable(): Promise<boolean> {
		try {
			// Try to access the store - if database is available, this should work
			this.#database.store(this.#documentsStore)
			return Promise.resolve(true)
		} catch {
			return Promise.resolve(false)
		}
	}
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an IndexedDB vector persistence adapter.
 *
 * @example
 * ```ts
 * const persistence = createIndexedDBVectorPersistenceAdapter({
 *   database: myDatabaseAccess,
 *   documentsStore: 'documents',
 *   metadataStore: 'metadata',
 * })
 *
 * await persistence.save([{ id: '1', content: 'Hello', embedding: new Float32Array([0.1, 0.2]) }])
 * const docs = await persistence.load()
 * ```
 */
export function createIndexedDBVectorPersistenceAdapter(
	options: IndexedDBVectorPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	return new IndexedDBVectorPersistence(options)
}
