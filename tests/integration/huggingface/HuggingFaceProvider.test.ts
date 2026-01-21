/**
 * HuggingFace Provider Adapter Integration Tests
 *
 * Tests the provider adapter directly without inference engine.
 * Uses Xenova/distilgpt2 - the smallest viable text generation model.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { ProviderAdapterInterface } from '@mikesaintsg/core'
import type { HuggingFaceTextGenerationPipeline } from '@mikesaintsg/adapters'
import {
	loadTextGenerationPipeline,
	createProvider,
	createMessage,
	HF_TEST_TIMEOUTS,
	HUGGINGFACE_CONFIG,
} from './setup.js'

// Module-level state
let textPipeline: HuggingFaceTextGenerationPipeline | undefined
let provider: ProviderAdapterInterface | undefined

beforeAll(async() => {
	console.log('[Provider Test] Loading text generation model...')
	textPipeline = await loadTextGenerationPipeline()
	provider = createProvider(textPipeline)
	console.log('[Provider Test] Ready')
}, HF_TEST_TIMEOUTS.modelLoad)

afterAll(async() => {
	console.log('[Provider Test] Disposing...')
	if (textPipeline?.dispose) {
		await textPipeline.dispose()
	}
	textPipeline = undefined
	provider = undefined
	console.log('[Provider Test] Cleanup complete')
})

function getProvider(): ProviderAdapterInterface {
	if (provider === undefined) {
		throw new Error('Provider not initialized')
	}
	return provider
}

describe('HuggingFaceProvider', () => {
	// =========================================================================
	// Basic Generation
	// =========================================================================

	describe('generate', () => {
		it('generates text from a simple prompt', async() => {
			const p = getProvider()
			const messages = [createMessage('Hello')]

			const handle = p.generate(messages, { maxTokens: 20 })
			const result = await handle.result()

			expect(result.text).toBeDefined()
			expect(typeof result.text).toBe('string')
			expect(result.aborted).toBe(false)
		}, HF_TEST_TIMEOUTS.generation)

		it('respects maxTokens limit', async() => {
			const p = getProvider()
			const messages = [createMessage('Write a long story')]

			const handle = p.generate(messages, { maxTokens: 5 })
			const result = await handle.result()

			expect(result.text).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles empty prompt', async() => {
			const p = getProvider()
			const messages = [createMessage('')]

			const handle = p.generate(messages, { maxTokens: 10 })
			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)

		it('handles unicode input', async() => {
			const p = getProvider()
			const messages = [createMessage('你好')]

			const handle = p.generate(messages, { maxTokens: 10 })
			const result = await handle.result()

			expect(result.text).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)
	})

	// =========================================================================
	// Streaming
	// =========================================================================

	describe('streaming', () => {
		it('completes streaming without hanging', async() => {
			const p = getProvider()
			const messages = [createMessage('Count: 1, 2')]

			const handle = p.generate(messages, { maxTokens: 15 })
			const result = await handle.result()

			expect(result.text).toBeDefined()
			expect(result.aborted).toBe(false)
		}, HF_TEST_TIMEOUTS.generation)

		it('can abort generation', async() => {
			const p = getProvider()
			const messages = [createMessage('Write a very long essay')]

			const handle = p.generate(messages, { maxTokens: 200 })

			// Abort after a short delay
			setTimeout(() => handle.abort(), 50)

			const result = await handle.result()

			expect(result).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)
	})

	// =========================================================================
	// Capabilities
	// =========================================================================

	describe('capabilities', () => {
		it('reports supportsTools as false', () => {
			const p = getProvider()
			expect(p.supportsTools()).toBe(false)
		})

		it('reports supportsStreaming as true', () => {
			const p = getProvider()
			expect(p.supportsStreaming()).toBe(true)
		})

		it('returns valid capabilities object', () => {
			const p = getProvider()
			const caps = p.getCapabilities()

			expect(caps.supportsTools).toBe(false)
			expect(caps.supportsStreaming).toBe(true)
			expect(caps.supportsVision).toBe(false)
			expect(caps.supportsFunctions).toBe(false)
			expect(caps.models).toContain(HUGGINGFACE_CONFIG.textModel)
		})

		it('generates unique IDs', () => {
			const p = getProvider()
			const id = p.getId()

			expect(typeof id).toBe('string')
			expect(id.length).toBeGreaterThan(0)
		})
	})

	// =========================================================================
	// Multiple Messages
	// =========================================================================

	describe('multi-turn', () => {
		it('handles multiple messages', async() => {
			const p = getProvider()
			const messages = [
				createMessage('You are helpful.', 'system'),
				createMessage('Hi', 'user'),
				createMessage('Hello!', 'assistant'),
				createMessage('How are you?', 'user'),
			]

			const handle = p.generate(messages, { maxTokens: 20 })
			const result = await handle.result()

			expect(result.text).toBeDefined()
		}, HF_TEST_TIMEOUTS.generation)
	})
})
