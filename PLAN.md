# Project Plan: @mikesaintsg/adapters

> **Status:** Phase 5 of 5 — Integration 🔄 Active
> **Last Updated:** 2026-01-17
> **Next Milestone:** Showcase Demo and Integration Tests

---

## Quick Context

> **Purpose:** This section helps models quickly orient when starting a new session.

| Field              | Value                                              |
|--------------------|----------------------------------------------------|
| **Package name**   | `@mikesaintsg/adapters`                            |
| **Environment**    | `isomorphic` (browser + Node.js)                   |
| **Type**           | `library`                                          |
| **Sandbox folder** | `showcase/`                                        |

### Current Session State

```
Phase: 5 of 5 (Integration) 🔄 Active
Active Deliverable: 5.7 Showcase Demo
Checklist Progress: 6/8 deliverables complete
Last Action: Implemented Session Persistence, Tool Call Bridge, Retrieval Tool (305 tests passing)
Next Action: Implement Showcase Demo (5.7) and Integration Tests (5.8)
```

> **Instructions:** Update this section at the END of each session with the model.

---

## Vision

`@mikesaintsg/adapters` centralizes all third-party LLM integrations for the @mikesaintsg ecosystem. It provides type-safe adapters for LLM providers (OpenAI, Anthropic, Ollama), embedding providers (OpenAI, Voyage, Ollama), tool format translation, persistence (IndexedDB, OPFS, HTTP), and cross-package bridges. The package is zero-dependency, built on native `fetch` and browser/Node APIs, and designed for composition over inheritance via wrapper adapters (batched, cached, retryable).

---

## Non-Goals

Explicit boundaries. What we are NOT building:

- ❌ Interface definitions (owned by `@mikesaintsg/core`)
- ❌ Message/Generation types (owned by `@mikesaintsg/inference`)
- ❌ Token counting logic (owned by `@mikesaintsg/inference`)
- ❌ Tool registry or schema validation (owned by `@mikesaintsg/contextprotocol`)
- ❌ Vector storage and search algorithms (owned by `@mikesaintsg/vectorstore`)
- ❌ Context assembly and deduplication (owned by `@mikesaintsg/contextbuilder`)
- ❌ In-memory persistence adapters (stay in domain packages)
- ❌ Native platform adapters like OPFS storage (stay in `@mikesaintsg/filesystem`)

---

## Success Criteria

How we know the project is complete:

