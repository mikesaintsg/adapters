/**
 * @mikesaintsg/adapters
 *
 * Integration test setup file for Vitest browser testing with Ollama.
 * Configures Ollama connection and provides test utilities.
 *
 * Uses @mikesaintsg/inference for engine and session management.
 */

import { beforeAll, afterAll, afterEach } from 'vitest'
import { createEngine } from '@mikesaintsg/inference'
import type { EngineInterface, SessionInterface } from '@mikesaintsg/inference'
import { createOllamaProviderAdapter, createOllamaEmbeddingAdapter } from '@mikesaintsg/adapters'
import type {
	ProviderAdapterInterface,
	Message,
	EmbeddingAdapterInterface,
} from '@mikesaintsg/core'

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Get environment variable with default value.
 */
function getEnvString(key: string, defaultValue: string): string {
	const value: unknown = import.meta.env[key]
	return typeof value === 'string' ? value : defaultValue
}

/**
 * Ollama configuration from Vite environment variables.
 */
export const OLLAMA_CONFIG = {
	host: getEnvString('VITE_OLLAMA_HOST', 'http://localhost:11434'),
	model: getEnvString('VITE_OLLAMA_MODEL', 'qwen2.5:1.5b'),
	embeddingModel: getEnvString('VITE_OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text'),
	isCI: import.meta.env.CI === 'true',
	// System prompt for testing
	defaultSystemPrompt: 'You are a helpful, concise assistant. Keep responses brief.',
} as const

/**
 * Test timeouts for Ollama integration tests.
 */
export const TEST_TIMEOUTS = {
	integration: 60000,
	streaming: 30000,
	toolCalling: 90000,
	embedding: 30000,
} as const

// ============================================================================
// Cached Engine and Provider
// ============================================================================

let engine: EngineInterface | undefined
let provider: ProviderAdapterInterface | undefined

// ============================================================================
// Global Setup/Teardown
// ============================================================================

beforeAll(async() => {
	// Verify Ollama is available - fail fast if not
	await verifyOllamaAvailable()

	// Create provider and engine
	provider = createOllamaProviderAdapter({
		baseURL: OLLAMA_CONFIG.host,
		model: OLLAMA_CONFIG.model,
	})
	engine = createEngine(provider)
})

afterEach(() => {
	// Cleanup per test if needed
})

afterAll(() => {
	// Global cleanup
	engine = undefined
	provider = undefined
})

// ============================================================================
// Ollama Verification
// ============================================================================

/**
 * Verify Ollama is available and the model is loaded.
 * Throws if Ollama is not accessible - tests should fail, not skip.
 */
async function verifyOllamaAvailable(): Promise<void> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 10000)

	try {
		const response = await fetch(`${OLLAMA_CONFIG.host}/api/tags`, {
			method: 'GET',
			signal: controller.signal,
		})

		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error(
				`Ollama returned ${response.status}. ` +
				'Make sure Ollama is running with CORS: OLLAMA_ORIGINS="*" ollama serve',
			)
		}

		const data = (await response.json()) as { models?: { name: string }[] }
		const models = data.models ?? []
		const parts = OLLAMA_CONFIG.model.split(':')
		const modelPrefix = parts[0]

		if (modelPrefix === undefined || modelPrefix.length === 0) {
			throw new Error(`Invalid model name: ${OLLAMA_CONFIG.model}`)
		}

		const modelAvailable = models.some((m) => m.name.includes(modelPrefix))

		if (!modelAvailable) {
			const availableModels = models.map((m) => m.name).join(', ') || 'none'
			throw new Error(
				`Model ${OLLAMA_CONFIG.model} not found. ` +
				`Available models: ${availableModels}. ` +
				`Run: ollama pull ${OLLAMA_CONFIG.model}`,
			)
		}
	} catch (error) {
		clearTimeout(timeoutId)

		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(
				'Ollama connection timeout. ' +
				'Make sure Ollama is running: OLLAMA_ORIGINS="*" ollama serve',
			)
		}

		if (error instanceof Error) {
			throw error
		}

		throw new Error('Failed to connect to Ollama')
	}
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Get the initialized inference engine.
 * Throws if engine is not initialized.
 */
export function getEngine(): EngineInterface {
	if (engine === undefined) {
		throw new Error('Engine not initialized. Run beforeAll first.')
	}
	return engine
}

/**
 * Get the initialized provider adapter.
 * Throws if provider is not initialized.
 */
export function getProvider(): ProviderAdapterInterface {
	if (provider === undefined) {
		throw new Error('Provider not initialized. Run beforeAll first.')
	}
	return provider
}

/**
 * Create a new session with optional system prompt.
 */
export function createTestSession(systemPrompt?: string): SessionInterface {
	return getEngine().createSession({
		system: systemPrompt ?? OLLAMA_CONFIG.defaultSystemPrompt,
	})
}

/**
 * Create a configured Ollama provider adapter (new instance).
 */
export function createTestProvider(): ProviderAdapterInterface {
	return createOllamaProviderAdapter({
		baseURL: OLLAMA_CONFIG.host,
		model: OLLAMA_CONFIG.model,
	})
}

/**
 * Create a configured Ollama embedding adapter.
 */
export function createTestEmbeddingAdapter(): EmbeddingAdapterInterface {
	return createOllamaEmbeddingAdapter({
		baseURL: OLLAMA_CONFIG.host,
		model: OLLAMA_CONFIG.embeddingModel,
	})
}

/**
 * Create a test user message.
 */
export function createTestMessage(content: string): Message {
	return {
		id: crypto.randomUUID(),
		role: 'user',
		content,
		createdAt: Date.now(),
	}
}

/**
 * Create a system message.
 */
export function createSystemMessage(content: string): Message {
	return {
		id: crypto.randomUUID(),
		role: 'system',
		content,
		createdAt: Date.now(),
	}
}

/**
 * Create an assistant message.
 */
export function createAssistantMessage(content: string): Message {
	return {
		id: crypto.randomUUID(),
		role: 'assistant',
		content,
		createdAt: Date.now(),
	}
}

/**
 * Collect tokens from a stream handle (legacy provider interface).
 */
export async function collectProviderTokens(
	handle: { onToken: (cb: (token: string) => void) => () => void; result: () => Promise<unknown> },
): Promise<readonly string[]> {
	const tokens: string[] = []
	const unsubscribe = handle.onToken((token) => tokens.push(token))

	try {
		await handle.result()
	} finally {
		unsubscribe()
	}

	return tokens
}

/**
 * Collect tokens from an async iterable stream (inference engine).
 */
export async function collectTokens(
	stream: AsyncIterable<string>,
): Promise<readonly string[]> {
	const tokens: string[] = []
	for await (const token of stream) {
		tokens.push(token)
	}
	return tokens
}

/**
 * Wait for a condition with timeout.
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeoutMs = 5000,
	intervalMs = 100,
): Promise<boolean> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		if (await condition()) return true
		await new Promise((resolve) => setTimeout(resolve, intervalMs))
	}
	return false
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	let dotProduct = 0
	let normA = 0
	let normB = 0

	for (let i = 0; i < a.length; i++) {
		const valA = a[i] ?? 0
		const valB = b[i] ?? 0
		dotProduct += valA * valB
		normA += valA * valA
		normB += valB * valB
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Calculate L2 norm of a vector.
 */
export function l2Norm(vec: Float32Array): number {
	let sumSquares = 0
	for (const val of vec) {
		sumSquares += val * val
	}
	return Math.sqrt(sumSquares)
}
