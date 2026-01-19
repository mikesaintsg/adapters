import type {
	HuggingFaceBaseStreamer,
	TextStreamerAdapterInterface,
	TextStreamerAdapterOptions,
} from '../../types.js'
import { StreamerAdapter } from './StreamerAdapter.js'

/**
 * HuggingFace-specific TextStreamer adapter.
 * Wraps @huggingface/transformers TextStreamer to emit tokens via StreamerAdapterInterface.
 */
export class TextStreamerAdapter extends StreamerAdapter implements TextStreamerAdapterInterface {
	#streamer: HuggingFaceBaseStreamer | undefined

	constructor(options: TextStreamerAdapterOptions) {
		super()
		// Create HF TextStreamer with callback that emits to StreamerAdapter
		this.#streamer = new options.streamerClass(options.tokenizer, {
			skip_prompt: true,
			callback_function: (token: string) => this.emit(token),
		})
	}

	getStreamer(): HuggingFaceBaseStreamer | undefined {
		return this.#streamer
	}
}