- [ ] All provider adapters implemented and tested (OpenAI, Anthropic, Ollama)
- [ ] All embedding adapters implemented and tested (OpenAI, Voyage, Ollama)
- [ ] All wrapper adapters implemented (batched, cached, retryable)
- [ ] Tool format adapters for all providers (OpenAI, Anthropic)
- [ ] All persistence adapters implemented (IndexedDB, OPFS, HTTP)
- [ ] Bridge functions implemented (ToolCallBridge, RetrievalTool)
- [ ] Rate limiter and SSE parser implemented
- [ ] Full test coverage with Vitest + Playwright
- [ ] Showcase demonstrates all features
- [ ] All quality gates pass

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Your Application                                │
├─────────────────────────────────────────────────────────────────────────┤
│                    @mikesaintsg/adapters                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Provider Adapters                             │   │
│  │   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │   │
│  │   │ OpenAI Provider │ │Anthropic Provider│ │ Ollama Provider │   │   │
│  │   └─────────────────┘ └─────────────────┘ └─────────────────┘   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                   Embedding Adapters                             │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐                      │   │
│  │   │  OpenAI  │  │  Voyage  │  │  Ollama  │                      │   │
│  │   └──────────┘  └──────────┘  └──────────┘                      │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                   Wrapper Adapters                               │   │
│  │   ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐   │   │
│  │   │ Batched  │  │  Cached  │  │ Retryable │  │ Rate Limited │   │   │
│  │   └──────────┘  └──────────┘  └───────────┘  └──────────────┘   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                  Persistence Adapters                            │   │
│  │   ┌───────────┐   ┌──────────┐   ┌──────────┐                   │   │
│  │   │ IndexedDB │   │   OPFS   │   │   HTTP   │                   │   │
│  │   └───────────┘   └──────────┘   └──────────┘                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                      Shared Helpers                              │   │
│  │   ┌────────────────┐   ┌───────────────────┐                    │   │
│  │   │   SSE Parser   │   │  Rate Limiter     │                    │   │
│  │   └────────────────┘   └───────────────────┘                    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                      Bridge Functions                            │   │
│  │   ┌────────────────┐   ┌───────────────────┐                    │   │
│  │   │ToolCall Bridge │   │ Retrieval Tool    │                    │   │
│  │   └────────────────┘   └───────────────────┘                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│      External APIs (OpenAI, Anthropic, Voyage) + Local (Ollama)         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component                  | Purpose                                  | Location                       |
|----------------------------|------------------------------------------|--------------------------------|
| OpenAI Provider Adapter    | Chat completions via OpenAI API          | `src/providers/openai.ts`      |
| Anthropic Provider Adapter | Chat completions via Anthropic API       | `src/providers/anthropic.ts`   |
| Ollama Provider Adapter    | Local LLM for development/testing        | `src/providers/ollama.ts`      |
| OpenAI Embedding Adapter   | Text embeddings via OpenAI API           | `src/embeddings/openai.ts`     |
| Voyage Embedding Adapter   | Text embeddings via Voyage AI            | `src/embeddings/voyage.ts`     |
| Ollama Embedding Adapter   | Local embeddings for development/testing | `src/embeddings/ollama.ts`     |
| Batched Embedding Wrapper  | Batches multiple embed calls             | `src/embeddings/batched.ts`    |
| Cached Embedding Wrapper   | Caches embedding results                 | `src/embeddings/cache.ts`      |
| Retryable Wrappers         | Retry logic for providers/embeddings     | `src/wrappers/retryable.ts`    |
| Rate Limiter               | Rate limiting utility                    | `src/helpers/rate-limiter.ts`  |
| SSE Parser                 | Shared SSE parsing                       | `src/helpers/sse.ts`           |
| OpenAI Tool Format         | Tool schema translation for OpenAI       | `src/formatters/openai.ts`     |
| Anthropic Tool Format      | Tool schema translation for Anthropic    | `src/formatters/anthropic.ts`  |
| IndexedDB Session          | Session persistence via IndexedDB        | `src/persistence/sessions/`    |
| IndexedDB Vector           | VectorStore persistence via IndexedDB    | `src/persistence/vectorstore/` |
| OPFS Vector                | VectorStore persistence via OPFS         | `src/persistence/vectorstore/` |
| HTTP Vector                | VectorStore persistence via HTTP         | `src/persistence/vectorstore/` |
| Tool Call Bridge           | Connects inference ↔ contextprotocol     | `src/bridges/tool-call.ts`     |
| Retrieval Tool Factory     | Creates VectorStore retrieval tool       | `src/bridges/retrieval.ts`     |

### Key Interfaces

| Interface                                | Purpose                          | Defined In |
|------------------------------------------|----------------------------------|------------|
| `ProviderAdapterInterface`               | LLM provider contract            | inference  |
| `EmbeddingAdapterInterface`              | Embedding generation contract    | core       |
| `ToolFormatAdapterInterface`             | Tool schema translation contract | core       |
| `VectorStorePersistenceAdapterInterface` | Vector persistence contract      | core       |
| `SessionPersistenceAdapterInterface`     | Session persistence contract     | adapters   |
| `ToolCallBridgeInterface`                | Tool call execution contract     | adapters   |
| `RateLimiterInterface`                   | Rate limiting contract           | adapters   |
| `SSEParserInterface`                     | SSE parsing contract             | adapters   |

---

## Phases

