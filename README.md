# @mikesaintsg/adapters

> **Zero-dependency adapter implementations for the @mikesaintsg ecosystem.**

[![npm version](https://img.shields.io/npm/v/@mikesaintsg/adapters.svg)](https://www.npmjs.com/package/@mikesaintsg/adapters)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mikesaintsg/adapters)](https://bundlephobia.com/package/@mikesaintsg/adapters)
[![license](https://img.shields.io/npm/l/@mikesaintsg/adapters.svg)](LICENSE)

---

## Features

- ✅ **Provider Adapters** — OpenAI, Anthropic, Ollama, node-llama-cpp, and HuggingFace for LLM chat completions
- ✅ **Embedding Adapters** — OpenAI, Voyage, Ollama, node-llama-cpp, and HuggingFace Transformers for text embeddings
- ✅ **Tool Format Adapters** — Convert tool schemas between provider formats
- ✅ **Persistence Adapters** — IndexedDB, OPFS, and HTTP for vector storage
- ✅ **ActionLoop Adapters** — Event and weight persistence for ActionLoop workflows
- ✅ **Policy Adapters** — Retry and rate limiting strategies
- ✅ **Enhancement Adapters** — Caching, batching for embeddings
- ✅ **Transform Adapters** — Similarity scoring algorithms
- ✅ **Context Builder Adapters** — Deduplication, truncation, priority
- ✅ **Zero dependencies** — Built entirely on native fetch API
- ✅ **TypeScript first** — Full type safety with strict mode
- ✅ **Tree-shakeable** — ESM-only, import what you need

---

## Installation

```bash
npm install @mikesaintsg/adapters
```

---

## Quick Start

```ts
import { createEngine } from '@mikesaintsg/inference'
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

// 4. Use policies adapters for resilience
const retry = createExponentialRetryAdapter({ maxAttempts: 3 })
const cache = createLRUCacheAdapter({ maxSize: 10000 })

// 5. Use the adapters
const embeddings = await embedding.embed(['Hello, world!'])
```

---

## Documentation

📚 **[Full API Guide](./guides/adapters.md)** — Comprehensive documentation with examples

### Key Sections

- [Introduction](./guides/adapters.md#introduction) — Value proposition and use cases
- [Quick Start](./guides/adapters.md#quick-start) — Get started in minutes
- [Provider Adapters](./guides/adapters.md#provider-adapters) — LLM providers
- [Embedding Adapters](./guides/adapters.md#embedding-adapters) — Vector generation
- [Policy Adapters](./guides/adapters.md#policy-adapters) — Retry and rate limiting
- [Enhancement Adapters](./guides/adapters.md#enhancement-adapters) — Caching and batching
- [Transform Adapters](./guides/adapters.md#transform-adapters) — Similarity scoring
- [Persistence Adapters](./guides/adapters.md#persistence-adapters) — Storage solutions
- [Error Handling](./guides/adapters.md#error-handling) — Error codes and recovery
- [API Reference](./guides/adapters.md#api-reference) — Complete API documentation

---

## API Overview

### Source Adapters — Providers

| Function                            | Description                        |
|-------------------------------------|------------------------------------|
| `createOpenAIProviderAdapter`       | OpenAI chat completions            |
| `createAnthropicProviderAdapter`    | Anthropic Claude models            |
| `createOllamaProviderAdapter`       | Ollama local LLM server            |
| `createNodeLlamaCppProviderAdapter` | node-llama-cpp local LLaMA models  |
| `createHuggingFaceProviderAdapter`  | HuggingFace Transformers local LLM |

### Source Adapters — Embeddings

| Function                             | Description                               |
|--------------------------------------|-------------------------------------------|
| `createOpenAIEmbeddingAdapter`       | OpenAI text embeddings                    |
| `createVoyageEmbeddingAdapter`       | Voyage AI embeddings (Anthropic rec.)     |
| `createOllamaEmbeddingAdapter`       | Ollama local embeddings                   |
| `createNodeLlamaCppEmbeddingAdapter` | node-llama-cpp local embeddings           |
| `createHuggingFaceEmbeddingAdapter`  | HuggingFace Transformers local embeddings |

### Policy Adapters

| Function                               | Description                       |
|----------------------------------------|-----------------------------------|
| `createExponentialRetryAdapter`        | Exponential backoff retry         |
| `createLinearRetryAdapter`             | Fixed delay retry                 |
| `createTokenBucketRateLimitAdapter`    | Token bucket rate limiting        |
| `createSlidingWindowRateLimitAdapter`  | Sliding window rate limiting      |

### Enhancement Adapters

| Function                       | Description                       |
|--------------------------------|-----------------------------------|
| `createLRUCacheAdapter`        | LRU eviction cache                |
| `createTTLCacheAdapter`        | TTL-only expiration cache         |
| `createIndexedDBCacheAdapter`  | Persistent browser cache          |
| `createBatchAdapter`           | Batching configuration            |

### Transform Adapters

| Function                            | Description                  |
|-------------------------------------|------------------------------|
| `createOpenAIToolFormatAdapter`     | Convert to OpenAI format     |
| `createAnthropicToolFormatAdapter`  | Convert to Anthropic format  |
| `createCosineSimilarityAdapter`     | Cosine similarity scoring    |
| `createDotSimilarityAdapter`        | Dot product similarity       |
| `createEuclideanSimilarityAdapter`  | Euclidean distance similarity|

### Context Builder Adapters

| Function                           | Description                       |
|------------------------------------|-----------------------------------|
| `createDeduplicationAdapter`       | Frame deduplication strategies    |
| `createPriorityTruncationAdapter`  | Priority-based truncation         |
| `createFIFOTruncationAdapter`      | Oldest-first truncation           |
| `createLIFOTruncationAdapter`      | Newest-first truncation           |
| `createScoreTruncationAdapter`     | Score-based truncation            |
| `createPriorityAdapter`            | Priority weight management        |

### Persistence Adapters

| Function                                   | Description                  |
|--------------------------------------------|------------------------------|
| `createIndexedDBSessionPersistenceAdapter` | Session storage in IndexedDB |
| `createIndexedDBVectorPersistenceAdapter`  | Vector storage in IndexedDB  |
| `createOPFSVectorPersistenceAdapter`       | Vector storage in OPFS       |
| `createHTTPVectorPersistenceAdapter`       | Remote vector storage        |

### ActionLoop Persistence Adapters

| Function                                   | Description                         |
|--------------------------------------------|-------------------------------------|
| `createIndexedDBEventPersistenceAdapter`   | ActionLoop events in IndexedDB      |
| `createIndexedDBWeightPersistenceAdapter`  | ActionLoop weights in IndexedDB     |
| `createInMemoryEventPersistenceAdapter`    | ActionLoop events in memory         |
| `createInMemoryWeightPersistenceAdapter`   | ActionLoop weights in memory        |

### Streaming Adapters

| Function                  | Description                           |
|---------------------------|---------------------------------------|
| `createStreamerAdapter`   | Universal token streaming adapter     |
| `createSSEParserAdapter`  | Server-Sent Events parsing            |

---

## Examples

### OpenAI Provider

```ts
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createOpenAIProviderAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  defaultOptions: {
    temperature: 0.7,
    maxTokens: 4096,
  },
})

const engine = createEngine(provider)
const session = engine.createSession({ system: 'You are helpful.' })
```

### node-llama-cpp Provider (Local LLaMA)

```ts
import { getLlama } from 'node-llama-cpp'
import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

// Consumer initializes node-llama-cpp
const llama = await getLlama()
const model = await llama.loadModel({ modelPath: './llama-3-8b.gguf' })
const context = await model.createContext()

// Pass to adapter - no node-llama-cpp runtime dependency in @mikesaintsg/adapters
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

### node-llama-cpp Embedding (Local)

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

**Note:** node-llama-cpp is **not** a runtime dependency of @mikesaintsg/adapters. Consumers must install node-llama-cpp themselves and pass initialized context objects. This allows consumers who don't use node-llama-cpp to avoid installing it.

### HuggingFace Transformers Embedding (Browser/Node.js)

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
```

**Note:** @huggingface/transformers is **not** a runtime dependency of @mikesaintsg/adapters. Consumers must install @huggingface/transformers themselves and pass an initialized pipeline. This allows consumers who don't use HuggingFace to avoid installing it.

### HuggingFace Transformers Provider (Browser/Node.js)

```ts
import { pipeline } from '@huggingface/transformers'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

// Consumer initializes the pipeline (downloads model on first use)
const generator = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-135M-Instruct')

// Pass to adapter
const provider = createHuggingFaceProviderAdapter({
  pipeline: generator,
  modelName: 'SmolLM2-135M-Instruct',
  defaultOptions: {
    maxTokens: 100,
    temperature: 0.7,
  },
})

const engine = createEngine(provider)
const session = engine.createSession({ system: 'You are helpful.' })
```

**Tool Calling:** Enable tool calling with Qwen or Hermes-style models:
```ts
import { pipeline } from '@huggingface/transformers'

// Use a model with chat template support (e.g., Qwen)
const generator = await pipeline('text-generation', 'Qwen/Qwen2.5-0.5B-Instruct')

const provider = createHuggingFaceProviderAdapter({
  pipeline: generator,
  modelName: 'Qwen2.5-0.5B-Instruct',
  enableTools: true, // Enable tool calling
})
```

**Note:** Tool calling requires a model with `apply_chat_template` support. The adapter parses Hermes-style tool call output format: `<tool_call>{"name": "func", "arguments": {...}}</tool_call>`

### Policy Adapters (Retry & Rate Limiting)

```ts
import {
  createExponentialRetryAdapter,
  createTokenBucketRateLimitAdapter,
} from '@mikesaintsg/adapters'

// Exponential backoff with jitter
const retry = createExponentialRetryAdapter({
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  onRetry: (error, attempt, delayMs) => {
    console.warn(`Retry ${attempt}, waiting ${delayMs}ms`)
  },
})

// Token bucket rate limiting
const rateLimit = createTokenBucketRateLimitAdapter({
  requestsPerMinute: 60,
  maxConcurrent: 10,
})
```

### Enhancement Adapters (Cache & Batch)

```ts
import {
  createLRUCacheAdapter,
  createBatchAdapter,
} from '@mikesaintsg/adapters'

// LRU cache with TTL
const cache = createLRUCacheAdapter({
  maxSize: 10000,
  ttlMs: 3600000, // 1 hour
})

// Batching configuration
const batch = createBatchAdapter({
  batchSize: 100,
  delayMs: 50,
  deduplicate: true,
})
```

### Transform Adapters (Similarity)

```ts
import {
  createCosineSimilarityAdapter,
  createDotSimilarityAdapter,
} from '@mikesaintsg/adapters'

const cosine = createCosineSimilarityAdapter()
const dot = createDotSimilarityAdapter()

const a = new Float32Array([0.1, 0.2, 0.3])
const b = new Float32Array([0.2, 0.3, 0.4])

const cosineSim = cosine.compute(a, b) // 0.9925...
const dotSim = dot.compute(a, b) // 0.2
```

### Context Builder Adapters

```ts
import {
  createDeduplicationAdapter,
  createPriorityTruncationAdapter,
  createPriorityAdapter,
} from '@mikesaintsg/adapters'

// Deduplication with strategy
const dedup = createDeduplicationAdapter({
  strategy: 'keep_highest_priority',
})

// Priority-based truncation
const truncation = createPriorityTruncationAdapter({
  preserveSystem: true,
})

// Priority weights
const priority = createPriorityAdapter({
  weights: { critical: 5000, high: 500 },
})
```

### Streaming Adapters

```ts
import { createStreamerAdapter } from '@mikesaintsg/adapters'

// Basic streamer adapter for token emission
const streamer = createStreamerAdapter()
const unsub = streamer.onToken((token) => process.stdout.write(token))
streamer.emit('Hello')
streamer.emit(' world!')
streamer.end()
unsub()
```

### Error Handling

```ts
import { isAdapterError } from '@mikesaintsg/adapters'

try {
  const result = await session.generate()
} catch (error) {
  if (isAdapterError(error)) {
    switch (error.data.code) {
      case 'RATE_LIMIT_ERROR':
        const retryAfter = error.data.retryAfter ?? 60000
        await new Promise(r => setTimeout(r, retryAfter))
        break
      case 'AUTHENTICATION_ERROR':
        console.error('Invalid API key')
        break
    }
  }
}
```

---

## Ecosystem Integration

| Package                     | Integration                              |
|-----------------------------|------------------------------------------|
| `@mikesaintsg/core`         | Shared types and interfaces              |
| `@mikesaintsg/inference`    | Engine and session management            |
| `@mikesaintsg/vectorstore`  | Vector store for embeddings              |
| `@mikesaintsg/indexeddb`    | Database access for persistence adapters |

See [Integration with Ecosystem](./guides/adapters.md#integration-with-ecosystem) for details.

---

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome  | 89+             |
| Firefox | 90+             |
| Safari  | 15+             |
| Edge    | 89+             |

---

## Contributing

Contributions are welcome! Please read the [contributing guidelines](CONTRIBUTING.md) first.

---

## License

MIT © [Mike Saints-G](https://github.com/mikesaintsg)
