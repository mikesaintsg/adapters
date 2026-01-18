# @mikesaintsg/adapters

> **Zero-dependency adapter implementations for the @mikesaintsg ecosystem.**

[![npm version](https://img.shields.io/npm/v/@mikesaintsg/adapters.svg)](https://www.npmjs.com/package/@mikesaintsg/adapters)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mikesaintsg/adapters)](https://bundlephobia.com/package/@mikesaintsg/adapters)
[![license](https://img.shields.io/npm/l/@mikesaintsg/adapters.svg)](LICENSE)

---

## Features

- ✅ **Provider Adapters** — OpenAI, Anthropic, and Ollama for LLM chat completions
- ✅ **Embedding Adapters** — OpenAI, Voyage, and Ollama for text embeddings
- ✅ **Tool Format Adapters** — Convert tool schemas between provider formats
- ✅ **Persistence Adapters** — IndexedDB, OPFS, and HTTP for vector storage
- ✅ **Policy Adapters** — Retry and rate limiting strategies
- ✅ **Zero dependencies** — Built entirely on native fetch API
- ✅ **TypeScript first** — Full type safety with strict mode
- ✅ **Tree-shakeable** — ESM-only, import what you need

---

## Installation

```bash
npm install @mikesaintsg/adapters @mikesaintsg/core
```

---

## Quick Start

```ts
import { createEngine } from '@mikesaintsg/inference'
import {
  createOpenAIProviderAdapter,
  createOpenAIEmbeddingAdapter,
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

// 3. Create engine with provider
const engine = createEngine(provider)

// 4. Use the adapters
const embeddings = await embedding.embed(['Hello, world!'])
```

---

## Documentation

📚 **[Full API Guide](./guides/adapters.md)** — Comprehensive documentation with examples

### Key Sections

- [Introduction](./guides/adapters.md#introduction) — Value proposition and use cases
- [Quick Start](./guides/adapters.md#quick-start) — Get started in minutes
- [Source Adapters](./guides/adapters.md#source-adapters) — Provider and embedding adapters
- [Policy Adapters](./guides/adapters.md#policy-adapters) — Retry and rate limiting
- [Persistence Adapters](./guides/adapters.md#persistence-adapters) — Storage solutions
- [Error Handling](./guides/adapters.md#error-handling) — Error codes and recovery
- [API Reference](./guides/adapters.md#api-reference) — Complete API documentation

---

## API Overview

### Provider Adapters

| Function                           | Description                        |
|------------------------------------|------------------------------------|
| `createOpenAIProviderAdapter`      | OpenAI chat completions            |
| `createAnthropicProviderAdapter`   | Anthropic Claude models            |
| `createOllamaProviderAdapter`      | Ollama local LLM server            |

### Embedding Adapters

| Function                        | Description                           |
|---------------------------------|---------------------------------------|
| `createOpenAIEmbeddingAdapter`  | OpenAI text embeddings                |
| `createVoyageEmbeddingAdapter`  | Voyage AI embeddings (Anthropic rec.) |
| `createOllamaEmbeddingAdapter`  | Ollama local embeddings               |
| `createBatchedEmbeddingAdapter` | Automatic request batching            |
| `createCachedEmbeddingAdapter`  | In-memory embedding cache             |

### Tool Format Adapters

| Function                            | Description                  |
|-------------------------------------|------------------------------|
| `createOpenAIToolFormatAdapter`     | Convert to OpenAI format     |
| `createAnthropicToolFormatAdapter`  | Convert to Anthropic format  |

### Persistence Adapters

| Function                               | Description                  |
|----------------------------------------|------------------------------|
| `createIndexedDBSessionPersistence`    | Session storage in IndexedDB |
| `createIndexedDBVectorStorePersistence`| Vector storage in IndexedDB  |
| `createOPFSVectorStorePersistence`     | Vector storage in OPFS       |
| `createHTTPVectorStorePersistence`     | Remote vector storage        |

### Utilities

| Function             | Description                    |
|----------------------|--------------------------------|
| `createRateLimiter`  | Request rate limiting          |
| `createSSEParser`    | Server-Sent Events parsing     |
| `withRetry`          | Retry wrapper for operations   |

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

### Embedding with Caching

```ts
import {
  createOpenAIEmbeddingAdapter,
  createCachedEmbeddingAdapter,
} from '@mikesaintsg/adapters'
import type { CachedEmbedding } from '@mikesaintsg/adapters'

const baseAdapter = createOpenAIEmbeddingAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
})

const cached = createCachedEmbeddingAdapter({
  adapter: baseAdapter,
  cache: new Map<string, CachedEmbedding>(),
  ttlMs: 60 * 60 * 1000, // 1 hour
})

// Second call uses cache
const e1 = await cached.embed(['Hello'])
const e2 = await cached.embed(['Hello']) // Cached!
```

### Error Handling

```ts
import { isAdapterError, AdapterError } from '@mikesaintsg/adapters'

try {
  const result = await session.generate()
} catch (error) {
  if (isAdapterError(error)) {
    switch (error.code) {
      case 'RATE_LIMIT_ERROR':
        const retryAfter = error.retryAfter ?? 60000
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
