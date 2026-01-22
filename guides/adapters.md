# @mikesaintsg/adapters API Guide

> **Zero-dependency adapter implementations for the @mikesaintsg ecosystem.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Provider Adapters](#provider-adapters)
6. [Streaming Adapters](#streaming-adapters)
7. [Embedding Adapters](#embedding-adapters)
8. [Policy Adapters](#policy-adapters)
9. [Enhancement Adapters](#enhancement-adapters)
10. [Transform Adapters](#transform-adapters)
11. [Persistence Adapters](#persistence-adapters)
12. [Context Builder Adapters](#context-builder-adapters)
13. [workflowbuilder Adapters](#workflowbuilder-adapters)
14. [Error Handling](#error-handling)
15. [TypeScript Integration](#typescript-integration)
16. [Performance Tips](#performance-tips)
17. [Browser Compatibility](#browser-compatibility)
18. [Integration with Ecosystem](#integration-with-ecosystem)
19. [API Reference](#api-reference)
20. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/adapters` provides:

- **Provider integrations** — OpenAI, Anthropic, Ollama, node-llama-cpp, HuggingFace for LLM generation
- **Embedding integrations** — OpenAI, Voyage, Ollama, node-llama-cpp, HuggingFace for vector generation
- **Streaming by default** — All providers stream natively with SSE parsing built-in
- **Policy adapters** — Retry strategies and rate limiting
- **Enhancement adapters** — Caching, batching, and reranking
- **Transform adapters** — Tool format conversion and similarity scoring
- **Persistence adapters** — IndexedDB, OPFS, and HTTP storage
- **Context builder adapters** — Deduplication, truncation, and priority
- **workflowbuilder adapters** — Event and weight persistence for workflow engines
- **Zero dependencies** — Built entirely on native `fetch` API

### Package Role

This package is the **implementation home** for all adapter interfaces defined in `@mikesaintsg/core`. Systems in other packages accept adapters as parameters; this package provides the concrete implementations.

```
┌─────────────────────────────────────────────────────────────────┐
│                     @mikesaintsg/core                           │
│  Defines:  ProviderAdapterInterface, EmbeddingAdapterInterface,  │
│           RetryAdapterInterface, RateLimitAdapterInterface,     │
│           TokenStreamerAdapterInterface, etc.                   │
├─────────────────────────────────────────────────────────────────┤
│                    @mikesaintsg/adapters                        │
│  Implements: createOpenAIProviderAdapter, createLRUCacheAdapter,│
│              createTokenStreamer, createSSEParser, etc.         │
├─────────────────────────────────────────────────────────────────┤
│  @mikesaintsg/inference  │  @mikesaintsg/vectorstore  │  ...     │
│  Consumes adapters via   │  Consumes adapters via     │         │
│  factory first parameter │  factory first parameter   │         │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use This Package

| Scenario                              | Use @mikesaintsg/adapters | Use Custom Implementation |
|---------------------------------------|---------------------------|---------------------------|
| OpenAI, Anthropic, Ollama integration | ✅                         |                           |
| Standard retry/rate limiting          | ✅                         |                           |
| LRU/TTL caching                       | ✅                         |                           |
| IndexedDB/OPFS persistence            | ✅                         |                           |
| Custom token streaming behavior       | ✅ (custom streamer)       |                           |
| Proprietary LLM provider              |                           | ✅ (implement interface)   |
| Custom caching strategy               |                           | ✅ (implement interface)   |
| Domain-specific persistence           |                           | ✅ (implement interface)   |

---

## Installation

```bash
npm install @mikesaintsg/adapters @mikesaintsg/core
```

For full ecosystem integration:

```bash
npm install @mikesaintsg/adapters @mikesaintsg/core @mikesaintsg/inference @mikesaintsg/vectorstore
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

// 1. Create provider adapter (required by inference)
// Streaming is native — no configuration needed
const provider = createOpenAIProviderAdapter({
	apiKey:  process.env. OPENAI_API_KEY! ,
	model: 'gpt-4o',
})

// 2. Create embedding adapter (required by vectorstore)
const embedding = createOpenAIEmbeddingAdapter({
	apiKey: process.env. OPENAI_API_KEY!,
	model: 'text-embedding-3-small',
})

// 3. Create engine — required adapter is first parameter
const engine = createEngine(provider)

// 4. Create vector store — required adapter is first parameter, optional adapters in options
const store = await createVectorStore(embedding, {
	retry: createExponentialRetryAdapter({ maxAttempts: 3 }),
	cache: createLRUCacheAdapter({ maxSize: 10000 }),
})

// 5. Use the systems — streamers works out of the box
const session = engine.createSession({ system: 'You are helpful.' })
session.addMessage('user', 'Hello!')

// Stream tokens as they arrive
const stream = session.stream()
for await (const token of stream) {
	process.stdout.write(token)
}

const result = await stream.result()
```

---

## Core Concepts

### The Port Pattern

Adapters implement the **port pattern** — interfaces define contracts in `@mikesaintsg/core`, implementations live in `@mikesaintsg/adapters`. Systems accept interfaces, not concrete types.

```ts
// Interface defined in @mikesaintsg/core
interface ProviderAdapterInterface {
	getId(): string
	generate(messages: readonly Message[], options:  GenerationOptions): StreamHandleInterface
}

// Implementation in @mikesaintsg/adapters
const provider = createOpenAIProviderAdapter({ apiKey, model:  'gpt-4o' })

// System accepts interface, not implementation
const engine = createEngine(provider) // provider:  ProviderAdapterInterface
```

### Adapter Categories

| Category        | Purpose                         | Interfaces                                                                            | Examples                        |
|-----------------|---------------------------------|---------------------------------------------------------------------------------------|---------------------------------|
| **Provider**    | LLM text generation (streaming) | `ProviderAdapterInterface`                                                            | OpenAI, Anthropic, Ollama       |
| **Embedding**   | Vector generation               | `EmbeddingAdapterInterface`                                                           | OpenAI, Voyage, HuggingFace     |
| **Streaming**   | Token emission and stream parsing | `TokenStreamerAdapterInterface`, `SSEParserAdapterInterface`, `NDJSONParserAdapterInterface` | TokenStreamer, SSE parser, NDJSON parser |
| **Policy**      | Request behavior                | `RetryAdapterInterface`, `RateLimitAdapterInterface`                                  | Exponential retry, Token bucket |
| **Enhancement** | Added capabilities              | `EmbeddingCacheAdapterInterface`, `BatchAdapterInterface`, `RerankerAdapterInterface` | LRU cache, Cohere reranker      |
| **Transform**   | Format conversion               | `ToolFormatAdapterInterface`, `SimilarityAdapterInterface`                            | OpenAI tools, Cosine similarity |
| **Persistence** | Data storage                    | `VectorStorePersistenceAdapterInterface`, `SessionPersistenceInterface`               | IndexedDB, OPFS, HTTP           |

### Factory Pattern

All adapters are created via factory functions.  **Required adapters are the first parameter; optional adapters are in the options object.**

```ts
// ✅ CORRECT:  Required adapter first, optional in options
const engine = createEngine(providerAdapter, {
	retry: retryAdapter,         // Optional
	rateLimit: rateLimitAdapter, // Optional
})

const store = await createVectorStore(embeddingAdapter, {
	persistence: persistenceAdapter, // Optional
	cache: cacheAdapter,             // Optional
})

// ❌ WRONG: All adapters in options
const engine = createEngine({
	provider: providerAdapter,
	retry: retryAdapter,
})
```

### Streaming Architecture

All provider adapters stream by default. Streaming adapters handle the token emission pipeline.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Provider Adapter                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Server-side (OpenAI, Anthropic)                        │   │
│  │  fetch() → SSE Parser Adapter → Streamer Adapter        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Local NDJSON (Ollama)                                  │   │
│  │  fetch() → NDJSON parsing → Streamer Adapter            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Local callback (node-llama-cpp, HuggingFace)           │   │
│  │  Generator/TextStreamer → Streamer Adapter              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     StreamHandleInterface                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  for await (const token of stream) { ... }                │ │
│  │  stream.onToken((token) => { ... })                       │ │
│  │  stream.result() → Promise<GenerationResult>              │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Streaming by Provider Type:**

| Provider Type  | Streaming Format                | Streaming Adapter Used    |
|----------------|---------------------------------|---------------------------|
| OpenAI         | SSE (Server-Sent Events)        | SSE Parser → Streamer     |
| Anthropic      | SSE (Server-Sent Events)        | SSE Parser → Streamer     |
| Ollama         | NDJSON (Newline Delimited JSON) | NDJSON Parser → Streamer  |
| node-llama-cpp | AsyncGenerator (local)          | Direct → Streamer         |
| HuggingFace    | TextStreamer callback (local)   | Callback → Streamer       |

**Key principles:**

1. **TokenStreamer is the main primitive** — Providers create TokenStreamers per-request
2. **SSE/NDJSON parsers are format transformers** — Used to parse raw stream data into structured events
3. **Factories for customization** — Pass `tokenStreamerFactory` or `sseParserFactory` to use custom implementations
4. **No streaming flags** — No `stream: true`, no `supportsStreaming()` checks

### Streaming Adapters

Streaming adapters are composable primitives for token emission and stream parsing. Each adapter has a `create()` method that returns a new instance per request.

| Adapter       | Interface                        | Factory                 | Purpose                       |
|---------------|----------------------------------|-------------------------|-------------------------------|
| TokenStreamer | `TokenStreamerAdapterInterface`  | `createTokenStreamer()` | Token accumulation & emission |
| SSEParser     | `SSEParserAdapterInterface`      | `createSSEParser()`     | Parse SSE streams             |
| NDJSONParser  | `NDJSONParserAdapterInterface`   | `createNDJSONParser()`  | Parse NDJSON streams          |

**Adapter pattern:**
- Factory functions return adapter instances with a `create()` method
- Call `create()` with request-specific options to get a per-request instance
- Providers store the adapter and call `create()` internally for each generation

### Opt-In Design

All optional adapters are **opt-in** — nothing is enabled by default: 

```ts
// Minimal:  Just required adapter
const store = await createVectorStore(embeddingAdapter)

// With enhancements:  Opt-in to specific capabilities
const store = await createVectorStore(embeddingAdapter, {
	persistence: createIndexedDBVectorPersistenceAdapter({ database }),
	retry: createExponentialRetryAdapter(),
	cache: createLRUCacheAdapter({ maxSize: 10000 }),
	reranker: createCohereRerankerAdapter({ apiKey }),
})
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       Your Application                          │
│                              │                                  │
│                              ▼                                  │
├─────────────────────────────────────────────────────────────────┤
│                         Systems Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  inference  │  │ vectorstore │  │     contextbuilder      │ │
│  │   Engine    │  │ VectorStore │  │ Builder + ToolRegistry  │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │                │
├─────────┴────────────────┴─────────────────────┴────────────────┤
│                       Adapters Layer                            │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Provider │ │Embedding │ │ Policy │ │  Enhance │ │ Persist │ │
│  │ (stream) │ │          │ │ Retry  │ │  Cache   │ │IndexedDB│ │
│  │ OpenAI   │ │ OpenAI   │ │ Rate   │ │  Batch   │ │  OPFS   │ │
│  │Anthropic │ │ Voyage   │ │ Limit  │ │ Reranker │ │  HTTP   │ │
│  │ Ollama   │ │HuggingFace│ │        │ │          │ │         │ │
│  └────┬─────┘ └────┬─────┘ └────────┘ └──────────┘ └─────────┘ │
│       │            │                                            │
├───────┴────────────┴────────────────────────────────────────────┤
│                    External Services / Storage                  │
│  OpenAI API │ Anthropic API │ Ollama │ IndexedDB │ OPFS │ HTTP │
└─────────────────────────────────────────────────────────────────┘
```

### Interface Ownership

| Interface                                | Defined In | Implemented In |
|------------------------------------------|------------|----------------|
| `ProviderAdapterInterface`               | `core`     | `adapters`     |
| `EmbeddingAdapterInterface`              | `core`     | `adapters`     |
| `TokenStreamerAdapterInterface`          | `adapters` | `adapters`     |
| `SSEParserAdapterInterface`              | `adapters` | `adapters`     |
| `NDJSONParserAdapterInterface`           | `adapters` | `adapters`     |
| `RetryAdapterInterface`                  | `core`     | `adapters`     |
| `RateLimitAdapterInterface`              | `core`     | `adapters`     |
| `EmbeddingCacheAdapterInterface`         | `core`     | `adapters`     |
| `BatchAdapterInterface`                  | `core`     | `adapters`     |
| `RerankerAdapterInterface`               | `core`     | `adapters`     |
| `SimilarityAdapterInterface`             | `core`     | `adapters`     |
| `ToolFormatAdapterInterface`             | `core`     | `adapters`     |
| `VectorStorePersistenceAdapterInterface` | `core`     | `adapters`     |
| `SessionPersistenceInterface`            | `core`     | `adapters`     |
| `DeduplicationAdapterInterface`          | `core`     | `adapters`     |
| `TruncationAdapterInterface`             | `core`     | `adapters`     |
| `PriorityAdapterInterface`               | `core`     | `adapters`     |

---

## Provider Adapters

Provider adapters implement `ProviderAdapterInterface` for LLM text generation.  They are the **required first parameter** to `createEngine()`. All providers stream natively with SSE parsing built-in. 

### Supported Providers

| Factory                             | Provider       | Environment   | Tools          |
|-------------------------------------|----------------|---------------|----------------|
| `createOpenAIProviderAdapter`       | OpenAI         | Cloud         | ✅              |
| `createAnthropicProviderAdapter`    | Anthropic      | Cloud         | ✅              |
| `createOllamaProviderAdapter`       | Ollama         | Local         | ✅              |
| `createNodeLlamaCppProviderAdapter` | node-llama-cpp | Local         | ❌              |
| `createHuggingFaceProviderAdapter`  | HuggingFace    | Local/Browser | ✅ (opt-in)     |

### Streaming Behavior

All provider adapters stream by default. No configuration required: 

```ts
const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
})

const engine = createEngine(provider)
const session = engine.createSession({ system: 'You are helpful.' })

session.addMessage('user', 'Tell me a story.')

// Streaming is automatic
const stream = session.stream()

for await (const token of stream) {
	process.stdout. write(token) // Tokens arrive as generated
}

const result = await stream.result()
console.log('\nFinish reason:', result.finishReason)
```

### Custom Streamer Adapter

Provide a custom streamer to control token emission. Streamers implement `TokenStreamerAdapterInterface` from `@mikesaintsg/adapters`.

```ts
import { createTokenStreamer } from '@mikesaintsg/adapters'

// Create custom streamer adapter
const customStreamer = createTokenStreamer()

const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
	streamer: customStreamer, // Use custom streamer
})

// The provider calls streamer.create() internally for each request
// You can also create instances manually:
const handle = customStreamer.create('request-id', new AbortController())
handle.onToken((token) => {
	console.log(`[TOKEN] ${JSON.stringify(token)}`)
})
```

### Custom SSE Parser Adapter

For server-side providers (OpenAI, Anthropic), you can provide a custom SSE parser. SSE parsers implement `SSEParserAdapterInterface` from `@mikesaintsg/adapters`.

```ts
import { createSSEParser } from '@mikesaintsg/adapters'

// Create custom SSE parser adapter
const customSSEParser = createSSEParser()

const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
	parser: customSSEParser, // Use custom SSE parser
})

// The provider calls parser.create() internally with callbacks:
const parserInstance = customSSEParser.create({
	lineDelimiter: '\n',      // Optional custom delimiter
	eventDelimiter: '\n\n',   // Optional custom delimiter
	onEvent: (event) => console.log('SSE event:', event),
	onError: (error) => console.error('Parse error:', error),
	onEnd: () => console.log('Stream ended'),
})

// Feed chunks from response body
parserInstance.feed('data: {"content": "Hello"}\n\n')
parserInstance.end()
```

### Custom NDJSON Parser Adapter

For Ollama, you can provide a custom NDJSON parser. NDJSON parsers implement `NDJSONParserAdapterInterface` from `@mikesaintsg/adapters`.

```ts
import { createNDJSONParser } from '@mikesaintsg/adapters'

// Create custom NDJSON parser adapter
const customNDJSONParser = createNDJSONParser()

const provider = createOllamaProviderAdapter({
	model: 'llama3',
	parser: customNDJSONParser, // Use custom NDJSON parser
})

// The provider calls parser.create() internally with callbacks:
const parserInstance = customNDJSONParser.create({
	onObject: (obj) => console.log('JSON object:', obj),
	onError: (error) => console.error('Parse error:', error),
	onEnd: () => console.log('Stream ended'),
})

// Feed chunks from response body
parserInstance.feed('{"message":{"content":"Hi"}}\n')
parserInstance.end()
```

**Note:** SSE parsers are used by OpenAI and Anthropic. NDJSON parsers are used by Ollama. Local providers (node-llama-cpp, HuggingFace) handle streaming internally.

### OpenAI

```ts
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
	organization: 'org-xxx', // Optional
	baseURL: 'https://api.openai.com/v1', // Optional
	defaultOptions: {
		temperature: 0.7,
		maxTokens: 4096,
	},
	streamer: customStreamer, // Optional:  custom streamer
})

const engine = createEngine(provider)
```

### Anthropic

```ts
import { createAnthropicProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createAnthropicProviderAdapter({
	apiKey: process. env.ANTHROPIC_API_KEY! ,
	model:  'claude-3-5-sonnet-20241022',
	baseURL: 'https://api.anthropic.com', // Optional
	defaultOptions: {
		temperature: 0.7,
		maxTokens: 4096,
	},
	streamer:  customStreamer, // Optional: custom streamer
})

const engine = createEngine(provider)
```

### Ollama (Local Development)

Ollama runs models locally without API costs — ideal for development and testing.

```ts
import { createOllamaProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createOllamaProviderAdapter({
	model: 'llama3',
	baseURL:  'http://localhost:11434', // Default
	keepAlive: true,
	timeout: 120000,
	streamer:  customStreamer, // Optional: custom streamer
})

const engine = createEngine(provider)
```

**Common Ollama models:** `llama3`, `llama3: 70b`, `mistral`, `mixtral`, `codellama`, `deepseek-coder`, `phi`, `gemma2`

### node-llama-cpp (Local GGUF Models)

Runs LLaMA models locally using llama. cpp bindings.  **Consumers must install `node-llama-cpp` and pass initialized instances.**

```ts
import { getLlama } from 'node-llama-cpp'
import { createNodeLlamaCppProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

// Consumer initializes node-llama-cpp
const llama = await getLlama()
const model = await llama. loadModel({ modelPath: './llama-3-8b. gguf' })
const context = await model.createContext()

// Pass initialized context to adapter
const provider = createNodeLlamaCppProviderAdapter({
	context,
	modelName: 'llama3',
	defaultOptions: {
		temperature: 0.7,
		maxTokens: 4096,
	},
	streamer: customStreamer, // Optional:  custom streamer
})

const engine = createEngine(provider)
```

**Key benefits:**
- No runtime dependency on `node-llama-cpp` in this package
- Full control over model loading and context lifecycle
- Use any GGUF-format model

### HuggingFace Transformers (Browser/Node.js)

Runs models locally using `@huggingface/transformers`. **Consumers must install `@huggingface/transformers` and pass an initialized pipeline.** The adapter uses the model's streaming capabilities internally.

```ts
import { pipeline } from '@huggingface/transformers'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

// Consumer initializes the pipeline
const generator = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-135M-Instruct')

// Pass to adapter
const provider = createHuggingFaceProviderAdapter({
	pipeline: generator,
	modelName: 'SmolLM2-135M-Instruct',
	defaultOptions: {
		maxTokens: 100,
		temperature: 0.7,
	},
	streamer: customStreamer, // Optional: custom streamer
})

const engine = createEngine(provider)
```

**Tool Calling with Qwen Models:**

Enable tool calling with models that support `apply_chat_template` (e.g., Qwen):

```ts
import { pipeline } from '@huggingface/transformers'
import { createHuggingFaceProviderAdapter } from '@mikesaintsg/adapters'

// Use a model with chat template support
const generator = await pipeline('text-generation', 'Qwen/Qwen2.5-0.5B-Instruct')

const provider = createHuggingFaceProviderAdapter({
	pipeline: generator,
	modelName: 'Qwen2.5-0.5B-Instruct',
	enableTools: true, // Enable tool calling
})
```

**Note:** Tool calling requires a model with `apply_chat_template` support. The adapter parses Hermes-style tool call output format: `<tool_call>{"name": "func", "arguments": {...}}</tool_call>`

**Common HuggingFace models:**
- **Small/Fast:** `HuggingFaceTB/SmolLM2-135M-Instruct`, `HuggingFaceTB/SmolLM2-360M-Instruct`
- **Tool-capable:** `Qwen/Qwen2.5-0.5B-Instruct`, `Qwen/Qwen2.5-1.5B-Instruct`
- **Legacy:** `Xenova/gpt2`, `Xenova/distilgpt2`, `Xenova/TinyLlama-1.1B-Chat-v1.0`

---

## Streaming Adapters

Streaming adapters handle token emission and stream parsing during LLM generation. The streaming architecture uses composable primitives with a factory pattern:

- **TokenStreamer** — Accumulates tokens, manages subscriptions, builds final results
- **SSEParser** — Parses Server-Sent Events chunks into events (OpenAI, Anthropic)
- **NDJSONParser** — Parses Newline-Delimited JSON chunks into objects (Ollama)

### Adapter Pattern

Each streaming adapter follows a consistent pattern:

1. **Factory function** returns an adapter with a `create()` method
2. **`create()`** returns a new instance configured for a specific request
3. **Providers store adapters** and call `create()` internally per request

```ts
// Adapter pattern example
const adapter = createTokenStreamer()           // Returns adapter with create()
const handle = adapter.create('req-id', ctrl)   // Returns instance for this request
```

### Adapter Overview

| Adapter       | Interface                       | Factory                  | Purpose                       |
|---------------|---------------------------------|--------------------------|-------------------------------|
| TokenStreamer | `TokenStreamerAdapterInterface` | `createTokenStreamer()`  | Token accumulation & emission |
| SSEParser     | `SSEParserAdapterInterface`     | `createSSEParser()`      | Parse SSE streams             |
| NDJSONParser  | `NDJSONParserAdapterInterface`  | `createNDJSONParser()`   | Parse NDJSON streams          |

### TokenStreamer

The TokenStreamer manages token streaming for a generation request. The adapter's `create()` method returns instances that implement `StreamHandleInterface` with additional producer methods.

**Consumer API:** (from `StreamHandleInterface`)
- `result()` — Get final generation result
- `abort()` — Cancel the stream
- `onToken(callback)` — Subscribe to tokens
- `onComplete(callback)` — Subscribe to completion
- `onError(callback)` — Subscribe to errors
- `[Symbol.asyncIterator]` — Iterate over tokens

**Producer API:** (for providers)
- `emit(token)` — Emit a token
- `appendText(text)` — Append text without emitting
- `startToolCall()`, `appendToolCallArguments()`, `updateToolCall()` — Build tool calls
- `setFinishReason()`, `setUsage()` — Set metadata
- `complete()`, `setError()`, `setAborted()` — Signal completion

```ts
import { createTokenStreamer } from '@mikesaintsg/adapters'

// Create adapter (done once, stored by provider)
const streamerAdapter = createTokenStreamer()

// Create instance per request (done internally by providers)
const abortController = new AbortController()
const handle = streamerAdapter.create('request-123', abortController)

// Consumer usage (what users see)
handle.onToken((token: string) => process.stdout.write(token))

// Async iteration
for await (const token of handle) {
	process.stdout.write(token)
}

// Producer usage (internal to providers)
handle.emit('Hello')
handle.emit(' world')
handle.complete()

const result = await handle.result()
console.log(result.text) // 'Hello world'
```

### SSEParser

The SSEParser parses Server-Sent Events format used by OpenAI and Anthropic APIs. The adapter's `create()` method returns parser instances configured with callbacks.

```ts
import { createSSEParser } from '@mikesaintsg/adapters'
import type { SSEEvent } from '@mikesaintsg/core'

// Create adapter (done once, stored by provider)
const sseAdapter = createSSEParser()

// Create parser instance per request with callbacks
const parser = sseAdapter.create({
	onEvent: (event: SSEEvent) => {
		if (event.data === '[DONE]') return
		const chunk = JSON.parse(event.data)
		console.log('Content:', chunk.choices[0]?.delta?.content)
	},
	onError: (error: Error) => console.error('Parse error:', error),
	onEnd: () => console.log('Stream complete'),
})

// Feed chunks from fetch response
const response = await fetch('https://api.openai.com/v1/chat/completions', {
	// ... options
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
	const { done, value } = await reader.read()
	if (done) break
	parser.feed(decoder.decode(value, { stream: true }))
}

parser.end()
```

### NDJSONParser

The NDJSONParser parses Newline-Delimited JSON format used by Ollama. The adapter's `create()` method returns parser instances configured with callbacks.

```ts
import { createNDJSONParser } from '@mikesaintsg/adapters'

// Create adapter (done once, stored by provider)
const ndjsonAdapter = createNDJSONParser()

// Create parser instance per request with callbacks
const parser = ndjsonAdapter.create({
	onObject: (obj: unknown) => {
		const chunk = obj as { message?: { content?: string } }
		if (chunk.message?.content) {
			console.log('Content:', chunk.message.content)
		}
	},
	onError: (error: Error) => console.error('Parse error:', error),
	onEnd: () => console.log('Stream complete'),
})

// Feed chunks from fetch response
parser.feed('{"message":{"content":"Hello"}}\n')
parser.end()
```

### Custom Streaming Adapters

Providers accept custom streaming adapters via options. Pass your adapter instance and the provider calls `create()` internally:

```ts
import {
	createOpenAIProviderAdapter,
	createOllamaProviderAdapter,
	createTokenStreamer,
	createSSEParser,
	createNDJSONParser,
} from '@mikesaintsg/adapters'

// Custom adapters (could be custom implementations)
const customStreamer = createTokenStreamer()
const customSSEParser = createSSEParser()
const customNDJSONParser = createNDJSONParser()

// OpenAI/Anthropic: pass streamer and SSE parser
const openaiProvider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
	streamer: customStreamer,      // TokenStreamerAdapterInterface
	parser: customSSEParser,       // SSEParserAdapterInterface
})

// Ollama: pass streamer and NDJSON parser
const ollamaProvider = createOllamaProviderAdapter({
	model: 'llama3',
	streamer: customStreamer,      // TokenStreamerAdapterInterface
	parser: customNDJSONParser,    // NDJSONParserAdapterInterface
})
```

### File Structure

Streaming implementations are in `src/core/streamers/`:

```
@mikesaintsg/adapters/
  src/
    core/
      streamers/
        TokenStreamer.ts   # TokenStreamer class
        SSEParser.ts       # SSEParser class
        NDJSONParser.ts    # NDJSONParser class
        index.ts           # Barrel exports
```

---

## Embedding Adapters

Embedding adapters implement `EmbeddingAdapterInterface` for vector generation. They are the **required first parameter** to `createVectorStore()`.

### Supported Providers

| Factory                              | Provider       | Environment   | Dimensions      |
|--------------------------------------|----------------|---------------|-----------------|
| `createOpenAIEmbeddingAdapter`       | OpenAI         | Cloud         | 256–3072        |
| `createVoyageEmbeddingAdapter`       | Voyage AI      | Cloud         | 1024            |
| `createOllamaEmbeddingAdapter`       | Ollama         | Local         | Model-dependent |
| `createNodeLlamaCppEmbeddingAdapter` | node-llama-cpp | Local         | Model-dependent |
| `createHuggingFaceEmbeddingAdapter`  | HuggingFace    | Local/Browser | Model-dependent |

### OpenAI

```ts
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const embedding = createOpenAIEmbeddingAdapter({
	apiKey: process.env. OPENAI_API_KEY!,
	model: 'text-embedding-3-small',
	dimensions: 1536, // Optional dimension reduction
	baseURL: 'https://api.openai.com/v1', // Optional
})

const store = await createVectorStore(embedding)

// EmbeddingAdapterInterface:  array in, array out
const embeddings = await embedding.embed(['Hello, world!', 'Another text'])
// Returns: readonly Embedding[] (Float32Array[])
```

### Voyage AI

Voyage AI is the recommended embedding provider for Anthropic users. 

```ts
import { createVoyageEmbeddingAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const embedding = createVoyageEmbeddingAdapter({
	apiKey: process. env.VOYAGE_API_KEY!,
	model: 'voyage-3',
	inputType: 'document', // or 'query' for search queries
	baseURL: 'https://api.voyageai.com/v1', // Optional
})

const store = await createVectorStore(embedding)
```

**Voyage models:** `voyage-3`, `voyage-3-lite`, `voyage-code-3`, `voyage-finance-2`, `voyage-law-2`, `voyage-multilingual-2`

### Ollama (Local Development)

```ts
import { createOllamaEmbeddingAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const embedding = createOllamaEmbeddingAdapter({
	model: 'nomic-embed-text',
	baseURL: 'http://localhost:11434', // Default
	timeout: 60000,
})

const store = await createVectorStore(embedding)
```

**Ollama embedding models:** `nomic-embed-text` (768d), `mxbai-embed-large` (1024d), `all-minilm` (384d), `snowflake-arctic-embed`

### node-llama-cpp (Local GGUF Models)

```ts
import { getLlama } from 'node-llama-cpp'
import { createNodeLlamaCppEmbeddingAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

// Consumer initializes node-llama-cpp
const llama = await getLlama()
const model = await llama.loadModel({ modelPath: './nomic-embed-text.gguf' })
const embeddingContext = await model.createEmbeddingContext()

// Pass initialized context to adapter
const embedding = createNodeLlamaCppEmbeddingAdapter({
	embeddingContext,
	modelName: 'nomic-embed-text',
	dimensions: 768, // Optional, auto-detected if not provided
})

const store = await createVectorStore(embedding)
```

### HuggingFace Transformers (Browser/Node.js)

```ts
import { pipeline } from '@huggingface/transformers'
import { createHuggingFaceEmbeddingAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

// Consumer initializes the pipeline
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

// Pass to adapter
const embedding = createHuggingFaceEmbeddingAdapter({
	pipeline:  extractor,
	modelName: 'all-MiniLM-L6-v2',
	dimensions: 384,
	pooling: 'mean',  // 'mean' | 'cls' | 'none'
	normalize: true,  // Normalize to unit length
})

const store = await createVectorStore(embedding)
```

**Pooling strategies:**

| Strategy | Description                    | Use Case                       |
|----------|--------------------------------|--------------------------------|
| `mean`   | Mean pooling across all tokens | Most sentence embedding models |
| `cls`    | Use CLS token embedding        | BERT-style models              |
| `none`   | No pooling (full sequence)     | Advanced use cases             |

**HuggingFace embedding models:** `Xenova/all-MiniLM-L6-v2` (384d), `Xenova/all-mpnet-base-v2` (768d), `Xenova/bge-small-en-v1.5` (384d), `Xenova/gte-small` (384d)

---

## Policy Adapters

Policy adapters control **how** operations are executed — retry behavior and rate limiting. 

### Retry Adapters

Retry adapters implement `RetryAdapterInterface`.

#### Exponential Retry

```ts
import { createExponentialRetryAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const retry = createExponentialRetryAdapter({
	maxAttempts: 5,
	initialDelayMs: 1000,
	maxDelayMs: 30000,
	backoffMultiplier: 2,
	jitter: true, // Add randomness to prevent thundering herd
	retryableCodes: ['RATE_LIMIT_ERROR', 'NETWORK_ERROR', 'TIMEOUT_ERROR'],
	onRetry: (error, attempt, delayMs) => {
		console.warn(`Retry ${attempt}, waiting ${delayMs}ms: `, error)
	},
})

const store = await createVectorStore(embedding, { retry })
```

#### Linear Retry

```ts
import { createLinearRetryAdapter } from '@mikesaintsg/adapters'

const retry = createLinearRetryAdapter({
	maxAttempts: 3,
	delayMs: 2000, // Fixed delay between attempts
	retryableCodes: ['RATE_LIMIT_ERROR', 'NETWORK_ERROR'],
	onRetry: (error, attempt, delayMs) => {
		console.warn(`Retry ${attempt}:`, error)
	},
})
```

### Rate Limit Adapters

Rate limit adapters implement `RateLimitAdapterInterface`.

#### Token Bucket

```ts
import { createTokenBucketRateLimitAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const rateLimit = createTokenBucketRateLimitAdapter({
	requestsPerMinute: 60,
	maxConcurrent: 10,
	burstSize: 10, // Tokens added per refill
})

const store = await createVectorStore(embedding, { rateLimit })

// Check state
const state = rateLimit.getState()
console.log(`Active:  ${state.activeRequests}/${state.maxConcurrent}`)
```

#### Sliding Window

```ts
import { createSlidingWindowRateLimitAdapter } from '@mikesaintsg/adapters'

const rateLimit = createSlidingWindowRateLimitAdapter({
	requestsPerMinute: 100,
	windowMs: 60000,
})

// Dynamic adjustment
rateLimit.setLimit(200) // Increase limit at runtime
```

### Circuit Breaker Adapters

Circuit breaker adapters implement `CircuitBreakerAdapterInterface` to prevent cascading failures.

```ts
import { createCircuitBreakerAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const circuitBreaker = createCircuitBreakerAdapter({
	failureThreshold: 5,      // Open after 5 failures
	successThreshold: 3,      // Close after 3 successes in half-open
	resetTimeoutMs: 30000,    // Try half-open after 30s
	monitorWindowMs: 60000,   // Count failures in 60s window
	onStateChange: (state, previous) => {
		console.log(`Circuit ${previous} → ${state}`)
	},
})

const engine = createEngine(provider, { circuitBreaker })

// Check state before operations
if (circuitBreaker.canExecute()) {
	const result = await engine.generate(messages)
} else {
	// Use fallback or cached response
	return fallbackResponse
}

// Get circuit state
const state = circuitBreaker.getState()
console.log(`Circuit: ${state.state}, failures: ${state.failureCount}`)

// Manual control
circuitBreaker.open()  // Force open
circuitBreaker.close() // Force close
circuitBreaker.reset() // Reset counters and close
```

### Telemetry Adapters

Telemetry adapters implement `TelemetryAdapterInterface` for observability.

#### Console Telemetry

```ts
import { createConsoleTelemetryAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const telemetry = createConsoleTelemetryAdapter({
	level: 'info',           // 'debug' | 'info' | 'warn' | 'error'
	prefix: '[inference]',
	includeTimestamp: true,
	includeSpanId: true,
})

const engine = createEngine(provider, { telemetry })
```

#### No-Op Telemetry (Production)

```ts
import { createNoOpTelemetryAdapter } from '@mikesaintsg/adapters'

// Disable telemetry in production for performance
const telemetry = createNoOpTelemetryAdapter()

const engine = createEngine(provider, { telemetry })
```

---

## Enhancement Adapters

Enhancement adapters add capabilities to systems — caching, batching, and reranking.

### Cache Adapters

Cache adapters implement `EmbeddingCacheAdapterInterface`.

#### LRU Cache

```ts
import { createLRUCacheAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const cache = createLRUCacheAdapter({
	maxSize: 10000,
	ttlMs: 3600000, // 1 hour
	onEvict: (text, embedding) => {
		console.log(`Evicted: ${text. slice(0, 50)}...`)
	},
})

const store = await createVectorStore(embedding, { cache })
```

#### TTL Cache

```ts
import { createTTLCacheAdapter } from '@mikesaintsg/adapters'

const cache = createTTLCacheAdapter({
	ttlMs: 86400000, // 24 hours
})
```

#### IndexedDB Cache (Persistent)

```ts
import { createIndexedDBCacheAdapter } from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'

const db = await createDatabase({ name: 'cache', version: 1 })

const cache = createIndexedDBCacheAdapter({
	database: db,
	storeName: 'embedding_cache',
	ttlMs: 604800000, // 7 days
})

const store = await createVectorStore(embedding, { cache })
```

### Batch Adapter

```ts
import { createBatchAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const batch = createBatchAdapter({
	batchSize: 100,
	delayMs: 50,
	deduplicate: true, // Remove duplicate texts within batch
})

const store = await createVectorStore(embedding, { batch })
```

### Reranker Adapters

Reranker adapters implement `RerankerAdapterInterface` for two-stage retrieval.

#### Cohere Reranker

```ts
import { createCohereRerankerAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const reranker = createCohereRerankerAdapter({
	apiKey: process.env.COHERE_API_KEY!,
	model: 'rerank-english-v3.0',
	baseURL: 'https://api.cohere.ai/v1', // Optional
})

const store = await createVectorStore(embedding, { reranker })

// Two-stage search:  vector search → rerank
const results = await store.search('query', {
	limit: 10,
	rerank: true,
	rerankTopK: 50, // Retrieve 50, rerank to top 10
})
```

#### Cross-Encoder Reranker (Local)

```ts
import { createCrossEncoderRerankerAdapter } from '@mikesaintsg/adapters'

const reranker = createCrossEncoderRerankerAdapter({
	model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
	modelPath: './models/reranker. onnx', // Optional
})
```

---

## Transform Adapters

Transform adapters convert between data formats. 

### Tool Format Adapters

Tool format adapters implement `ToolFormatAdapterInterface` for converting tool schemas to provider-specific formats. 

#### OpenAI Tool Format

```ts
import { createOpenAIToolFormatAdapter } from '@mikesaintsg/adapters'
import { createToolRegistry } from '@mikesaintsg/contextbuilder'

const formatter = createOpenAIToolFormatAdapter({
	toolChoice: 'auto', // 'none' | 'required' | { type: 'function', function: { name: string } }
})

const registry = createToolRegistry(formatter)

// Convert schemas to OpenAI format
const openAITools = formatter.formatSchemas(registry. all())

// Parse tool calls from OpenAI response
const toolCalls = formatter.parseToolCalls(openAIResponse)

// Format result for OpenAI
const formattedResult = formatter.formatResult(toolResult)
```

#### Anthropic Tool Format

```ts
import { createAnthropicToolFormatAdapter } from '@mikesaintsg/adapters'

const formatter = createAnthropicToolFormatAdapter({
	toolChoice: 'auto', // 'auto' | 'any' | { type: 'tool', name: string }
})
```

### Similarity Adapters

Similarity adapters implement `SimilarityAdapterInterface` for vector comparison.

```ts
import {
	createCosineSimilarityAdapter,
	createDotSimilarityAdapter,
	createEuclideanSimilarityAdapter,
} from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

// Cosine similarity (recommended for normalized vectors)
const cosine = createCosineSimilarityAdapter()

// Dot product similarity
const dot = createDotSimilarityAdapter()

// Euclidean distance (converted to similarity)
const euclidean = createEuclideanSimilarityAdapter()

const store = await createVectorStore(embedding, {
	similarity: cosine,
})
```

| Adapter   | Formula                   | Best For                                |
|-----------|---------------------------|-----------------------------------------|
| Cosine    | `dot(a,b) / (‖a‖ × ‖b‖)`  | Normalized vectors, semantic similarity |
| Dot       | `dot(a,b)`                | Pre-normalized vectors                  |
| Euclidean | `1 / (1 + distance(a,b))` | Absolute distance matters               |

---

## Persistence Adapters

Persistence adapters store and load data across sessions. All persistence adapters extend the base `PersistenceAdapterInterface` which provides `isAvailable()` and `clear()` methods.

### VectorStore Persistence

VectorStore persistence adapters implement `VectorStorePersistenceAdapterInterface` (extends `PersistenceAdapterInterface`).

#### IndexedDB

```ts
import { createIndexedDBVectorPersistenceAdapter } from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const db = await createDatabase({
	name: 'vectors',
	version:  1,
	stores: {
		documents: { keyPath: 'id' },
		metadata: { keyPath:  'key' },
	},
})

const persistence = createIndexedDBVectorPersistenceAdapter({
	database: db,
	documentsStore: 'documents',
	metadataStore: 'metadata',
})

const store = await createVectorStore(embedding, { persistence })
```

#### OPFS (Origin Private File System)

```ts
import { createOPFSVectorPersistenceAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const root = await navigator.storage.getDirectory()
const directory = await root.getDirectoryHandle('vectors', { create: true })

const persistence = createOPFSVectorPersistenceAdapter({
	directory,
	chunkSize: 100, // Documents per file
})

const store = await createVectorStore(embedding, { persistence })
```

#### HTTP (Remote Storage)

```ts
import { createHTTPVectorPersistenceAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const persistence = createHTTPVectorPersistenceAdapter({
	baseURL: 'https://api.example.com/vectors',
	headers: { 'Authorization': `Bearer ${token}` },
	timeout: 30000,
})

const store = await createVectorStore(embedding, { persistence })
```

### Session Persistence

Session persistence adapters implement `SessionPersistenceInterface` (extends `PersistenceAdapterInterface`).

```ts
import { createIndexedDBSessionPersistenceAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const persistence = createIndexedDBSessionPersistenceAdapter({
	databaseName: 'sessions',
	storeName: 'sessions',
	ttlMs: 604800000, // 7 days
})

const engine = createEngine(provider, {
	sessionPersistence: persistence,
})
```

### Adapter Selection Guide

| Adapter           | Persistence | Capacity    | Speed             | Use Case                   |
|-------------------|-------------|-------------|-------------------|----------------------------|
| IndexedDB Vector  | ✅           | ~500MB–2GB  | Medium            | General browser storage    |
| OPFS Vector       | ✅           | Large files | Fast              | Large datasets, file-based |
| HTTP Vector       | ✅           | Unlimited   | Network-dependent | Shared/cloud storage       |
| IndexedDB Session | ✅           | ~500MB–2GB  | Medium            | Session persistence        |

---

## Context Builder Adapters

Context builder adapters help manage and optimize context windows for LLM prompts. They handle deduplication, truncation, and priority ordering.

### Deduplication Adapters

Deduplication adapters implement `DeduplicationAdapterInterface` for removing duplicate content frames.

```ts
import { createDeduplicationAdapter } from '@mikesaintsg/adapters'

const dedup = createDeduplicationAdapter({
	strategy: 'keep_highest_priority', // or 'keep_latest', 'keep_first'
})

// Select which frame to keep from duplicates
const selected = dedup.select(duplicateFrames)

// Check if a frame should be preserved
const preserve = dedup.shouldPreserve(frame)
```

**Strategies:**

| Strategy                | Description                          |
|-------------------------|--------------------------------------|
| `keep_highest_priority` | Keep the frame with highest priority |
| `keep_latest`           | Keep the most recent frame           |
| `keep_first`            | Keep the first frame encountered     |

### Truncation Adapters

Truncation adapters implement `TruncationAdapterInterface` for removing content when context exceeds limits.

```ts
import {
	createFIFOTruncationAdapter,
	createLIFOTruncationAdapter,
	createPriorityTruncationAdapter,
	createScoreTruncationAdapter,
} from '@mikesaintsg/adapters'

// FIFO: Oldest first (good for chat history)
const fifo = createFIFOTruncationAdapter({ preserveSystem: true })

// LIFO: Newest first (unusual, but available)
const lifo = createLIFOTruncationAdapter({ preserveSystem: true })

// Priority: Low priority first (recommended)
const priority = createPriorityTruncationAdapter({ preserveSystem: true })

// Score: Low score first
const score = createScoreTruncationAdapter({ preserveSystem: true })
```

**Truncation Types:**

| Adapter  | Removal Order    | Best For                              |
|----------|------------------|---------------------------------------|
| FIFO     | Oldest first     | Chat history, chronological data      |
| LIFO     | Newest first     | Specialized use cases                 |
| Priority | Low priority     | Mixed content with varying importance |
| Score    | Low score first  | Search results, ranked content        |

### Priority Adapters

Priority adapters implement `PriorityAdapterInterface` for managing content priority weights.

```ts
import { createPriorityAdapter } from '@mikesaintsg/adapters'

const priority = createPriorityAdapter({
	weights: {
		critical: 100,
		high: 75,
		normal: 50,
		low: 25,
		optional: 10,
	},
})

// Get weight for a priority level
const weight = priority.getWeight('high') // 75

// Compare two frames by priority
const comparison = priority.compare(frameA, frameB)
```

---

## WorkflowBuilder Adapters

WorkflowBuilder adapters provide persistence for recommendation graphs and workflow state in the `@mikesaintsg/workflowbuilder` package.

### Weight Persistence

Weight persistence adapters implement `WeightPersistenceAdapterInterface` for storing recommendation graph weights.

#### IndexedDB Weight Persistence

```ts
import { createIndexedDBWeightPersistenceAdapter } from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'
import { createRecommendationGraph } from '@mikesaintsg/workflowbuilder'

const db = await createDatabase('workflow-app')
const weightPersistence = createIndexedDBWeightPersistenceAdapter({
	database: db,
	storeName: 'weights', // optional, defaults to 'workflowbuilder_weights'
})

// Use with recommendation graph
const recommendation = createRecommendationGraph(procedural, {
	persistence: weightPersistence,
})

// Load on startup
await recommendation.loadWeights()

// Save periodically
await recommendation.saveWeights()
```

#### In-Memory Weight Persistence

```ts
import { createInMemoryWeightPersistenceAdapter } from '@mikesaintsg/adapters'

const weightPersistence = createInMemoryWeightPersistenceAdapter()

// Use with recommendation graph (no persistence across sessions)
const recommendation = createRecommendationGraph(procedural, {
	persistence: weightPersistence,
})
```

### Execution Persistence

Store workflow execution state for resumption.

#### IndexedDB Execution Persistence

```ts
import { createIndexedDBExecutionPersistenceAdapter } from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'

const db = await createDatabase('workflow-app')
const executionPersistence = createIndexedDBExecutionPersistenceAdapter({
	database: db,
	storeName: 'executions',
})

// Use with orchestrator
const orchestrator = createWorkflowOrchestrator(procedural, recommendation, {
	executionPersistence,
})
```

### WorkflowBuilder Adapter Selection Guide

| Adapter              | Persistence | Use Case                        |
|----------------------|-------------|---------------------------------|
| IndexedDB Weight     | ✅           | Production weight persistence   |
| In-Memory Weight     | ❌           | Testing, development            |
| IndexedDB Execution  | ✅           | Resume workflows across sessions|

---


## Error Handling

### Error Codes

All adapter errors use the `AdapterErrorCode` type:

| Code                    | Description            | Recovery                      |
|-------------------------|------------------------|-------------------------------|
| `AUTHENTICATION_ERROR`  | Invalid API key        | Verify API key is correct     |
| `RATE_LIMIT_ERROR`      | Rate limit exceeded    | Wait and retry with backoff   |
| `QUOTA_EXCEEDED_ERROR`  | Usage quota exceeded   | Check billing, increase quota |
| `NETWORK_ERROR`         | Network failure        | Check network, retry          |
| `TIMEOUT_ERROR`         | Request timeout        | Increase timeout, retry       |
| `INVALID_REQUEST_ERROR` | Malformed request      | Check request format          |
| `MODEL_NOT_FOUND_ERROR` | Unknown model          | Use valid model name          |
| `CONTEXT_LENGTH_ERROR`  | Context too long       | Truncate context              |
| `CONTENT_FILTER_ERROR`  | Content blocked        | Modify content                |
| `SERVICE_ERROR`         | Provider service error | Retry later                   |
| `UNKNOWN_ERROR`         | Unexpected error       | Check logs, report bug        |

### Error Data Structure

```ts
interface AdapterErrorData {
	readonly code: AdapterErrorCode
	readonly providerCode?: string  // Original provider error code
	readonly retryAfter?: number    // Milliseconds (for rate limits)
	readonly context?:  Readonly<Record<string, unknown>>
}
```

### Error Handling Patterns

```ts
import { isAdapterError } from '@mikesaintsg/adapters'

try {
	const result = await session.generate()
} catch (error) {
	if (isAdapterError(error)) {
		switch (error.data.code) {
			case 'RATE_LIMIT_ERROR':
				const retryAfter = error.data.retryAfter ??  60000
				console.log(`Rate limited. Retrying in ${retryAfter}ms`)
				await sleep(retryAfter)
				break
				
			case 'CONTEXT_LENGTH_ERROR': 
				console.log('Context too long, truncating...')
				session.truncateHistory(10)
				break
				
			case 'AUTHENTICATION_ERROR':
				console.error('Invalid API key')
				throw error // Cannot recover
				
			case 'NETWORK_ERROR':
			case 'TIMEOUT_ERROR':
				console.log('Network issue, retrying...')
				// Retry logic handled by retry adapter
				break
				
			default: 
				console.error(`[${error.data. code}]:  ${error.message}`)
				if (error.data. providerCode) {
					console.error(`Provider code: ${error.data.providerCode}`)
				}
		}
	} else {
		throw error // Unknown error
	}
}
```

### Using Retry Adapter for Automatic Recovery

```ts
import { createExponentialRetryAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const retry = createExponentialRetryAdapter({
	maxAttempts: 3,
	retryableCodes: ['RATE_LIMIT_ERROR', 'NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_ERROR'],
	onRetry: (error, attempt, delayMs) => {
		if (isAdapterError(error)) {
			console.warn(`[${error.data. code}] Retry ${attempt} in ${delayMs}ms`)
		}
	},
})

const store = await createVectorStore(embedding, { retry })
// Automatic retry on retryable errors
```

---

## TypeScript Integration

### Type Imports

All interface types come from `@mikesaintsg/core` and `@mikesaintsg/adapters`:

```ts
import type {
	// Adapter interfaces (from @mikesaintsg/core)
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
	SessionPersistenceInterface,
	DeduplicationAdapterInterface,
	TruncationAdapterInterface,
	PriorityAdapterInterface,
} from '@mikesaintsg/core'

import type {
	// Streaming interfaces (from @mikesaintsg/adapters)
	TokenStreamerAdapterInterface,
	SSEParserAdapterInterface,
	NDJSONParserAdapterInterface,
	// Data types
	Embedding,
	ToolCall,
	ToolResult,
	ToolSchema,
	Message,
	GenerationOptions,
	GenerationDefaults,
	StreamHandleInterface,
	MinimalDatabaseAccess,
	MinimalDirectoryAccess,
	Unsubscribe,
} from '@mikesaintsg/core'
```

Options types come from `@mikesaintsg/adapters`:

```ts
import type {
	// Provider options
	OpenAIProviderAdapterOptions,
	AnthropicProviderAdapterOptions,
	OllamaProviderAdapterOptions,
	NodeLlamaCppProviderAdapterOptions,
	HuggingFaceProviderAdapterOptions,
	// Embedding options
	OpenAIEmbeddingAdapterOptions,
	VoyageEmbeddingAdapterOptions,
	OllamaEmbeddingAdapterOptions,
	NodeLlamaCppEmbeddingAdapterOptions,
	HuggingFaceEmbeddingAdapterOptions,
	// Policy options
	ExponentialRetryAdapterOptions,
	LinearRetryAdapterOptions,
	TokenBucketRateLimitAdapterOptions,
	SlidingWindowRateLimitAdapterOptions,
	// Cache options
	LRUCacheAdapterOptions,
	TTLCacheAdapterOptions,
	IndexedDBCacheAdapterOptions,
	// Other options
	BatchAdapterOptions,
	CohereRerankerAdapterOptions,
	CrossEncoderRerankerAdapterOptions,
	// Persistence options
	IndexedDBVectorPersistenceOptions,
	OPFSVectorPersistenceOptions,
	HTTPVectorPersistenceOptions,
	IndexedDBSessionPersistenceOptions,
	// Error types
	AdapterErrorCode,
	AdapterErrorData,
} from '@mikesaintsg/adapters'
```

### Factory Function Types

```ts
import type {
	// Provider factories
	CreateOpenAIProviderAdapter,
	CreateAnthropicProviderAdapter,
	CreateOllamaProviderAdapter,
	CreateNodeLlamaCppProviderAdapter,
	CreateHuggingFaceProviderAdapter,
	// Embedding factories
	CreateOpenAIEmbeddingAdapter,
	CreateVoyageEmbeddingAdapter,
	CreateOllamaEmbeddingAdapter,
	CreateNodeLlamaCppEmbeddingAdapter,
	CreateHuggingFaceEmbeddingAdapter,
	// Streaming factories
	CreateTokenStreamerAdapter,
	CreateSSEParserAdapter,
	CreateNDJSONParserAdapter,
	// Policy factories
	CreateExponentialRetryAdapter,
	CreateLinearRetryAdapter,
	CreateTokenBucketRateLimitAdapter,
	CreateSlidingWindowRateLimitAdapter,
	// Enhancement factories
	CreateLRUCacheAdapter,
	CreateTTLCacheAdapter,
	CreateIndexedDBCacheAdapter,
	CreateBatchAdapter,
	CreateCohereRerankerAdapter,
	CreateCrossEncoderRerankerAdapter,
	// Transform factories
	CreateOpenAIToolFormatAdapter,
	CreateAnthropicToolFormatAdapter,
	CreateCosineSimilarityAdapter,
	CreateDotSimilarityAdapter,
	CreateEuclideanSimilarityAdapter,
	// Persistence factories
	CreateIndexedDBVectorPersistence,
	CreateHTTPVectorPersistence,
	CreateIndexedDBSessionPersistence,
	// Context builder factories
	CreateDeduplicationAdapter,
	CreatePriorityTruncationAdapter,
	CreateFIFOTruncationAdapter,
	CreateScoreTruncationAdapter,
	CreatePriorityAdapter,
} from '@mikesaintsg/adapters'
```

### Streamer Interface

```ts
// Defined in @mikesaintsg/adapters
interface TokenStreamerAdapterInterface extends StreamHandleInterface {
	readonly requestId: string
	/** Emit a token */
	emit(token: string): void
	/** Append text without emitting */
	appendText(text: string): void
	/** Start a tool call */
	startToolCall(index: number, id: string, name: string): void
	/** Append arguments to a tool call */
	appendToolCallArguments(index: number, args: string): void
	/** Update tool call incrementally */
	updateToolCall(index: number, delta: ToolCallDelta): void
	/** Set the finish reason */
	setFinishReason(reason: FinishReason): void
	/** Set usage statistics */
	setUsage(usage: UsageStats): void
	/** Set error and reject */
	setError(error: Error): void
	/** Set aborted state */
	setAborted(): void
	/** Signal completion */
	complete(): void
	/** Create a new instance for a request */
	create(requestId: string, abortController: AbortController): TokenStreamerAdapterInterface
}
```

### Minimal External Interfaces

For adapters that accept external dependencies (node-llama-cpp, HuggingFace), minimal interfaces are defined to avoid runtime dependencies:

```ts
// Consumers pass initialized instances matching these interfaces
interface NodeLlamaCppContext {
	getSequence(): NodeLlamaCppContextSequence
	readonly model: NodeLlamaCppModel
}

interface HuggingFaceFeatureExtractionPipeline {
	(texts: string | readonly string[], options?: HuggingFaceFeatureExtractionOptions): Promise<HuggingFaceTensor>
	dispose? (): Promise<void>
}

interface HuggingFaceTextGenerationPipeline {
	(texts: string | readonly string[], options?: HuggingFaceTextGenerationOptions): Promise<HuggingFaceTextGenerationOutput | readonly HuggingFaceTextGenerationOutput[]>
	readonly model?:  HuggingFacePreTrainedModel
	readonly tokenizer?: HuggingFaceTokenizer
	dispose?(): Promise<void>
}
```

---

## Performance Tips

1. **Use caching for repeated embeddings** — Cache hits avoid API calls entirely: 

```ts
const cache = createLRUCacheAdapter({ maxSize: 10000, ttlMs: 3600000 })
const store = await createVectorStore(embedding, { cache })
// Repeated texts return cached embeddings
```

2. **Batch embedding requests** — Reduce API round trips:

```ts
const batch = createBatchAdapter({ batchSize: 100, deduplicate: true })
const store = await createVectorStore(embedding, { batch })
// Multiple adds are batched into fewer API calls
```

3. **Use local adapters for development** — Avoid API costs during testing:

```ts
// Development:  Ollama (free, local)
const devEmbedding = createOllamaEmbeddingAdapter({ model: 'nomic-embed-text' })

// Production: OpenAI (paid, cloud)
const prodEmbedding = createOpenAIEmbeddingAdapter({ apiKey, model: 'text-embedding-3-small' })

const embedding = process.env.NODE_ENV === 'development' ? devEmbedding : prodEmbedding
```

4. **Configure rate limiting to match provider limits** — Prevent 429 errors: 

```ts
// OpenAI tier 1: 60 RPM
const rateLimit = createTokenBucketRateLimitAdapter({ requestsPerMinute: 50 })

// Leave headroom below actual limit
```

5. **Use exponential backoff with jitter** — Prevent thundering herd: 

```ts
const retry = createExponentialRetryAdapter({
	jitter: true, // Randomize delays
	backoffMultiplier: 2,
})
```

6. **Prefer IndexedDB over OPFS for small-medium datasets** — Better browser support: 

```ts
// IndexedDB:  ~500MB–2GB, excellent browser support
const persistence = createIndexedDBVectorPersistenceAdapter({ database })

// OPFS:  Larger capacity, but Safari support is limited
```

7. **Use two-stage retrieval for quality** — Vector search + reranking: 

```ts
const reranker = createCohereRerankerAdapter({ apiKey })
const store = await createVectorStore(embedding, { reranker })

// Retrieve 50, rerank to top 10
const results = await store.search(query, { limit: 10, rerankTopK: 50 })
```

8. **Custom streamer for UI batching** — Batch tokens before rendering:

```ts
const streamerAdapter = createTokenStreamer()

const provider = createOpenAIProviderAdapter({
	apiKey,
	model: 'gpt-4o',
	streamer: streamerAdapter,
})

// Provider calls streamerAdapter.create() internally for each request
// The returned handle receives tokens and you can subscribe to them

const stream = provider.generate(messages, { maxTokens: 100 })
let buffer = ''
stream.onToken((token) => {
	buffer += token
	if (buffer.length >= 10 || token.includes(' ')) {
		updateUI(buffer)
		buffer = ''
	}
})
```
	streamer: customStreamer,
})
```

---

## Browser Compatibility

| Feature         | Chrome | Firefox | Safari | Edge | Notes                              |
|-----------------|--------|---------|--------|------|------------------------------------|
| Fetch API       | ✅      | ✅       | ✅      | ✅    | Required for all cloud adapters    |
| Streaming (SSE) | ✅      | ✅       | ✅      | ✅    | Native to all providers            |
| IndexedDB       | ✅      | ✅       | ✅      | ✅    | Persistence adapters               |
| OPFS            | ✅      | ✅       | ⚠️     | ✅    | Limited in Safari private browsing |
| Web Crypto      | ✅      | ✅       | ✅      | ✅    | Used for hashing                   |
| AbortController | ✅      | ✅       | ✅      | ✅    | Request cancellation               |
| TextDecoder     | ✅      | ✅       | ✅      | ✅    | SSE parsing                        |

### Node.js Compatibility

All adapters work in Node.js 18+ with native `fetch`.

### Feature Detection

```ts
// Check OPFS support
const supportsOPFS = 'storage' in navigator && 'getDirectory' in navigator.storage

// Check IndexedDB support
const supportsIndexedDB = 'indexedDB' in globalThis

// Use appropriate persistence
const persistence = supportsOPFS
	? createOPFSVectorPersistenceAdapter({ directory })
	: createIndexedDBVectorPersistenceAdapter({ database })
```

---

## Integration with Ecosystem

### Complete RAG Application

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createDatabase } from '@mikesaintsg/indexeddb'
import {
	createOpenAIProviderAdapter,
	createOpenAIEmbeddingAdapter,
	createIndexedDBVectorPersistenceAdapter,
	createExponentialRetryAdapter,
	createLRUCacheAdapter,
	createTokenBucketRateLimitAdapter,
} from '@mikesaintsg/adapters'

// Initialize database
const db = await createDatabase({
	name: 'rag-app',
	version: 1,
	stores: {
		documents: { keyPath: 'id' },
		metadata: { keyPath: 'key' },
	},
})

// Create adapters
const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
})

const embedding = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'text-embedding-3-small',
})

// Create systems with adapters
const engine = createEngine(provider, {
	retry: createExponentialRetryAdapter({ maxAttempts: 3 }),
	rateLimit: createTokenBucketRateLimitAdapter({ requestsPerMinute: 50 }),
})

const store = await createVectorStore(embedding, {
	persistence: createIndexedDBVectorPersistenceAdapter({
		database: db,
		documentsStore: 'documents',
		metadataStore: 'metadata',
	}),
	retry: createExponentialRetryAdapter(),
	cache: createLRUCacheAdapter({ maxSize: 10000 }),
})

// Add documents to the store
await store.add('Paris is the capital of France.')
await store.add('Berlin is the capital of Germany.')
await store.add('Tokyo is the capital of Japan.')

// Search for relevant documents
const results = await store.search('What is the capital of France?', { limit: 5 })
console.log('Relevant documents:', results)

// Use the engine for generation
const session = engine.createSession({
	system: 'You are a helpful assistant.',
})

session.addMessage('user', 'Tell me about European capitals.')

const stream = session.stream()

for await (const token of stream) {
	process.stdout.write(token)
}

const result = await stream.result()
console.log('\\nGeneration complete:', result.finishReason)
```

### With @mikesaintsg/contextbuilder

```ts
import { createContextBuilder } from '@mikesaintsg/contextbuilder'
import {
	createDeduplicationAdapter,
	createPriorityTruncationAdapter,
	createPriorityAdapter,
} from '@mikesaintsg/adapters'

const builder = createContextBuilder(tokenCounter, {
	maxTokens: 8000,
	reservedTokens: 2000,
	deduplication: createDeduplicationAdapter({ strategy: 'highest-priority' }),
	truncation: createPriorityTruncationAdapter({ preserveSystem: true }),
	priority: createPriorityAdapter({
		weights: { critical: 100, high: 75, normal: 50, low: 25 },
	}),
})

builder.system('You are a helpful assistant.')
builder.section('guidelines', guidelines, { priority: 'high' })
builder.file('src/main.ts', sourceCode, { priority: 'normal' })

const context = builder. build()
const result = await engine.generateFromContext(context)
```

---

## API Reference

### Streaming Adapter Factories

| Factory               | Options | Returns                          |
|-----------------------|---------|----------------------------------|
| `createTokenStreamer` | —       | `TokenStreamerAdapterInterface`  |
| `createSSEParser`     | —       | `SSEParserAdapterInterface`      |
| `createNDJSONParser`  | —       | `NDJSONParserAdapterInterface`   |

### Provider Adapter Factories

| Factory                             | Options                              | Returns                    |
|-------------------------------------|--------------------------------------|----------------------------|
| `createOpenAIProviderAdapter`       | `OpenAIProviderAdapterOptions`       | `ProviderAdapterInterface` |
| `createAnthropicProviderAdapter`    | `AnthropicProviderAdapterOptions`    | `ProviderAdapterInterface` |
| `createOllamaProviderAdapter`       | `OllamaProviderAdapterOptions`       | `ProviderAdapterInterface` |
| `createNodeLlamaCppProviderAdapter` | `NodeLlamaCppProviderAdapterOptions` | `ProviderAdapterInterface` |
| `createHuggingFaceProviderAdapter`  | `HuggingFaceProviderAdapterOptions`  | `ProviderAdapterInterface` |


### Embedding Adapter Factories

| Factory                              | Options                               | Returns                     |
|--------------------------------------|---------------------------------------|-----------------------------|
| `createOpenAIEmbeddingAdapter`       | `OpenAIEmbeddingAdapterOptions`       | `EmbeddingAdapterInterface` |
| `createVoyageEmbeddingAdapter`       | `VoyageEmbeddingAdapterOptions`       | `EmbeddingAdapterInterface` |
| `createOllamaEmbeddingAdapter`       | `OllamaEmbeddingAdapterOptions`       | `EmbeddingAdapterInterface` |
| `createNodeLlamaCppEmbeddingAdapter` | `NodeLlamaCppEmbeddingAdapterOptions` | `EmbeddingAdapterInterface` |
| `createHuggingFaceEmbeddingAdapter`  | `HuggingFaceEmbeddingAdapterOptions`  | `EmbeddingAdapterInterface` |

### Policy Adapter Factories

| Factory                               | Options                                | Returns                           |
|---------------------------------------|----------------------------------------|-----------------------------------|
| `createExponentialRetryAdapter`       | `ExponentialRetryAdapterOptions`       | `RetryAdapterInterface`           |
| `createLinearRetryAdapter`            | `LinearRetryAdapterOptions`            | `RetryAdapterInterface`           |
| `createTokenBucketRateLimitAdapter`   | `TokenBucketRateLimitAdapterOptions`   | `RateLimitAdapterInterface`       |
| `createSlidingWindowRateLimitAdapter` | `SlidingWindowRateLimitAdapterOptions` | `RateLimitAdapterInterface`       |
| `createCircuitBreakerAdapter`         | `CircuitBreakerAdapterOptions`         | `CircuitBreakerAdapterInterface`  |

### Telemetry Adapter Factories

| Factory                       | Options                          | Returns                      |
|-------------------------------|----------------------------------|------------------------------|
| `createConsoleTelemetryAdapter` | `ConsoleTelemetryAdapterOptions` | `TelemetryAdapterInterface` |
| `createNoOpTelemetryAdapter`    | `NoOpTelemetryAdapterOptions`    | `TelemetryAdapterInterface` |

### Enhancement Adapter Factories

| Factory                             | Options                              | Returns                          |
|-------------------------------------|--------------------------------------|----------------------------------|
| `createLRUCacheAdapter`             | `LRUCacheAdapterOptions`             | `EmbeddingCacheAdapterInterface` |
| `createTTLCacheAdapter`             | `TTLCacheAdapterOptions`             | `EmbeddingCacheAdapterInterface` |
| `createIndexedDBCacheAdapter`       | `IndexedDBCacheAdapterOptions`       | `EmbeddingCacheAdapterInterface` |
| `createBatchAdapter`                | `BatchAdapterOptions`                | `BatchAdapterInterface`          |
| `createCohereRerankerAdapter`       | `CohereRerankerAdapterOptions`       | `RerankerAdapterInterface`       |
| `createCrossEncoderRerankerAdapter` | `CrossEncoderRerankerAdapterOptions` | `RerankerAdapterInterface`       |

### Transform Adapter Factories

| Factory                            | Options                             | Returns                      |
|------------------------------------|-------------------------------------|------------------------------|
| `createOpenAIToolFormatAdapter`    | `OpenAIToolFormatAdapterOptions`    | `ToolFormatAdapterInterface` |
| `createAnthropicToolFormatAdapter` | `AnthropicToolFormatAdapterOptions` | `ToolFormatAdapterInterface` |
| `createCosineSimilarityAdapter`    | —                                   | `SimilarityAdapterInterface` |
| `createDotSimilarityAdapter`       | —                                   | `SimilarityAdapterInterface` |
| `createEuclideanSimilarityAdapter` | —                                   | `SimilarityAdapterInterface` |

### Persistence Adapter Factories

| Factory                                    | Options                              | Returns                                  |
|--------------------------------------------|--------------------------------------|------------------------------------------|
| `createIndexedDBVectorPersistenceAdapter`  | `IndexedDBVectorPersistenceOptions`  | `VectorStorePersistenceAdapterInterface` |
| `createOPFSVectorPersistenceAdapter`       | `OPFSVectorPersistenceOptions`       | `VectorStorePersistenceAdapterInterface` |
| `createHTTPVectorPersistenceAdapter`       | `HTTPVectorPersistenceOptions`       | `VectorStorePersistenceAdapterInterface` |
| `createIndexedDBSessionPersistenceAdapter` | `IndexedDBSessionPersistenceOptions` | `SessionPersistenceInterface`            |


### workflowbuilder Persistence Adapter Factories

| Factory                                    | Options                              | Returns                                   |
|--------------------------------------------|--------------------------------------|-------------------------------------------|
| `createIndexedDBEventPersistenceAdapter`   | `IndexedDBEventPersistenceOptions`   | `EventStorePersistenceAdapterInterface`   |
| `createIndexedDBWeightPersistenceAdapter`  | `IndexedDBWeightPersistenceOptions`  | `WeightPersistenceAdapterInterface`       |
| `createInMemoryEventPersistenceAdapter`    | `InMemoryEventPersistenceOptions?`   | `EventStorePersistenceAdapterInterface`   |
| `createInMemoryWeightPersistenceAdapter`   | —                                    | `WeightPersistenceAdapterInterface`       |


### Context Builder Adapter Factories

| Factory                           | Options                       | Returns                         |
|-----------------------------------|-------------------------------|---------------------------------|
| `createDeduplicationAdapter`      | `DeduplicationAdapterOptions` | `DeduplicationAdapterInterface` |
| `createPriorityTruncationAdapter` | `TruncationAdapterOptions`    | `TruncationAdapterInterface`    |
| `createFIFOTruncationAdapter`     | `TruncationAdapterOptions`    | `TruncationAdapterInterface`    |
| `createLIFOTruncationAdapter`     | `TruncationAdapterOptions`    | `TruncationAdapterInterface`    |
| `createScoreTruncationAdapter`    | `TruncationAdapterOptions`    | `TruncationAdapterInterface`    |
| `createPriorityAdapter`           | `PriorityAdapterOptions`      | `PriorityAdapterInterface`      |

### Core Interfaces

#### TokenStreamerAdapterInterface

```ts
interface TokenStreamerAdapterInterface extends StreamHandleInterface {
	readonly requestId: string
	/** Emit a token */
	emit(token: string): void
	/** Append text without emitting */
	appendText(text: string): void
	/** Start a tool call */
	startToolCall(index: number, id: string, name: string): void
	/** Append arguments to a tool call */
	appendToolCallArguments(index: number, args: string): void
	/** Update tool call incrementally */
	updateToolCall(index: number, delta: ToolCallDelta): void
	/** Set the finish reason */
	setFinishReason(reason: FinishReason): void
	/** Set usage statistics */
	setUsage(usage: UsageStats): void
	/** Set error and reject */
	setError(error: Error): void
	/** Set aborted state */
	setAborted(): void
	/** Signal completion */
	complete(): void
	/** Create a new instance for a request */
	create(requestId: string, abortController: AbortController): TokenStreamerAdapterInterface
}
```

#### SSEParserAdapterInterface

```ts
interface SSEParserAdapterInterface extends StreamParserAdapterInterface {
	/** Create an SSE parser instance with options */
	create(options: SSEParserOptions): StreamParserAdapterInterface
}

interface SSEParserOptions {
	readonly lineDelimiter?: string
	readonly eventDelimiter?: string
	readonly onEvent: (event: SSEEvent) => void
	readonly onError?: (error: Error) => void
	readonly onEnd?: () => void
}
```

#### NDJSONParserAdapterInterface

```ts
interface NDJSONParserAdapterInterface extends StreamParserAdapterInterface {
	/** Create an NDJSON parser instance with options */
	create(options: NDJSONParserOptions): StreamParserAdapterInterface
}

interface NDJSONParserOptions {
	readonly onObject: (obj: unknown) => void
	readonly onError?: (error: Error) => void
	readonly onEnd?: () => void
}
```

#### ProviderAdapterInterface

```ts
interface ProviderAdapterInterface {
	/** Unique identifier for this adapter instance */
	getId(): string
	/** Generate a streamers response */
	generate(messages: readonly Message[], options:  GenerationOptions): StreamHandleInterface
	/** Whether this provider supports tool calling */
	supportsTools(): boolean
	/** Get provider capabilities */
	getCapabilities(): ProviderCapabilities
}
```

#### EmbeddingAdapterInterface

```ts
interface EmbeddingAdapterInterface {
	/** Generate embeddings for texts */
	embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]>
	/** Get model metadata */
	getModelMetadata(): EmbeddingModelMetadata
}
```


### Options Types

#### Provider Adapter Options

```ts
interface OpenAIProviderAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
	readonly organization?: string
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: TokenStreamerAdapterInterface
	readonly parser?: SSEParserAdapterInterface
}

interface AnthropicProviderAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: TokenStreamerAdapterInterface
	readonly parser?: SSEParserAdapterInterface
}

interface OllamaProviderAdapterOptions {
	readonly model: string
	readonly baseURL?: string
	readonly keepAlive?: boolean | string
	readonly timeout?: number
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: TokenStreamerAdapterInterface
	readonly parser?: NDJSONParserAdapterInterface
}

interface NodeLlamaCppProviderAdapterOptions {
	readonly context: NodeLlamaCppContext
	readonly chatWrapper?: NodeLlamaCppChatWrapper
	readonly modelName?: string
	readonly timeout?: number
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: TokenStreamerAdapterInterface
}

interface HuggingFaceProviderAdapterOptions {
	readonly pipeline: HuggingFaceTextGenerationPipeline
	readonly modelName: string
	readonly defaultOptions?: GenerationDefaults
	readonly streamer?: TokenStreamerAdapterInterface
	/** Enable tool calling support (requires model with chat template) */
	readonly enableTools?: boolean
}
```

#### Embedding Adapter Options

```ts
interface OpenAIEmbeddingAdapterOptions {
	readonly apiKey:  string
	readonly model?: string
	readonly dimensions?: number
	readonly baseURL?: string
}

interface VoyageEmbeddingAdapterOptions {
	readonly apiKey: string
	readonly model?:  VoyageEmbeddingModel
	readonly baseURL?: string
	readonly inputType?: 'query' | 'document'
}

interface OllamaEmbeddingAdapterOptions {
	readonly model: string
	readonly baseURL?: string
	readonly timeout?: number
}

interface NodeLlamaCppEmbeddingAdapterOptions {
	readonly embeddingContext: NodeLlamaCppEmbeddingContext
	readonly modelName?:  string
	readonly dimensions?: number
}

interface HuggingFaceEmbeddingAdapterOptions {
	readonly pipeline: HuggingFaceFeatureExtractionPipeline
	readonly modelName: string
	readonly dimensions:  number
	readonly pooling?: 'none' | 'mean' | 'cls'
	readonly normalize?: boolean
}
```

#### Policy Adapter Options

```ts
interface ExponentialRetryAdapterOptions {
	readonly maxAttempts?:  number
	readonly initialDelayMs?: number
	readonly maxDelayMs?: number
	readonly backoffMultiplier?:  number
	readonly jitter?: boolean
	readonly retryableCodes?: readonly AdapterErrorCode[]
	readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

interface LinearRetryAdapterOptions {
	readonly maxAttempts?: number
	readonly delayMs?: number
	readonly retryableCodes?:  readonly AdapterErrorCode[]
	readonly onRetry?: (error: unknown, attempt:  number, delayMs: number) => void
}

interface TokenBucketRateLimitAdapterOptions {
	readonly requestsPerMinute?: number
	readonly maxConcurrent?: number
	readonly burstSize?: number
}

interface SlidingWindowRateLimitAdapterOptions {
	readonly requestsPerMinute?: number
	readonly windowMs?: number
}
```

#### Enhancement Adapter Options

```ts
interface LRUCacheAdapterOptions {
	readonly maxSize?: number
	readonly ttlMs?: number
	readonly onEvict?: (text: string, embedding: Embedding) => void
}

interface TTLCacheAdapterOptions {
	readonly ttlMs?:  number
}

interface IndexedDBCacheAdapterOptions {
	readonly database:  MinimalDatabaseAccess
	readonly storeName?:  string
	readonly ttlMs?: number
}

interface BatchAdapterOptions {
	readonly batchSize?:  number
	readonly delayMs?: number
	readonly deduplicate?: boolean
}

interface CohereRerankerAdapterOptions {
	readonly apiKey:  string
	readonly model?: string
	readonly baseURL?: string
}

interface CrossEncoderRerankerAdapterOptions {
	readonly model: string
	readonly modelPath?: string
}
```

#### Persistence Adapter Options

```ts
interface IndexedDBVectorPersistenceOptions {
	readonly database:  MinimalDatabaseAccess
	readonly documentsStore?:  string
	readonly metadataStore?: string
}

interface OPFSVectorPersistenceOptions {
	readonly directory: MinimalDirectoryAccess
	readonly chunkSize?: number
}

interface HTTPVectorPersistenceOptions {
	readonly baseURL:  string
	readonly headers?:  Readonly<Record<string, string>>
	readonly timeout?: number
}

interface IndexedDBSessionPersistenceOptions {
	readonly databaseName?:  string
	readonly storeName?: string
	readonly ttlMs?:  number
}
```

#### Context Builder Adapter Options

```ts
interface DeduplicationAdapterOptions {
	readonly strategy?:  DeduplicationStrategy
}

interface TruncationAdapterOptions {
	readonly preserveSystem?: boolean
}

interface PriorityAdapterOptions {
	readonly weights?: Partial<Record<FramePriority, number>>
}
```

### Error Types

```ts
type AdapterErrorCode =
	| 'AUTHENTICATION_ERROR'
	| 'RATE_LIMIT_ERROR'
	| 'QUOTA_EXCEEDED_ERROR'
	| 'NETWORK_ERROR'
	| 'TIMEOUT_ERROR'
	| 'INVALID_REQUEST_ERROR'
	| 'MODEL_NOT_FOUND_ERROR'
	| 'CONTEXT_LENGTH_ERROR'
	| 'CONTENT_FILTER_ERROR'
	| 'SERVICE_ERROR'
	| 'UNKNOWN_ERROR'

interface AdapterErrorData {
	readonly code: AdapterErrorCode
	readonly providerCode?: string
	readonly retryAfter?: number
	readonly context?:  Readonly<Record<string, unknown>>
}
```

---

## License

MIT © [Mike Saints-G](https://github.com/mikesaintsg)
