/**
 * @mikesaintsg/adapters
 *
 * Test setup and utilities.
 * Consolidated mocks and helpers for all test files.
 */

import { vi } from 'vitest'
import type {
	ContextFrame,
	MinimalDatabaseAccess,
	MinimalDirectoryAccess,
	MinimalFileAccess,
	MinimalStoreAccess,
	SerializableSession,
	SerializedSessionMetadata,
	SerializedMessage,
	TransitionEvent,
	ExportedPredictiveGraph,
} from '@mikesaintsg/core'
import type {
	HuggingFaceFeatureExtractionPipeline,
	HuggingFaceTensor,
	HuggingFaceTextGenerationPipeline,
	HuggingFaceTextGenerationOutput,
	NodeLlamaCppEmbeddingContext,
	NodeLlamaCppContext,
	NodeLlamaCppContextSequence,
	NodeLlamaCppModel,
} from '@mikesaintsg/adapters'

// ============================================================================
// HuggingFace Mock Helpers
// ============================================================================

/**
 * Creates a mock HuggingFace tensor for testing embedding adapters.
 */
export function createMockTensor(data: number[][]): HuggingFaceTensor {
	const firstRow = data[0]
	const dims = firstRow ? [data.length, firstRow.length] : [0, 0]
	return {
		data: new Float32Array(data.flat()),
		dims,
		type: 'float32',
		size: data.flat().length,
		tolist: () => data,
		dispose: vi.fn(),
	}
}

/**
 * Creates a mock HuggingFace feature extraction pipeline for testing.
 */
export function createMockFeatureExtractionPipeline(): HuggingFaceFeatureExtractionPipeline {
	return vi.fn() as unknown as HuggingFaceFeatureExtractionPipeline
}

/**
 * Creates a mock HuggingFace text generation pipeline for testing.
 */
export function createMockTextGenerationPipeline(
	outputs: readonly HuggingFaceTextGenerationOutput[],
): HuggingFaceTextGenerationPipeline {
	return vi.fn().mockResolvedValue(outputs) as unknown as HuggingFaceTextGenerationPipeline
}

// ============================================================================
// NodeLlamaCpp Mock Helpers
// ============================================================================

/**
 * Creates a mock NodeLlamaCpp embedding context for testing.
 */
export function createMockEmbeddingContext(): NodeLlamaCppEmbeddingContext {
	return {
		getEmbeddingFor: vi.fn(),
	}
}

/**
 * Creates a mock NodeLlamaCpp context for provider testing.
 */
export function createMockNodeLlamaCppContext(tokens: number[]): NodeLlamaCppContext {
	const mockSequence: NodeLlamaCppContextSequence = {
		// eslint-disable-next-line @typescript-eslint/require-await
		async *evaluate(): AsyncGenerator<number, void, unknown> {
			for (const token of tokens) {
				yield token
			}
		},
	}

	const mockModel: NodeLlamaCppModel = {
		tokenize: vi.fn().mockReturnValue([1, 2, 3]),
		detokenize: vi.fn().mockImplementation((ids: readonly number[]) => {
			return ids.map((id) => {
				if (id === 1) return 'Hello'
				if (id === 2) return ' '
				if (id === 3) return 'world'
				if (id === 999) return ''
				return String(id)
			}).join('')
		}),
		tokens: {
			bos: 0,
			eos: 999,
		},
	}

	return {
		getSequence: vi.fn().mockReturnValue(mockSequence),
		model: mockModel,
	}
}

// ============================================================================
// Persistence Mock Helpers
// ============================================================================

/**
 * Creates a mock directory with file access for OPFS persistence testing.
 */
