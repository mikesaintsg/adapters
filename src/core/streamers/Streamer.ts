/**
 * Streamer Adapter
 *
 * Default token streamers implementation.
 * Allows subscribing to token events and emitting tokens to all subscribers.
 */

import type {
	StreamerAdapterInterface,
	Unsubscribe,
} from '@mikesaintsg/core'

/**
 * Internal streamer implementation.
 */
export class Streamer implements StreamerAdapterInterface {
	#listeners = new Set<(token: string) => void>()
	#ended = false

	onToken(callback: (token: string) => void): Unsubscribe {
		this.#listeners.add(callback)
		return () => {
			this.#listeners.delete(callback)
		}
	}

	emit(token: string): void {
		if (this.#ended) {
			return
		}
		for (const listener of this.#listeners) {
			listener(token)
		}
	}

	end(): void {
		this.#ended = true
		// Clear listeners to allow garbage collection
		this.#listeners.clear()
	}
}
