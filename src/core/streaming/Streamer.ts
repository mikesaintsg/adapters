/**
 * Streamer Adapter
 *
 * Default token streaming implementation.
 * Allows subscribing to token events and emitting tokens to all subscribers.
 */

import type {
	StreamerAdapterInterface,
	Unsubscribe,
} from '../../types.js'

/**
 * Create a streamer adapter for token emission.
 *
 * @returns A streamer adapter instance
 *
 * @example
 * ```ts
 * const streamer = createStreamerAdapter()
 * const unsub = streamer.onToken((token) => console.log(token))
 * streamer.emit('Hello')
 * streamer.emit(' world')
 * streamer.end()
 * unsub()
 * ```
 */
export function createStreamerAdapter(): StreamerAdapterInterface {
	return new Streamer()
}

/**
 * Internal streamer implementation.
 */
class Streamer implements StreamerAdapterInterface {
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