| # | Phase        | Status      | Description                           | File                        |
|---|--------------|-------------|---------------------------------------|-----------------------------|
| 1 | Foundation   | ✅ Complete | Types, project structure, helpers     | `phases/01-foundation.md`   |
| 2 | Core Helpers | ✅ Complete | SSE parser, rate limiter, error maps  | `phases/02-core-helpers.md` |
| 3 | Embeddings   | ✅ Complete | Embedding adapters and wrappers       | `phases/03-embeddings.md`   |
| 4 | Providers    | ✅ Complete | Provider adapters (OpenAI, Anthropic) | `phases/04-providers.md`    |
| 5 | Integration  | 🔄 Active   | Bridges, persistence, showcase        | `phases/05-integration.md`  |

**Status Legend:**
- ✅ Complete
- 🔄 Active
- ⏳ Pending

---

## Type Inventory

> **Purpose:** Track all public types. Update when adding interfaces to `src/types.ts`.

### Provider Adapter Options

| Type Name                         | Category | Status | Phase |
|-----------------------------------|----------|--------|-------|
| `OpenAIProviderAdapterOptions`    | Options  | ✅ Done | 1     |
| `AnthropicProviderAdapterOptions` | Options  | ✅ Done | 1     |
| `OllamaProviderAdapterOptions`    | Options  | ✅ Done | 1     |

### Embedding Adapter Options

| Type Name                        | Category | Status | Phase |
|----------------------------------|----------|--------|-------|
| `OpenAIEmbeddingAdapterOptions`  | Options  | ✅ Done | 1     |
| `VoyageEmbeddingAdapterOptions`  | Options  | ✅ Done | 1     |
| `OllamaEmbeddingAdapterOptions`  | Options  | ✅ Done | 1     |
| `BatchedEmbeddingAdapterOptions` | Options  | ✅ Done | 1     |
| `CachedEmbeddingAdapterOptions`  | Options  | ✅ Done | 1     |

### Rate Limiting & Retry

| Type Name                   | Category   | Status | Phase |
|-----------------------------|------------|--------|-------|
| `RateLimiterInterface`      | Behavioral | ✅ Done | 1     |
| `RateLimiterOptions`        | Options    | ✅ Done | 1     |
| `RateLimiterState`          | State      | ✅ Done | 1     |
| `RetryOptions`              | Options    | ✅ Done | 1     |
| `AdapterRateLimiterOptions` | Options    | ✅ Done | 1     |

### Tool Format Adapter Options

| Type Name                           | Category | Status | Phase |
|-------------------------------------|----------|--------|-------|
| `OpenAIToolFormatAdapterOptions`    | Options  | ✅ Done | 1     |
| `AnthropicToolFormatAdapterOptions` | Options  | ✅ Done | 1     |

### Persistence Options

| Type Name                            | Category   | Status | Phase |
|--------------------------------------|------------|--------|-------|
| `IndexedDBSessionPersistenceOptions` | Options    | ✅ Done | 1     |
| `IndexedDBVectorPersistenceOptions`  | Options    | ✅ Done | 1     |
| `OPFSVectorPersistenceOptions`       | Options    | ✅ Done | 1     |
| `HTTPVectorPersistenceOptions`       | Options    | ✅ Done | 1     |
| `SessionPersistenceAdapterInterface` | Behavioral | ✅ Done | 1     |

### Bridge Types

| Type Name                 | Category   | Status | Phase |
|---------------------------|------------|--------|-------|
| `ToolCallBridgeInterface` | Behavioral | ✅ Done | 1     |
| `ToolCallBridgeOptions`   | Options    | ✅ Done | 1     |
| `ToolRegistryInterface`   | Behavioral | ✅ Done | 1     |
| `VectorStoreInterface`    | Behavioral | ✅ Done | 1     |
| `RetrievalToolOptions`    | Options    | ✅ Done | 1     |
| `RetrievalToolResult`     | Data       | ✅ Done | 1     |

### Error Types

| Type Name          | Category | Status | Phase |
|--------------------|----------|--------|-------|
| `AdapterErrorCode` | Data     | ✅ Done | 1     |
| `AdapterErrorData` | Data     | ✅ Done | 1     |

### SSE Parsing

