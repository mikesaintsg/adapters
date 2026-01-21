/**
 * HuggingFace Qwen Tool Calling Integration Tests
 *
 * Tests tool calling capability detection and parsing with Qwen models.
 *
 * Note: Full generation tests are skipped due to browser memory constraints.
 * The Qwen 0.5B models are too large for reliable browser-based testing.
 * Tool calling generation should be tested via Ollama integration tests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { ProviderAdapterInterface } from '@mikesaintsg/core'
import type { HuggingFaceTextGenerationPipeline } from '@mikesaintsg/adapters'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
import {
	loadToolModelPipeline,
	HF_TEST_TIMEOUTS,
	HUGGINGFACE_CONFIG,
} from './setup.js'

// Module-level state
let toolPipeline: HuggingFaceTextGenerationPipeline | undefined
let provider: ProviderAdapterInterface | undefined

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeAll(async() => {
	console.log('[Qwen Tool Test] Loading Qwen model...')
	console.log('[Qwen Tool Test] This may take several minutes on first run.')

	toolPipeline = await loadToolModelPipeline()

	provider = createHuggingFaceProviderAdapter({
		pipeline: toolPipeline,
		modelName: HUGGINGFACE_CONFIG.toolModel,
		enableTools: true,
	})

	console.log('[Qwen Tool Test] Ready')
}, HF_TEST_TIMEOUTS.modelLoad)

afterAll(async() => {
	console.log('[Qwen Tool Test] Disposing...')
	if (toolPipeline?.dispose) {
		await toolPipeline.dispose()
	}
	toolPipeline = undefined
	provider = undefined
	console.log('[Qwen Tool Test] Cleanup complete')
})

function getProvider(): ProviderAdapterInterface {
	if (provider === undefined) {
		throw new Error('Provider not initialized')
	}
	return provider
}

// ============================================================================
// Tests
// ============================================================================

describe('Qwen Tool Calling Capabilities', () => {
	// =========================================================================
	// Capability Detection - These tests are lightweight and should pass
	// =========================================================================

	describe('capability detection', () => {
		it('reports supportsTools as true for Qwen model with enableTools', () => {
			const p = getProvider()

			// Qwen models should have apply_chat_template support
			const hasToolSupport = p.supportsTools()
			console.log(`[Qwen Tool Test] supportsTools: ${hasToolSupport}`)

			// Verify tokenizer has apply_chat_template
			const hasApplyChatTemplate = toolPipeline?.tokenizer?.apply_chat_template !== undefined
			console.log(`[Qwen Tool Test] has apply_chat_template: ${hasApplyChatTemplate}`)

			// With Qwen models, both should be true
			expect(hasApplyChatTemplate).toBe(true)
			expect(hasToolSupport).toBe(true)
		})

		it('getCapabilities includes correct tool support info', () => {
			const p = getProvider()
			const caps = p.getCapabilities()

			expect(caps.supportsTools).toBe(true)
			expect(caps.supportsStreaming).toBe(true)
			expect(caps.supportsVision).toBe(false)
			expect(caps.supportsFunctions).toBe(false)
			expect(caps.models).toContain(HUGGINGFACE_CONFIG.toolModel)
		})

		it('provider without enableTools reports supportsTools as false', () => {
			const providerNoTools = createHuggingFaceProviderAdapter({
				pipeline: toolPipeline!,
				modelName: HUGGINGFACE_CONFIG.toolModel,
				enableTools: false,
			})

			expect(providerNoTools.supportsTools()).toBe(false)
			expect(providerNoTools.getCapabilities().supportsTools).toBe(false)
		})
	})

	// =========================================================================
	// Tokenizer verification
	// =========================================================================

	describe('tokenizer features', () => {
		it('tokenizer has apply_chat_template method', () => {
			const tokenizer = toolPipeline?.tokenizer
			expect(tokenizer).toBeDefined()
			expect(typeof tokenizer?.apply_chat_template).toBe('function')
		})

		it('tokenizer can decode tokens', () => {
			const tokenizer = toolPipeline?.tokenizer
			expect(tokenizer).toBeDefined()
			expect(typeof tokenizer?.decode).toBe('function')
		})
	})
})
