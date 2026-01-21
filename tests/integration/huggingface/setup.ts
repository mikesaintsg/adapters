/**
 * @mikesaintsg/adapters
 *
 * Integration test setup for HuggingFace Transformers.
 *
 * This file exports configuration and utilities only.
 * Each test file is responsible for loading its own models in beforeAll.
 */

import { pipeline, env } from '@huggingface/transformers'
import { createHuggingFaceProviderAdapter, createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'
import type { ProviderAdapterInterface, EmbeddingAdapterInterface, Message } from '@mikesaintsg/core'
import type {
	HuggingFaceTextGenerationPipeline,
	HuggingFaceFeatureExtractionPipeline,
} from '@mikesaintsg/adapters'

// ============================================================================
// Environment Configuration
// ============================================================================

// Disable local models - use HuggingFace Hub
env.allowLocalModels = false
// Enable browser cache for faster subsequent loads
env.useBrowserCache = true

/**
 * HuggingFace configuration for integration tests.
 */
export const HUGGINGFACE_CONFIG = {
	// Smallest text generation model available (~82MB)
	textModel: 'Xenova/distilgpt2',
	// Smallest embedding model (~90MB, 384 dims)
	embeddingModel: 'Xenova/all-MiniLM-L6-v2',
	embeddingDimensions: 384,
} as const

/**
 * Test timeouts - generous for model loading
 */
export const HF_TEST_TIMEOUTS = {
	modelLoad: 300_000, // 5 minutes for model download
	generation: 60_000, // 1 minute for text generation
	embedding: 30_000, // 30 seconds for embeddings
} as const

// ============================================================================
// Pipeline Loading Functions
// ============================================================================

/**
 * Load the text generation pipeline.
 */
export async function loadTextGenerationPipeline(): Promise<HuggingFaceTextGenerationPipeline> {
	console.log(`[HuggingFace] Loading: ${HUGGINGFACE_CONFIG.textModel}`)
	const textPipeline = await pipeline(
		'text-generation',
		HUGGINGFACE_CONFIG.textModel,
		{ dtype: 'fp32' },
	)
	console.log('[HuggingFace] Text generation pipeline loaded')
	return textPipeline as unknown as HuggingFaceTextGenerationPipeline
}

/**
 * Load the embedding pipeline.
 */
export async function loadEmbeddingPipeline(): Promise<HuggingFaceFeatureExtractionPipeline> {
	console.log(`[HuggingFace] Loading: ${HUGGINGFACE_CONFIG.embeddingModel}`)
	const embeddingPipeline = await pipeline(
		'feature-extraction',
		HUGGINGFACE_CONFIG.embeddingModel,
		{ dtype: 'fp32' },
	)
	console.log('[HuggingFace] Embedding pipeline loaded')
	return embeddingPipeline as unknown as HuggingFaceFeatureExtractionPipeline
}

/**
 * Create provider adapter from pipeline.
 */
export function createProvider(textPipeline: HuggingFaceTextGenerationPipeline): ProviderAdapterInterface {
	return createHuggingFaceProviderAdapter({
		pipeline: textPipeline,
		modelName: HUGGINGFACE_CONFIG.textModel,
	})
}

/**
 * Create embedding adapter from pipeline.
 */
export function createEmbedding(embeddingPipeline: HuggingFaceFeatureExtractionPipeline): EmbeddingAdapterInterface {
	return createHuggingFaceEmbeddingAdapter({
		pipeline: embeddingPipeline,
		modelName: HUGGINGFACE_CONFIG.embeddingModel,
		dimensions: HUGGINGFACE_CONFIG.embeddingDimensions,
		pooling: 'mean',
		normalize: true,
	})
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a simple user message.
 */
export function createMessage(content: string, role: 'user' | 'assistant' | 'system' = 'user'): Message {
	return {
		id: crypto.randomUUID(),
		role,
		content,
		createdAt: Date.now(),
	}
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	let dot = 0
	let normA = 0
	let normB = 0

	for (let i = 0; i < a.length; i++) {
		const va = a[i] ?? 0
		const vb = b[i] ?? 0
		dot += va * vb
		normA += va * va
		normB += vb * vb
	}

	return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Compute L2 norm of a vector.
 */
export function l2Norm(v: Float32Array): number {
	let sum = 0
	for (const x of v) {
		sum += x * x
	}
	return Math.sqrt(sum)
}