| Type Name            | Category   | Status | Phase |
|----------------------|------------|--------|-------|
| `SSEEvent`           | Data       | ✅ Done | 1     |
| `SSEParserOptions`   | Options    | ✅ Done | 1     |
| `SSEParserInterface` | Behavioral | ✅ Done | 1     |

### API Response Types (Internal)

| Type Name                     | Category | Status | Phase |
|-------------------------------|----------|--------|-------|
| `OpenAIChatCompletionChunk`   | Data     | ✅ Done | 1     |
| `AnthropicMessageStreamEvent` | Data     | ✅ Done | 1     |
| `OllamaChatRequest`           | Data     | ✅ Done | 1     |
| `OllamaChatResponse`          | Data     | ✅ Done | 1     |
| `OllamaEmbeddingRequest`      | Data     | ✅ Done | 1     |
| `OllamaEmbeddingResponse`     | Data     | ✅ Done | 1     |

**Categories:**
- **Behavioral** — Interfaces with methods (use `Interface` suffix)
- **Options** — Configuration objects (use `Options` suffix)
- **Data** — Pure data structures (no suffix)
- **State** — Readonly state snapshots (use `State` suffix)

---

## Decisions Log

> **Instructions:** Log architectural decisions here. Never remove entries.

### 2026-01-17: Types Source of Truth
**Decision:** `src/types.ts` is pre-defined and contains all adapter-specific types
**Rationale:** Types were migrated from ecosystem design work and represent the source of truth
**Alternatives rejected:** Incrementally defining types during implementation
**Impacts:** Phase 1 focuses on validation rather than creation

### 2026-01-17: Wrapper Adapter Composition
**Decision:** Use wrapper adapters (batched, cached, retryable) that wrap base adapters
**Rationale:** Composition over inheritance; allows mixing features as needed
**Alternatives rejected:** Single monolithic adapter with all features built-in
**Impacts:** Phases 2-3 implement each wrapper independently

### 2026-01-17: SSE Parser in helpers/
**Decision:** SSE parser shared across all streaming providers via helpers/sse.ts
**Rationale:** OpenAI, Anthropic, and Ollama all use SSE; shared logic reduces duplication
**Alternatives rejected:** Per-provider SSE parsing
**Impacts:** Phase 2 implements shared SSE parser before providers

### 2026-01-17: Provider Adapters Import from @mikesaintsg/inference
**Decision:** ProviderAdapterInterface is owned by inference due to Message type dependency
**Rationale:** Message types are fundamental to inference; splitting would create circular deps
**Alternatives rejected:** Moving Message types to core
**Impacts:** Provider implementations depend on @mikesaintsg/inference

---

## Open Questions

> **Instructions:** Add questions during work. Resolve with decisions or remove when answered.

- [ ] Should Ollama provider adapter be tested in CI or only locally?
- [ ] What is the strategy for mocking external APIs in tests?
- [ ] Should we support streaming abort for all providers uniformly?

---

## Session Log

> **Purpose:** Track work across multiple sessions. Append new entries at the top.

### 2026-01-17 Session 5

**Started:** Phase 5, Deliverable 5.1 (Session Persistence)
**Completed:**
- Implemented IndexedDB session persistence in `src/persistence/sessions/indexeddb.ts`
  - TTL-based session expiration
  - Session summary with title extraction from first user message
  - Methods: save(), load(), remove(), all(), clear()
- Implemented Tool Call Bridge in `src/bridges/tool-call.ts`
  - Connects inference tool calls to contextprotocol execution
  - Timeout handling with configurable duration
  - Lifecycle hooks: onBeforeExecute, onAfterExecute, onError
  - Parallel execution via executeAll()
- Implemented Retrieval Tool Factory in `src/bridges/retrieval.ts`
  - Creates tools for querying VectorStore
  - Configurable topK and minScore
  - Optional result formatting
- Created comprehensive tests:
  - `tests/persistence/sessions/indexeddb.test.ts` (20 tests)
  - `tests/bridges/tool-call.test.ts` (14 tests)
  - `tests/bridges/retrieval.test.ts` (9 tests)
- Updated barrel exports for persistence and bridges
- All quality gates passing (305 tests)
- CodeQL security check passed

