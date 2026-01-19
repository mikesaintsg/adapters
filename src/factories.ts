import type {
	CreateStreamerAdapter,
	CreateTextStreamerAdapter,
	StreamerEmitterInterface,
	TextStreamerAdapterInterface,
	TextStreamerAdapterOptions,
} from './types.js'
import { StreamerAdapter } from './core/streaming/StreamerAdapter.js'
import { TextStreamerAdapter } from './core/streaming/TextStreamerAdapter.js'

/**
 * Creates a StreamerAdapter for token streaming.
 *
 * @returns A StreamerEmitterInterface instance
 * @example
 * ```ts
 * const streamer = createStreamerAdapter()
 * streamer.onToken((token) => console.log(token))
 * streamer.emit('Hello')
 * streamer.emit(' world!')
 * streamer.end()
 * ```
 */
export const createStreamerAdapter: CreateStreamerAdapter = (): StreamerEmitterInterface => {
	return new StreamerAdapter()
}

/**
 * Creates a TextStreamerAdapter for HuggingFace Transformers streaming.
 *
 * @param options - TextStreamerAdapter options with streamerClass and tokenizer
 * @returns A TextStreamerAdapterInterface instance
 * @example
 * ```ts
 * import { pipeline, TextStreamer } from '@huggingface/transformers'
 *
 * const generator = await pipeline('text-generation', 'Xenova/gpt2')
 * const adapter = createTextStreamerAdapter({
 *   streamerClass: TextStreamer,
 *   tokenizer: generator.tokenizer,
 * })
 *
 * adapter.onToken((token) => console.log(token))
 * // Pass adapter.getStreamer() to model.generate()
 * ```
 */
export const createTextStreamerAdapter: CreateTextStreamerAdapter = (
	options: TextStreamerAdapterOptions,
): TextStreamerAdapterInterface => {
	return new TextStreamerAdapter(options)
}
