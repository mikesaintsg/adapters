/**
 * IndexedDB Weight Persistence Adapter
 *
 * Persists ActionLoop predictive graph weights to IndexedDB.
 */

import type {
	WeightPersistenceAdapterInterface,
	ExportedPredictiveGraph,
	MinimalStoreAccess,
} from '@mikesaintsg/core'

import type { IndexedDBWeightPersistenceOptions, ActionLoopStoredWeightRecord } from '../../types.js'
import {
	DEFAULT_ACTIONLOOP_WEIGHT_STORE,
} from '../../constants.js'

/**
 * IndexedDB weight persistence adapter implementation.
 * Stores ActionLoop predictive graph weights in IndexedDB.
 */
export class IndexedDBWeightPersistence implements WeightPersistenceAdapterInterface {
	readonly #store: MinimalStoreAccess<ActionLoopStoredWeightRecord>

	constructor(options: IndexedDBWeightPersistenceOptions) {
		const storeName = options.storeName ?? DEFAULT_ACTIONLOOP_WEIGHT_STORE
		this.#store = options.database.store<ActionLoopStoredWeightRecord>(storeName)
	}

	isAvailable(): Promise<boolean> {
		return Promise.resolve(true)
	}

	async save(weights: ExportedPredictiveGraph): Promise<void> {
		const record: ActionLoopStoredWeightRecord = {
			modelId: weights.modelId,
			data: weights,
		}
		await this.#store.set(record, weights.modelId)
	}

	async load(modelId: string): Promise<ExportedPredictiveGraph | undefined> {
		const record = await this.#store.get(modelId)
		return record?.data
	}

	async has(modelId: string): Promise<boolean> {
		const record = await this.#store.get(modelId)
		return record !== undefined
	}

	async delete(modelId: string): Promise<void> {
		await this.#store.remove(modelId)
	}

	async list(): Promise<readonly string[]> {
		const all = await this.#store.all()
		return all.map((record) => record.modelId)
	}

	async clear(): Promise<void> {
		await this.#store.clear()
	}

	async destroy(): Promise<void> {
		await this.#store.clear()
	}
}