export function createMockDirectory(): MinimalDirectoryAccess {
	const files = new Map<string, string>()

	function createFileAccess(name: string): MinimalFileAccess {
		return {
			getName: () => name,
			getText: () => {
				const content = files.get(name)
				if (content === undefined) return Promise.reject(new Error('File not found'))
				return Promise.resolve(content)
			},
			getArrayBuffer: () => {
				const content = files.get(name)
				if (content === undefined) return Promise.reject(new Error('File not found'))
				return Promise.resolve(new TextEncoder().encode(content).buffer)
			},
			write: (data: string | ArrayBuffer) => {
				if (typeof data === 'string') {
					files.set(name, data)
				} else {
					files.set(name, new TextDecoder().decode(data))
				}
				return Promise.resolve()
			},
		}
	}

	return {
		getFile(name: string): Promise<MinimalFileAccess | undefined> {
			if (files.has(name)) {
				return Promise.resolve(createFileAccess(name))
			}
			return Promise.resolve(undefined)
		},
		createFile(name: string): Promise<MinimalFileAccess> {
			files.set(name, '')
			return Promise.resolve(createFileAccess(name))
		},
		hasFile(name: string): Promise<boolean> {
			return Promise.resolve(files.has(name))
		},
		removeFile(name: string): Promise<void> {
			files.delete(name)
			return Promise.resolve()
		},
		listFiles(): Promise<readonly MinimalFileAccess[]> {
			return Promise.resolve(Array.from(files.keys()).map(createFileAccess))
		},
	}
}

/**
 * Creates a mock IndexedDB store for testing.
 */
export function createMockStore<T>(): MinimalStoreAccess<T> & { data: Map<string, T> } {
	const data = new Map<string, T>()

	function keyToString(key: IDBValidKey): string {
		if (typeof key === 'string') return key
		if (typeof key === 'number') return String(key)
		if (key instanceof Date) return `date:${key.getTime()}`
		if (key instanceof ArrayBuffer) return `buffer:${Array.from(new Uint8Array(key)).join(',')}`
		if (Array.isArray(key)) return `array:${JSON.stringify(key)}`
		return JSON.stringify(key)
	}

	return {
		data,
		get(key: IDBValidKey): Promise<T | undefined> {
			return Promise.resolve(data.get(keyToString(key)))
		},
		set(value: T, key?: IDBValidKey): Promise<IDBValidKey> {
			const k = key ?? (value as { id?: IDBValidKey }).id ?? Date.now()
			data.set(keyToString(k), value)
			return Promise.resolve(k)
		},
		remove(key: IDBValidKey): Promise<void> {
			data.delete(keyToString(key))
			return Promise.resolve()
		},
		all(): Promise<readonly T[]> {
			return Promise.resolve(Array.from(data.values()))
		},
		clear(): Promise<void> {
			data.clear()
			return Promise.resolve()
		},
	}
}

/**
 * Creates a mock IndexedDB database for testing.
 */
export function createMockDatabase(): MinimalDatabaseAccess & { stores: Map<string, MinimalStoreAccess<unknown>> } {
	const stores = new Map<string, MinimalStoreAccess<unknown>>()

	function keyToString(key: IDBValidKey): string {
		if (typeof key === 'string') return key
		if (typeof key === 'number') return String(key)
		if (key instanceof Date) return `date:${key.getTime()}`
		if (key instanceof ArrayBuffer) return `buffer:${Array.from(new Uint8Array(key)).join(',')}`
		if (Array.isArray(key)) return `array:${JSON.stringify(key)}`
		return JSON.stringify(key)
	}

	function getStore<T>(name: string): MinimalStoreAccess<T> {
		if (!stores.has(name)) {
			const storeData = new Map<string, unknown>()
			stores.set(name, {
				get(key: IDBValidKey): Promise<T | undefined> {
					return Promise.resolve(storeData.get(keyToString(key)) as T | undefined)
				},
				set(value: T, key?: IDBValidKey): Promise<IDBValidKey> {
					const k = key ?? (value as { id?: IDBValidKey }).id ?? Date.now()
					storeData.set(keyToString(k), value)
					return Promise.resolve(k)
				},
				remove(key: IDBValidKey): Promise<void> {
					storeData.delete(keyToString(key))
					return Promise.resolve()
				},
				all(): Promise<readonly T[]> {
					return Promise.resolve(Array.from(storeData.values()) as T[])
				},
				clear(): Promise<void> {
					storeData.clear()
					return Promise.resolve()
				},
			})
		}
		return stores.get(name) as MinimalStoreAccess<T>
	}

	return {
		stores,
		store<S>(name: string): MinimalStoreAccess<S> {
			return getStore<S>(name)
		},
	}
}

