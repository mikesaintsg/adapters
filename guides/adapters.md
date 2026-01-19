# @mikesaintsg/adapters

> **Zero-dependency adapter implementations for the @mikesaintsg ecosystem.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Source Adapters](#source-adapters)
6. [Policy Adapters](#policy-adapters)
7. [Enhancement Adapters](#enhancement-adapters)
8. [Transform Adapters](#transform-adapters)
9. [Persistence Adapters](#persistence-adapters)
10. [Bridge Functions](#bridge-functions)
11. [Error Handling](#error-handling)
12. [TypeScript Integration](#typescript-integration)
13. [Browser Compatibility](#browser-compatibility)
14. [Integration with Ecosystem](#integration-with-ecosystem)
15. [API Reference](#api-reference)
16. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/adapters` provides:

- **Provider integrations** — OpenAI, Anthropic, Ollama, node-llama-cpp for LLM and embedding generation
- **Policy adapters** — Retry and rate limiting strategies
- **Enhancement adapters** — Caching, batching, and reranking
- **Transform adapters** — Tool format conversion and similarity scoring
- **Persistence adapters** — IndexedDB, OPFS, and HTTP storage
- **Zero dependencies** — Built entirely on native `fetch` API

### Package Role

This package is the **implementation home** for all adapter interfaces defined in `@mikesaintsg/core`. It provides ready-to-use adapters that plug into ecosystem systems.

### When to Use This Package

| Scenario                         | Use @mikesaintsg/adapters |
|----------------------------------|---------------------------|
| Need LLM provider integration    | ✅                         |
| Need embedding generation        | ✅                         |
| Need persistent vector storage   | ✅                         |
| Need retry/rate limiting         | ✅                         |
| Building custom internal adapter | ❌ (implement interface)   |

---

## Installation

```bash
npm install @mikesaintsg/adapters @mikesaintsg/core
```

---

## Quick Start

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import {
	createOpenAIProviderAdapter,
	createOpenAIEmbeddingAdapter,
	createExponentialRetryAdapter,
	createLRUCacheAdapter,
} from '@mikesaintsg/adapters'

// 1. Create provider adapter
const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
})

// 2. Create embedding adapter
const embedding = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'text-embedding-3-small',
})

// 3. Create engine with provider (required first parameter)
const engine = createEngine(provider)

// 4. Create vector store with adapters (all optional are opt-in)
const store = await createVectorStore(embedding, {
	retry: createExponentialRetryAdapter({ maxAttempts: 3 }),
	cache: createLRUCacheAdapter({ maxSize: 10000 }),
})

// 5. Use the systems
const session = engine.createSession({ system: 'You are helpful.' })
await store.add('Important document content')
```

---

## Core Concepts

### Adapter Architecture

Adapters are **self-contained implementations** of interfaces defined in `@mikesaintsg/core`. They are peers, not layers — systems orchestrate adapters, adapters don't wrap each other.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Your Application                                │
├─────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │  inference  │  │ vectorstore │  │contextproto │  │contextbuildr│    │
│   │   Engine    │  │ VectorStore │  │  Registry   │  │   Builder   │    │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│          │                │                │                │           │
├──────────┴────────────────┴────────────────┴────────────────┴───────────┤
│                         @mikesaintsg/adapters                            │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │ Source        │ Policy      │ Enhancement │ Transform │ Persist. │ │
│   │ OpenAI        │ Retry       │ Cache       │ ToolFmt   │ IndexedDB│ │
│   │ Anthropic     │ RateLimit   │ Batch       │ Similarity│ OPFS     │ │
│   │ Ollama        │             │ Reranker    │           │ HTTP     │ │
│   │ node-llama-cpp│             │             │           │          │ │
│   └───────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                     External APIs / Local Services                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Opt-In Design

All optional adapters are **opt-in** — nothing is enabled by default:

```ts
// MINIMAL: Just required adapter
const store = await createVectorStore(embeddingAdapter)

// WITH OPTIONS: Opt-in to specific capabilities
const store = await createVectorStore(embeddingAdapter, {
	persistence: createIndexedDBVectorPersistenceAdapter({ database }),
	retry: createExponentialRetryAdapter(),
	cache: createLRUCacheAdapter({ maxSize: 10000 }),
})
```

### Interface Ownership

| Interface                                | Defined In | Implemented In |
|------------------------------------------|------------|----------------|
| `ProviderAdapterInterface`               | `core`     | `adapters`     |
| `EmbeddingAdapterInterface`              | `core`     | `adapters`     |
| `ToolFormatAdapterInterface`             | `core`     | `adapters`     |
| `RetryAdapterInterface`                  | `core`     | `adapters`     |
| `RateLimitAdapterInterface`              | `core`     | `adapters`     |
| `EmbeddingCacheAdapterInterface`         | `core`     | `adapters`     |
| `BatchAdapterInterface`                  | `core`     | `adapters`     |
| `SimilarityAdapterInterface`             | `core`     | `adapters`     |
| `RerankerAdapterInterface`               | `core`     | `adapters`     |
| `VectorStorePersistenceAdapterInterface` | `core`     | `adapters`     |
| `DeduplicationAdapterInterface`          | `core`     | `adapters`     |
| `TruncationAdapterInterface`             | `core`     | `adapters`     |
| `PriorityAdapterInterface`               | `core`     | `adapters`     |

### Adapter Categories

| Category        | Purpose                | Examples                              |
|-----------------|------------------------|---------------------------------------|
| **Source**      | Generate/retrieve data | Provider, Embedding                   |
| **Policy**      | Apply policies         | Retry, RateLimit                      |
| **Enhancement** | Add capabilities       | Cache, Batch, Reranker                |
| **Transform**   | Transform formats      | ToolFormat, Similarity                |
| **Persistence** | Store/load data        | IndexedDB, OPFS, HTTP                 |

---

## Source Adapters

Source adapters generate or retrieve data from external services.

### Provider Adapters

| Adapter                              | Provider       | Notes                     |
|--------------------------------------|----------------|---------------------------|
| `createOpenAIProviderAdapter`        | OpenAI         | Chat completions, tools   |
| `createAnthropicProviderAdapter`     | Anthropic      | Messages API, tools       |
| `createOllamaProviderAdapter`        | Ollama         | Local development/testing |
| `createNodeLlamaCppProviderAdapter`  | node-llama-cpp | Local LLaMA models        |

### Embedding Adapters

| Adapter                              | Provider       | Notes                     |
|--------------------------------------|----------------|---------------------------|
| `createOpenAIEmbeddingAdapter`       | OpenAI         | text-embedding-3-*        |
| `createVoyageEmbeddingAdapter`       | Voyage         | Anthropic partner         |
| `createOllamaEmbeddingAdapter`       | Ollama         | Local development/testing |
| `createNodeLlamaCppEmbeddingAdapter` | node-llama-cpp | Local GGUF models         |

### OpenAI Provider

```ts
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
	organization: 'org-xxx', // Optional
	defaultOptions: {
		temperature: 0.7,
		maxTokens: 4096,
	},
})

// Required adapter is first parameter
const engine = createEngine(provider)
```

### Anthropic Provider

```ts
import { createAnthropicProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createAnthropicProviderAdapter({
	apiKey: process.env.ANTHROPIC_API_KEY!,
	model: 'claude-3-5-sonnet-20241022',
	defaultOptions: {
		temperature: 0.7,
		maxTokens: 4096,
	},
})

const engine = createEngine(provider)
```

### Ollama Provider (Local Development)

Ollama is the recommended way to test adapters during development without incurring API costs:

```ts
import { createOllamaProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createOllamaProviderAdapter({
	model: 'llama3',
	baseURL: 'http://localhost:11434', // Default
	keepAlive: true,
})

const engine = createEngine(provider)
```

### OpenAI Embedding

```ts
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const embedding = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'text-embedding-3-small',
	dimensions: 1536, // Optional dimension reduction
})

// EmbeddingAdapterInterface expects array in, array out
const embeddings = await embedding.embed(['Hello, world!'])
```

### Voyage Embedding

Voyage AI is the recommended embedding provider for Anthropic users:

```ts
import { createVoyageEmbeddingAdapter } from '@mikesaintsg/adapters'

const embedding = createVoyageEmbeddingAdapter({
	apiKey: process.env.VOYAGE_API_KEY!,
	model: 'voyage-3',
	inputType: 'document', // or 'query' for search queries
})

const embeddings = await embedding.embed(['function hello() {}'])
```

### Ollama Embedding (Local Development)

```ts
import { createOllamaEmbeddingAdapter } from '@mikesaintsg/adapters'

const embedding = createOllamaEmbeddingAdapter({
	model: 'nomic-embed-text',
	baseURL: 'http://localhost:11434',
})

const embeddings = await embedding.embed(['Hello, world!'])
```

**Supported Ollama embedding models:**
- `nomic-embed-text` — General purpose, 768 dimensions
- `mxbai-embed-large` — High quality, 1024 dimensions
- `all-minilm` — Lightweight, 384 dimensions

### node-llama-cpp Provider (Local Development)

node-llama-cpp allows running LLaMA models locally using llama.cpp bindings. Unlike other adapters, **node-llama-cpp is NOT a runtime dependency**. Consumers must install it themselves and pass initialized context objects:

```ts
import { getLlama } from 'node-llama-cpp'
import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

// Consumer initializes node-llama-cpp
const llama = await getLlama()
const model = await llama.loadModel({ modelPath: './llama-3-8b.gguf' })
const context = await model.createContext()

// Pass to adapter
const provider = createNodeLlamaCppProviderAdapter({
	context,
	modelName: 'llama3',
	defaultOptions: {
		temperature: 0.7,
		maxTokens: 4096,
	},
})

const engine = createEngine(provider)
```

**Key benefits:**
- **No runtime dependency** — Consumers who don't use node-llama-cpp avoid installing it
- **Full control** — Consumer manages model loading and context lifecycle
- **GGUF support** — Use any GGUF-format model

### node-llama-cpp Embedding (Local Development)

```ts
import { getLlama } from 'node-llama-cpp'
import { createNodeLlamaCppEmbeddingAdapter } from '@mikesaintsg/adapters'

// Consumer initializes node-llama-cpp
const llama = await getLlama()
const model = await llama.loadModel({ modelPath: './nomic-embed-text.gguf' })
const embeddingContext = await model.createEmbeddingContext()

// Pass to adapter
const embedding = createNodeLlamaCppEmbeddingAdapter({
	embeddingContext,
	modelName: 'nomic-embed-text',
})

const embeddings = await embedding.embed(['Hello, world!'])
```

### HuggingFace Transformers Provider (Browser/Node.js)

Uses `@huggingface/transformers` to run text generation models locally in the browser or Node.js without API calls.

**Note:** `@huggingface/transformers` is **not** a runtime dependency of `@mikesaintsg/adapters`. Consumers must install `@huggingface/transformers` themselves and pass an initialized pipeline. This allows consumers who don't use HuggingFace to avoid installing it.

```ts
import { pipeline, TextStreamer } from '@huggingface/transformers'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

// Consumer initializes the pipeline (downloads model on first use)
const generator = await pipeline('text-generation', 'Xenova/gpt2')

// Pass to adapter with streaming enabled
const provider = createHuggingFaceProviderAdapter({
	pipeline: generator,
	modelName: 'gpt2',
	streamerClass: TextStreamer, // Optional: enables streaming
	defaultOptions: {
		maxTokens: 100,
		temperature: 0.7,
	},
})

const engine = createEngine(provider)
const session = engine.createSession({ system: 'You are helpful.' })
```

#### Streaming Support

HuggingFace Transformers supports streaming through the `TextStreamer` class. To enable streaming, pass the `TextStreamer` class from `@huggingface/transformers`:

```ts
import { pipeline, TextStreamer } from '@huggingface/transformers'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'

const generator = await pipeline('text-generation', 'Xenova/gpt2')

// Enable streaming by providing the TextStreamer class
const provider = createHuggingFaceProviderAdapter({
	pipeline: generator,
	modelName: 'gpt2',
	streamerClass: TextStreamer, // Enables streaming
})

// Tokens are now streamed as they are generated
for await (const token of provider.generate(messages, {})) {
	process.stdout.write(token)
}
```

**Streaming Capabilities:**
- `supportsStreaming()` returns `true` when `streamerClass` is provided
- Tokens are emitted via `onToken` callback or async iteration
- Uses the underlying model's `generate()` method with a `TextStreamer`

**Key benefits:**
- **No runtime dependency** — Consumers who don't use HuggingFace avoid installing it
- **Browser support** — Run models directly in the browser using WebAssembly
- **No API calls** — Models run locally, no internet required after download
- **Wide model support** — Use any compatible HuggingFace model
- **Optional streaming** — Enable streaming by providing the TextStreamer class

**Supported Models:**
- `Xenova/gpt2` — GPT-2 small
- `Xenova/distilgpt2` — DistilGPT-2
- `Xenova/phi-1_5` — Microsoft Phi 1.5
- `Xenova/TinyLlama-1.1B-Chat-v1.0` — TinyLlama 1.1B
- And many more from the [HuggingFace Hub](https://huggingface.co/models?library=transformers.js&pipeline_tag=text-generation&sort=trending)

### HuggingFace Transformers Embedding (Browser/Node.js)

Uses `@huggingface/transformers` to run embedding models locally in the browser or Node.js without API calls.

**Note:** `@huggingface/transformers` is **not** a runtime dependency of `@mikesaintsg/adapters`. Consumers must install `@huggingface/transformers` themselves and pass an initialized pipeline. This allows consumers who don't use HuggingFace to avoid installing it.

```ts
import { pipeline } from '@huggingface/transformers'
import { createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'

// Consumer initializes the pipeline (downloads model on first use)
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

// Pass to adapter - no @huggingface/transformers runtime dependency in @mikesaintsg/adapters
const embedding = createHuggingFaceEmbeddingAdapter({
	pipeline: extractor,
	modelName: 'all-MiniLM-L6-v2',
	dimensions: 384,
	pooling: 'mean',      // Optional: 'mean' | 'cls' | 'none' (default: 'mean')
	normalize: true,       // Optional: normalize to unit length (default: true)
})

const embeddings = await embedding.embed(['Hello, world!'])
// Returns Float32Array embeddings
```

#### Pooling Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `mean`   | Mean pooling across all tokens | Best for most sentence embedding models |
| `cls`    | Use CLS token embedding | BERT-style models |
| `none`   | No pooling (returns full sequence) | Advanced use cases |

#### Supported Models

Any HuggingFace model compatible with the `feature-extraction` pipeline:

- `Xenova/all-MiniLM-L6-v2` (384 dimensions)
- `Xenova/all-mpnet-base-v2` (768 dimensions)
- `Xenova/bge-small-en-v1.5` (384 dimensions)
- `Xenova/gte-small` (384 dimensions)
- `sentence-transformers/all-MiniLM-L6-v2`
- And many more from the [HuggingFace Hub](https://huggingface.co/models?library=transformers.js&sort=trending)

---

## Policy Adapters

Policy adapters control **how** operations are executed. They are opt-in and provided through the options object.

### Retry Adapters

| Adapter                         | Interface               | Notes                  |
|---------------------------------|-------------------------|------------------------|
| `createExponentialRetryAdapter` | `RetryAdapterInterface` | Exponential backoff    |
| `createLinearRetryAdapter`      | `RetryAdapterInterface` | Fixed delay between    |

```ts
import { 
	createExponentialRetryAdapter,
	createLinearRetryAdapter,
} from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

// Exponential backoff with jitter (recommended)
const retry = createExponentialRetryAdapter({
	maxAttempts: 5,
	initialDelayMs: 1000,
	maxDelayMs: 30000,
	backoffMultiplier: 2,
	jitter: true,
	onRetry: (error, attempt, delayMs) => {
		console.warn(`Retry ${attempt}, waiting ${delayMs}ms:`, error)
	},
})

// Linear retry with fixed delays
const linearRetry = createLinearRetryAdapter({
	maxAttempts: 3,
	delayMs: 2000,
})

// Provide to system through options
const store = await createVectorStore(embeddingAdapter, {
	retry, // Opt-in to retry
})
```

### Rate Limit Adapters

| Adapter                               | Interface                   | Notes                  |
|---------------------------------------|-----------------------------|------------------------|
| `createTokenBucketRateLimitAdapter`   | `RateLimitAdapterInterface` | Token bucket algorithm |
| `createSlidingWindowRateLimitAdapter` | `RateLimitAdapterInterface` | Sliding window         |

```ts
import {
	createTokenBucketRateLimitAdapter,
	createSlidingWindowRateLimitAdapter,
} from '@mikesaintsg/adapters'

// Token bucket algorithm (recommended)
const rateLimit = createTokenBucketRateLimitAdapter({
	requestsPerMinute: 60,
	maxConcurrent: 10,
})

// Sliding window algorithm
const slidingRateLimit = createSlidingWindowRateLimitAdapter({
	requestsPerMinute: 100,
	windowMs: 60000,
})

// Provide to system through options
const store = await createVectorStore(embeddingAdapter, {
	rateLimit, // Opt-in to rate limiting
})
```

---

## Enhancement Adapters

Enhancement adapters add **capabilities** to systems. They are opt-in and provided through the options object.

### Cache Adapters

| Adapter                       | Interface                        | Notes            |
|-------------------------------|----------------------------------|------------------|
| `createLRUCacheAdapter`       | `EmbeddingCacheAdapterInterface` | LRU eviction     |
| `createTTLCacheAdapter`       | `EmbeddingCacheAdapterInterface` | TTL-only         |
| `createIndexedDBCacheAdapter` | `EmbeddingCacheAdapterInterface` | Persistent cache |

```ts
import {
	createLRUCacheAdapter,
	createTTLCacheAdapter,
	createIndexedDBCacheAdapter,
} from '@mikesaintsg/adapters'

// LRU cache with TTL (recommended)
const cache = createLRUCacheAdapter({
	maxSize: 10000,
	ttlMs: 3600000, // 1 hour
})

// TTL-only cache
const ttlCache = createTTLCacheAdapter({
	ttlMs: 86400000, // 24 hours
})

// Persistent cache using IndexedDB
const persistentCache = createIndexedDBCacheAdapter({
	database: db,
	storeName: 'embedding_cache',
	ttlMs: 604800000, // 7 days
})

// Provide to system through options
const store = await createVectorStore(embeddingAdapter, {
	cache, // Opt-in to caching
})
```

### Batch Adapters

| Adapter               | Interface               | Notes             |
|-----------------------|-------------------------|-------------------|
| `createBatchAdapter`  | `BatchAdapterInterface` | Standard batching |

```ts
import { createBatchAdapter } from '@mikesaintsg/adapters'

const batch = createBatchAdapter({
	batchSize: 100,
	delayMs: 50,
	deduplicate: true,
})

// Provide to system through options
const store = await createVectorStore(embeddingAdapter, {
	batch, // Opt-in to batching
})
```

### Reranker Adapters

| Adapter                             | Interface                  | Notes       |
|-------------------------------------|----------------------------|-------------|
| `createCohereRerankerAdapter`       | `RerankerAdapterInterface` | Cohere API  |
| `createCrossEncoderRerankerAdapter` | `RerankerAdapterInterface` | Local model |

```ts
import {
	createCohereRerankerAdapter,
	createCrossEncoderRerankerAdapter,
} from '@mikesaintsg/adapters'

// Cohere reranker (recommended for production)
const reranker = createCohereRerankerAdapter({
	apiKey: process.env.COHERE_API_KEY!,
	model: 'rerank-english-v3.0',
})

// Local cross-encoder model
const localReranker = createCrossEncoderRerankerAdapter({
	model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
})

// Provide to system through options
const store = await createVectorStore(embeddingAdapter, {
	reranker, // Opt-in to reranking
})
```

---

## Transform Adapters

Transform adapters convert between data formats.

### Tool Format Adapters

| Adapter                            | Interface                    | Notes            |
|------------------------------------|------------------------------|------------------|
| `createOpenAIToolFormatAdapter`    | `ToolFormatAdapterInterface` | OpenAI format    |
| `createAnthropicToolFormatAdapter` | `ToolFormatAdapterInterface` | Anthropic format |

```ts
import { createOpenAIToolFormatAdapter } from '@mikesaintsg/adapters'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'

const formatter = createOpenAIToolFormatAdapter({
	toolChoice: 'auto', // 'none' | 'required' | { name: string }
})

// Convert schemas to OpenAI format
const registry = createToolRegistry(formatter)
const openAITools = formatter.formatSchemas(registry.all())

// Parse tool calls from response
const toolCalls = formatter.parseToolCalls(openAIResponse)

// Format result for provider
const formattedResult = formatter.formatResult(toolResult)
```

### Similarity Adapters

| Adapter                            | Interface                    | Notes              |
|------------------------------------|------------------------------|--------------------|
| `createCosineSimilarityAdapter`    | `SimilarityAdapterInterface` | Cosine similarity  |
| `createDotSimilarityAdapter`       | `SimilarityAdapterInterface` | Dot product        |
| `createEuclideanSimilarityAdapter` | `SimilarityAdapterInterface` | Euclidean distance |

```ts
import {
	createCosineSimilarityAdapter,
	createDotSimilarityAdapter,
	createEuclideanSimilarityAdapter,
} from '@mikesaintsg/adapters'

// Cosine similarity (recommended)
const cosineSimilarity = createCosineSimilarityAdapter()

// Dot product similarity
const dotSimilarity = createDotSimilarityAdapter()

// Euclidean distance
const euclideanSimilarity = createEuclideanSimilarityAdapter()

// Provide to system through options
const store = await createVectorStore(embeddingAdapter, {
	similarity: cosineSimilarity, // Opt-in to specific similarity
})
```

---

## Persistence Adapters

Persistence adapters store and load data across sessions.

### Session Persistence

| Adapter                                    | Type    | Notes               |
|--------------------------------------------|---------|---------------------|
| `createIndexedDBSessionPersistenceAdapter` | Session | Browser persistence |

```ts
import { createIndexedDBSessionPersistenceAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const persistence = createIndexedDBSessionPersistenceAdapter({
	database: db,
	storeName: 'sessions',
})

const engine = createEngine(provider, {
	sessionPersistence: persistence,
})
```

### VectorStore Persistence

| Adapter                                   | Type   | Notes               |
|-------------------------------------------|--------|---------------------|
| `createIndexedDBVectorPersistenceAdapter` | Vector | Browser persistence |
| `createOPFSVectorPersistenceAdapter`      | Vector | File system access  |
| `createHTTPVectorPersistenceAdapter`      | Vector | Remote storage      |

```ts
import {
	createIndexedDBVectorPersistenceAdapter,
	createOPFSVectorPersistenceAdapter,
	createHTTPVectorPersistenceAdapter,
} from '@mikesaintsg/adapters'

// IndexedDB persistence
const indexedDBPersistence = createIndexedDBVectorPersistenceAdapter({
	database: db,
	documentsStore: 'documents',
	metadataStore: 'metadata',
})

// OPFS persistence
const opfsPersistence = createOPFSVectorPersistenceAdapter({
	directory: opfsDirectory,
})

// HTTP persistence (remote storage)
const httpPersistence = createHTTPVectorPersistenceAdapter({
	baseURL: 'https://api.example.com/vectors',
	headers: { 'Authorization': `Bearer ${token}` },
})

// Provide to system through options
const store = await createVectorStore(embeddingAdapter, {
	persistence: indexedDBPersistence, // Opt-in to persistence
})
```

---

## Bridge Functions

Bridge functions connect different packages in the ecosystem.

### Tool Call Bridge

Connects inference tool calls to contextprotocol execution:

```ts
import { createToolCallBridge } from '@mikesaintsg/adapters'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { createEngine } from '@mikesaintsg/inference'

const registry = createToolRegistry(formatter)
registry.register(weatherTool, async (params) => {
	return await fetchWeather(params.city)
})

const bridge = createToolCallBridge({
	registry,
	timeout: 30_000,
	onError: (error, toolCall) => {
		console.error(`Tool ${toolCall.name} failed:`, error)
	},
})

// In generation loop - uses array overload
for await (const event of stream) {
	if (event.type === 'tool_calls') {
		const results = await bridge.execute(event.toolCalls)
		for (const result of results) {
			session.addToolResult(result)
		}
	}
}
```

### Retrieval Tool Factory

Creates a tool that queries a vector store:

```ts
import { createRetrievalTool } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const vectorStore = await createVectorStore(embeddingAdapter)

const retrievalTool = createRetrievalTool({
	vectorStore,
	name: 'search_knowledge',
	description: 'Search the knowledge base for relevant information',
	defaultLimit: 5,
	scoreThreshold: 0.7,
})

registry.register(retrievalTool.schema, retrievalTool.handler)
```

---

## Error Handling

### Error Codes

All adapter errors use the `AdapterErrorCode` type:

| Code                    | Description            | Recovery                                  |
|-------------------------|------------------------|-------------------------------------------|
| `AUTHENTICATION_ERROR`  | Invalid API key        | Verify API key is correct                 |
| `RATE_LIMIT_ERROR`      | Rate limit exceeded    | Wait and retry with backoff               |
| `QUOTA_EXCEEDED_ERROR`  | Usage quota exceeded   | Check billing, increase quota             |
| `NETWORK_ERROR`         | Network failure        | Check network, retry                      |
| `TIMEOUT_ERROR`         | Request timeout        | Increase timeout, retry                   |
| `INVALID_REQUEST_ERROR` | Malformed request      | Check request format                      |
| `MODEL_NOT_FOUND_ERROR` | Unknown model          | Use valid model name                      |
| `CONTEXT_LENGTH_ERROR`  | Context too long       | Truncate context                          |
| `CONTENT_FILTER_ERROR`  | Content blocked        | Modify content                            |
| `SERVICE_ERROR`         | Provider service error | Retry later                               |

### Error Handling Pattern

```ts
import { isAdapterError } from '@mikesaintsg/adapters'

try {
	const result = await session.generate()
} catch (error) {
	if (isAdapterError(error)) {
		switch (error.code) {
			case 'RATE_LIMIT_ERROR':
				const retryAfter = error.data?.retryAfter
				await sleep(retryAfter ?? 60_000)
				break
			case 'CONTEXT_LENGTH_ERROR':
				session.truncateHistory(10)
				break
		}
	}
}
```

---

## TypeScript Integration

### Type Imports

All types are imported from `@mikesaintsg/core`:

```ts
import type {
	// Adapter interfaces
	ProviderAdapterInterface,
	EmbeddingAdapterInterface,
	ToolFormatAdapterInterface,
	RetryAdapterInterface,
	RateLimitAdapterInterface,
	EmbeddingCacheAdapterInterface,
	BatchAdapterInterface,
	SimilarityAdapterInterface,
	RerankerAdapterInterface,
	VectorStorePersistenceAdapterInterface,
	// Data types
	Embedding,
	ToolCall,
	ToolResult,
	ToolSchema,
	Message,
	GenerationOptions,
} from '@mikesaintsg/core'
```

### Options Types

Options types are defined in `@mikesaintsg/adapters`:

```ts
import type {
	OpenAIProviderAdapterOptions,
	AnthropicProviderAdapterOptions,
	OllamaProviderAdapterOptions,
	NodeLlamaCppProviderAdapterOptions,
	NodeLlamaCppEmbeddingAdapterOptions,
	OpenAIEmbeddingAdapterOptions,
	VoyageEmbeddingAdapterOptions,
	ExponentialRetryAdapterOptions,
	LRUCacheAdapterOptions,
	BatchAdapterOptions,
} from '@mikesaintsg/adapters'
```

---

## Browser Compatibility

### Supported Environments

| Feature         | Chrome | Firefox | Safari | Edge |
|-----------------|--------|---------|--------|------|
| Fetch API       | ✅      | ✅       | ✅      | ✅    |
| Streaming (SSE) | ✅      | ✅       | ✅      | ✅    |
| IndexedDB       | ✅      | ✅       | ✅      | ✅    |
| OPFS            | ✅      | ✅       | ⚠️     | ✅    |
| Web Crypto      | ✅      | ✅       | ✅      | ✅    |

**Note:** Safari OPFS support is limited in private browsing.

---

## Integration with Ecosystem

### Complete Example

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { createContextBuilder } from '@mikesaintsg/contextbuilder'
import {
	createOpenAIProviderAdapter,
	createOpenAIEmbeddingAdapter,
	createOpenAIToolFormatAdapter,
	createIndexedDBVectorPersistenceAdapter,
	createExponentialRetryAdapter,
	createLRUCacheAdapter,
	createToolCallBridge,
	createRetrievalTool,
} from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'

// Create adapters
const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
})

const embedding = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'text-embedding-3-small',
})

const formatter = createOpenAIToolFormatAdapter()
const db = await createDatabase('my-app')

// Create systems
const engine = createEngine(provider)
const store = await createVectorStore(embedding, {
	persistence: createIndexedDBVectorPersistenceAdapter({ database: db }),
	retry: createExponentialRetryAdapter(),
	cache: createLRUCacheAdapter({ maxSize: 10000 }),
})

// Create tool registry with retrieval
const registry = createToolRegistry(formatter)
const retrievalTool = createRetrievalTool({
	vectorStore: store,
	name: 'search_docs',
	description: 'Search documentation',
})
registry.register(retrievalTool.schema, retrievalTool.handler)

// Create bridge for tool execution
const bridge = createToolCallBridge({ registry })

// Build context and generate
const session = engine.createSession({
	system: 'You are a helpful assistant with access to documentation.',
})

const stream = session.stream({ tools: registry.all() })
for await (const token of stream) {
	process.stdout.write(token)
}

const result = await stream.result()
if (result.toolCalls.length > 0) {
	const results = await bridge.execute(result.toolCalls)
	// Continue conversation with tool results...
}
```

---

## API Reference

### Factory Functions

#### Source Adapters

| Factory                              | Returns                     |
|--------------------------------------|-----------------------------|
| `createOpenAIProviderAdapter`        | `ProviderAdapterInterface`  |
| `createAnthropicProviderAdapter`     | `ProviderAdapterInterface`  |
| `createOllamaProviderAdapter`        | `ProviderAdapterInterface`  |
| `createNodeLlamaCppProviderAdapter`  | `ProviderAdapterInterface`  |
| `createOpenAIEmbeddingAdapter`       | `EmbeddingAdapterInterface` |
| `createVoyageEmbeddingAdapter`       | `EmbeddingAdapterInterface` |
| `createOllamaEmbeddingAdapter`       | `EmbeddingAdapterInterface` |
| `createNodeLlamaCppEmbeddingAdapter` | `EmbeddingAdapterInterface` |

#### Policy Adapters

| Factory                               | Returns                     |
|---------------------------------------|-----------------------------|
| `createExponentialRetryAdapter`       | `RetryAdapterInterface`     |
| `createLinearRetryAdapter`            | `RetryAdapterInterface`     |
| `createTokenBucketRateLimitAdapter`   | `RateLimitAdapterInterface` |
| `createSlidingWindowRateLimitAdapter` | `RateLimitAdapterInterface` |

#### Enhancement Adapters

| Factory                             | Returns                          |
|-------------------------------------|----------------------------------|
| `createLRUCacheAdapter`             | `EmbeddingCacheAdapterInterface` |
| `createTTLCacheAdapter`             | `EmbeddingCacheAdapterInterface` |
| `createIndexedDBCacheAdapter`       | `EmbeddingCacheAdapterInterface` |
| `createBatchAdapter`                | `BatchAdapterInterface`          |
| `createCohereRerankerAdapter`       | `RerankerAdapterInterface`       |
| `createCrossEncoderRerankerAdapter` | `RerankerAdapterInterface`       |

#### Transform Adapters

| Factory                            | Returns                      |
|------------------------------------|------------------------------|
| `createOpenAIToolFormatAdapter`    | `ToolFormatAdapterInterface` |
| `createAnthropicToolFormatAdapter` | `ToolFormatAdapterInterface` |
| `createCosineSimilarityAdapter`    | `SimilarityAdapterInterface` |
| `createDotSimilarityAdapter`       | `SimilarityAdapterInterface` |
| `createEuclideanSimilarityAdapter` | `SimilarityAdapterInterface` |

#### Persistence Adapters

| Factory                                    | Returns                                  |
|--------------------------------------------|------------------------------------------|
| `createIndexedDBSessionPersistenceAdapter` | `SessionPersistenceInterface`            |
| `createIndexedDBVectorPersistenceAdapter`  | `VectorStorePersistenceAdapterInterface` |
| `createOPFSVectorPersistenceAdapter`       | `VectorStorePersistenceAdapterInterface` |
| `createHTTPVectorPersistenceAdapter`       | `VectorStorePersistenceAdapterInterface` |

#### Context Builder Adapters

| Factory                           | Returns                         |
|-----------------------------------|---------------------------------|
| `createDeduplicationAdapter`      | `DeduplicationAdapterInterface` |
| `createPriorityTruncationAdapter` | `TruncationAdapterInterface`    |
| `createFIFOTruncationAdapter`     | `TruncationAdapterInterface`    |
| `createScoreTruncationAdapter`    | `TruncationAdapterInterface`    |
| `createPriorityAdapter`           | `PriorityAdapterInterface`      |

#### Bridge Functions

| Factory                | Returns                   |
|------------------------|---------------------------|
| `createToolCallBridge` | `ToolCallBridgeInterface` |
| `createRetrievalTool`  | `RetrievalToolInterface`  |

### Interface Summary

All interfaces are defined in `@mikesaintsg/core`. Key interfaces:

```ts
// Adapter interfaces
interface ProviderAdapterInterface {
	getId(): string
	generate(messages: readonly Message[], options: GenerationOptions): StreamHandleInterface
	supportsTools(): boolean
	supportsStreaming(): boolean
	getCapabilities(): ProviderCapabilities
}

interface EmbeddingAdapterInterface {
	embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]>
	getModelMetadata(): EmbeddingModelMetadata
}

interface ToolFormatAdapterInterface {
	formatSchemas(schemas: readonly ToolSchema[]): unknown
	parseToolCalls(response: unknown): readonly ToolCall[]
	formatResult(result: ToolResult): unknown
}

interface RetryAdapterInterface {
	shouldRetry(error: unknown, attempt: number): boolean
	getDelay(attempt: number): number
	getMaxAttempts(): number
}

interface RateLimitAdapterInterface {
	acquire(): Promise<void>
	release(): void
	getState(): RateLimitState
	setLimit(requestsPerMinute: number): void
}

// Bridge interfaces
interface ToolCallBridgeInterface {
	execute(toolCalls: ToolCall): Promise<ToolResult>
	execute(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	hasTool(name: string): boolean
}

interface RetrievalToolInterface {
	readonly schema: ToolSchema
	readonly handler: (args: Readonly<Record<string, unknown>>) => Promise<readonly unknown[]>
}
```

---

## License

MIT © [Mike Saints-G](https://github.com/mikesaintsg)