**Blockers Discovered:**
- None

**Ended:** Phase 5 deliverables 5.1-5.6 ✅ Complete, ready for 5.7 Showcase Demo

---

### 2026-01-17 Session 4

**Started:** Phase 3, Deliverable 3.1 (OpenAI Embedding Adapter)
**Completed:**
- Created Voyage embedding adapter in `src/embeddings/voyage.ts`
  - Supports voyage-3, voyage-3-lite, voyage-code-3 models
  - Model-specific dimension mapping
  - Input type support for retrieval optimization
- Created Ollama embedding adapter in `src/embeddings/ollama.ts`
  - Uses `/api/embed` endpoint
  - Timeout support and proper error handling
- Completed Batched embedding wrapper in `src/embeddings/batched.ts`
  - Full batching logic with deduplication
  - Configurable batch size and flush delay
  - Promise resolution for each caller
- Reviewed and validated existing adapters (OpenAI, Cache)
- Created comprehensive tests:
  - `tests/embeddings/openai.test.ts` (11 tests)
  - `tests/embeddings/voyage.test.ts` (12 tests)
  - `tests/embeddings/ollama.test.ts` (10 tests)
  - `tests/embeddings/batched.test.ts` (11 tests)
  - `tests/embeddings/cached.test.ts` (12 tests)
- Updated barrel exports for embeddings
- All quality gates passing (222 tests)

**Blockers Discovered:**
- None

**Ended:** Phase 3 ✅ Complete, ready for Phase 4

---

### 2026-01-17 Session 3

**Started:** Phase 2, Deliverable 2.1 (SSE Parser)
**Completed:**
- Implemented SSE parser in `src/helpers/sse.ts` with full SSE spec support
- Implemented Rate limiter in `src/helpers/rate-limiter.ts` with sliding window and concurrent limiting
- Implemented Provider error mapping in `src/helpers/error-mapping.ts` (OpenAI, Anthropic, Ollama)
- Implemented Retry wrapper in `src/wrappers/retryable.ts` with exponential backoff and jitter
- Created barrel exports for `src/helpers/index.ts` and `src/wrappers/index.ts`
- Updated `src/index.ts` to export new modules
- Created comprehensive tests:
  - `tests/helpers/sse.test.ts` (26 tests)
  - `tests/helpers/rate-limiter.test.ts` (16 tests)
  - `tests/helpers/error-mapping.test.ts` (39 tests)
  - `tests/wrappers/retryable.test.ts` (21 tests)
- Fixed TypeScript strictness issues (exactOptionalPropertyTypes, noUncheckedIndexedAccess)
- All quality gates passing (166 tests)

**Blockers Discovered:**
- None

**Ended:** Phase 2 ✅ Complete, ready for Phase 3

---

### 2026-01-17 Session 2

**Started:** Phase 1, Deliverable 1.1 (Types Review)
**Completed:**
- Completed all Phase 1 deliverables
- Added comprehensive constants (Anthropic, Ollama, rate limiting, retry)
- Implemented AdapterError class with type guards
- Created error mapping utilities (extractRetryAfter, createAdapterErrorFromResponse)
- Moved DEFAULT_MODEL_MULTIPLIERS and DEFAULT_RETRYABLE_CODES to constants.ts
- Fixed all import issues and type errors
- Created 64 tests covering errors and constants
- All quality gates passing

**Blockers Discovered:**
- None

**Ended:** Phase 1 ✅ Complete, ready for Phase 2

---

### 2026-01-17 Session 1

**Started:** Project plan creation
**Completed:**
- Created PLAN.md with full project structure
- Created phase files for all 5 phases
- Reviewed existing types.ts (already complete)
- Reviewed existing source structure

**Blockers Discovered:**
- None

**Ended:** Phase 1, Deliverable 1.1 — ready for validation

---

## References

- [adapters.md Guide](./guides/adapters.md)
- [core.md Guide](./guides/core.md)
- [inference.md Guide](./guides/inference.md)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/en/api)
- [Voyage AI API Reference](https://docs.voyageai.com/)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