// ============================================================================
// Session Mock Helpers
// ============================================================================

/**
 * Creates a mock session that implements SerializableSession.
 */
export function createMockSession(data: object): SerializableSession {
	return {
		getMessages(): readonly SerializedMessage[] {
			return []
		},
		getMetadata(): SerializedSessionMetadata {
			return data as SerializedSessionMetadata
		},
	}
}

/**
 * Generates a unique database name for testing.
 */
export function uniqueDbName(): string {
	return `test-sessions-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ============================================================================
// HTTP Response Mock Helpers
// ============================================================================

/**
 * Creates a mock SSE response for streaming provider tests.
 */
export function createSSEResponse(chunks: string[]): Response {
	const encoder = new TextEncoder()
	let chunkIndex = 0

	const stream = new ReadableStream({
		pull(controller) {
			if (chunkIndex < chunks.length) {
				controller.enqueue(encoder.encode(chunks[chunkIndex]))
				chunkIndex++
			} else {
				controller.close()
			}
		},
	})

	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	})
}

/**
 * Creates a mock NDJSON response for Ollama provider tests.
 */
export function createNDJSONResponse(chunks: object[]): Response {
	const encoder = new TextEncoder()
	let chunkIndex = 0

	const stream = new ReadableStream({
		pull(controller) {
			if (chunkIndex < chunks.length) {
				controller.enqueue(encoder.encode(JSON.stringify(chunks[chunkIndex]) + '\n'))
				chunkIndex++
			} else {
				controller.close()
			}
		},
	})

	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'application/x-ndjson' },
	})
}

/**
 * Creates a mock error response for API error testing.
 */
export function createErrorResponse(status: number, errorBody: unknown): Response {
	return new Response(JSON.stringify(errorBody), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

// ============================================================================
// Context Frame Mock Helpers
// ============================================================================

/**
 * Creates a mock context frame for context builder tests.
 */
export function createContextFrame(
	id: string,
	content: string,
	priority?: string,
	score?: number,
): ContextFrame {
	return {
		id,
		type: 'retrieval',
		source: 'test',
		content,
		contentHash: `hash-${content}`,
		priority: (priority ?? 'normal') as ContextFrame['priority'],
		tokenCount: content.length / 4,
		tokenEstimate: content.length / 4,
		createdAt: Date.now(),
		metadata: { priority, score },
	} as unknown as ContextFrame
}

/**
 * Creates a mock context frame for deduplication tests (with random ID).
 */
export function createDeduplicationFrame(content: string, priority?: string): ContextFrame {
	return {
		id: `frame-${Math.random().toString(36).slice(2)}`,
		type: 'retrieval',
		source: 'test',
		content,
		contentHash: `hash-${content}`,
		priority: (priority ?? 'normal') as ContextFrame['priority'],
		tokenCount: content.length / 4,
		tokenEstimate: content.length / 4,
		createdAt: Date.now(),
		metadata: priority ? { priority } : {},
	} as unknown as ContextFrame
}

// ============================================================================
// Action Loop Mock Helpers
// ============================================================================

/**
 * Creates a mock transition event for action loop tests.
 */
export function createTransitionEvent(
	id: string,
	from: string,
	to: string,
	timestamp = Date.now(),
	sessionId = 'session-1',
): TransitionEvent {
	return {
		id,
		timestamp,
		sessionId,
		actor: 'user',
		from,
		to,
		path: '/test',
		engagement: 'active',
	} as TransitionEvent
}

/**
 * Creates mock weights for predictive graph tests.
 */
export function createMockWeights(modelId: string): ExportedPredictiveGraph {
	return {
		version: 1,
		exportedAt: Date.now(),
		modelId,
		weights: [],
		decayConfig: { algorithm: 'exponential', halfLifeMs: 604800000, minWeight: 0.01 },
		transitionCount: 0,
	} as unknown as ExportedPredictiveGraph
}
