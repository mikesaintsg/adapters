/**
 * In-Memory Weight Persistence Adapter
 *
 * Stores ActionLoop predictive graph weights in memory.
 * Useful for testing or when persistence is not required.
 */

import type {
	WeightPersistenceAdapterInterface,
	ExportedPredictiveGraph,
} from '@mikesaintsg/core'

/**
 * In-memory weight persistence adapter implementation.
 * Stores ActionLoop predictive graph weights in a Map.
 */
export class InMemoryWeightPersistence implements WeightPersistenceAdapterInterface {
	readonly #weights = new Map<string, ExportedPredictiveGraph>()

	isAvailable(): Promise<boolean> {
		return Promise.resolve(true)
	}

	save(weights: ExportedPredictiveGraph): Promise<void> {
		this.#weights.set(weights.modelId, weights)
		return Promise.resolve()
	}

	load(modelId: string): Promise<ExportedPredictiveGraph | undefined> {
		return Promise.resolve(this.#weights.get(modelId))
	}

	has(modelId: string): Promise<boolean> {
		return Promise.resolve(this.#weights.has(modelId))
	}

	delete(modelId: string): Promise<void> {
		this.#weights.delete(modelId)
		return Promise.resolve()
	}

	list(): Promise<readonly string[]> {
		return Promise.resolve(Array.from(this.#weights.keys()))
	}

	clear(): Promise<void> {
		this.#weights.clear()
		return Promise.resolve()
	}

	destroy(): Promise<void> {
		this.#weights.clear()
		return Promise.resolve()
	}
}
