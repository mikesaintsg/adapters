import type { Unsubscribe } from '@mikesaintsg/core'
import type { StreamerEmitterInterface } from '../../types.js'

/**
 * Base streaming adapter for token emission.
 * Provides a standardized way to emit and receive tokens during generation.
 */
export class StreamerAdapter implements StreamerEmitterInterface {
	#listeners = new Set<(token: string) => void>()
	#ended = false

	onToken(callback: (token: string) => void): Unsubscribe {
		this.#listeners.add(callback)
		return () => this.#listeners.delete(callback)
	}

	emit(token: string): void {
		if (this.#ended) return
		for (const listener of this.#listeners) {
			listener(token)
		}
	}

	end(): void {
		this.#ended = true
		this.#listeners.clear()
	}

	supportsStreaming(): boolean {
		return true
	}
}
