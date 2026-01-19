# Project Plan: @mikesaintsg/adapters Refactor

> **Status:** Phase 2 of 6 — Provider Adapters
> **Last Updated:** 2026-01-19
> **Next Milestone:** Implement Provider Adapters (OpenAI, Anthropic, Ollama, etc.)

---

## Quick Context

> **Purpose:** This section helps models quickly orient when starting a new session.

| Field              | Value                              |
|--------------------|------------------------------------|
| **Package name**   | `@mikesaintsg/adapters`            |
| **Environment**    | `isomorphic` (browser + Node.js)   |
| **Type**           | `library`                          |
| **Sandbox folder** | `examples/`                        |

### Current Session State

```
Phase: 2 of 6 (Provider Adapters)
Active Deliverable: 2.1 OpenAI Provider Adapter
Checklist Progress: 0/? items complete
Last Action: Phase 1 completed - SSE Parser and Streamer adapters with 23 tests passing
Next Action: Implement OpenAI Provider adapter
```

> **Instructions:** Update this section at the END of each session with the model. 

---

## Vision

`@mikesaintsg/adapters` is the implementation home for all adapter interfaces defined in `@mikesaintsg/core`. It provides zero-dependency, production-ready adapters for LLM providers, embeddings, persistence, policies, and transforms that plug into the `@mikesaintsg` ecosystem.  All provider adapters stream natively with SSE parsing built-in.  This refactor establishes a clean, maintainable codebase following ecosystem conventions.

---

## Non-Goals

Explicit boundaries.  What we are NOT building:

- ❌ Runtime dependencies on external packages (node-llama-cpp, @huggingface/transformers)
- ❌ Non-streaming provider implementations
- ❌ Backward compatibility with previous API
- ❌ Migration utilities or deprecation warnings
- ❌ Legacy code preservation
- ❌ Wrapper adapters that compose other adapters

---

## Success Criteria

How we know the project is complete:

- [ ] All 5 provider adapters implemented with native streaming
- [ ] All 5 embedding adapters implemented
- [ ] All policy, enhancement, transform, and persistence adapters implemented
- [ ] Bridge functions (ToolCallBridge, RetrievalTool) implemented
- [ ] 100% type coverage — no `any`, no `!`, no unsafe `as`
- [ ] All quality gates pass:  `check`, `format`, `build`, `test`
- [ ] Test coverage ≥80% for all components
- [ ] Guide matches implementation exactly

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         src/index.ts                            │
│                      (Barrel Exports Only)                      │
├─────────────────────────────────────────────────────────────────┤
│  src/types.ts          │  src/helpers.ts      │  src/constants.ts│
│  (All Types)           │  (Type Guards,       │  (Defaults,      │
│                        │   Pure Functions)    │   Error Codes)   │
├─────────────────────────────────────────────────────────────────┤
│                        src/factories. ts                         │
│              (All create* Factory Functions)                    │
├─────────────────────────────────────────────────────────────────┤
│                          src/core/                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  streaming/ │  │  providers/ │  │      embeddings/        │ │
│  │  Streamer   │  │  OpenAI     │  │  OpenAI, Voyage         │ │
│  │  SSE Parser │  │  Anthropic  │  │  Ollama, NodeLlamaCpp   │ │
│  │             │  │  Ollama     │  │  HuggingFace            │ │
│  │             │  │  NodeLlama  │  │                         │ │
│  │             │  │  HuggingFace│  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   policy/   │  │ enhancement/│  │       transform/        │ │
│  │  Retry      │  │  Cache      │  │  ToolFormat             │ │
│  │  RateLimit  │  │  Batch      │  │  Similarity             │ │
│  │             │  │  Reranker   │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │persistence/ │  │   bridge/   │  │    contextbuilder/      │ │
│  │  IndexedDB  │  │ToolCallBrdg │  │  Deduplication          │ │
│  │  OPFS       │  │ RetrievalTl │  │  Truncation             │ │
│  │  HTTP       │  │             │  │  Priority               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       src/internal/                             │
│                    (Internal Utilities)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component         | Purpose                              | Location                     |
|-------------------|--------------------------------------|------------------------------|
| Streamer          | Default token streaming              | `src/core/streaming/`        |
| SSE Parser        | SSE parsing (internal, custom optional) | `src/core/streaming/`     |
| Provider Adapters | LLM text generation (streaming)      | `src/core/providers/`        |
| Embedding Adapters| Vector generation                    | `src/core/embeddings/`       |
| Policy Adapters   | Retry and rate limiting              | `src/core/policy/`           |
| Enhancement       | Cache, batch, reranker               | `src/core/enhancement/`      |
| Transform         | Tool format, similarity              | `src/core/transform/`        |
| Persistence       | IndexedDB, OPFS, HTTP                | `src/core/persistence/`      |
| Bridge            | ToolCallBridge, RetrievalTool        | `src/core/bridge/`           |
| Context Builder   | Dedup, truncation, priority          | `src/core/contextbuilder/`   |

### Key Interfaces

| Interface                              | Purpose                          | Depends On                |
|----------------------------------------|----------------------------------|---------------------------|
| `StreamerAdapterInterface`             | Token emission                   | —                         |
| `SSEParserAdapterInterface`            | SSE parsing (internal)           | —                         |
| `ProviderAdapterInterface`             | LLM generation                   | `StreamerAdapterInterface`, `SSEParserAdapterInterface` |
| `EmbeddingAdapterInterface`            | Vector generation                | —                         |
| `RetryAdapterInterface`                | Retry policy                     | —                         |
| `RateLimitAdapterInterface`            | Rate limiting                    | —                         |
| `EmbeddingCacheAdapterInterface`       | Embedding cache                  | —                         |
| `BatchAdapterInterface`                | Request batching                 | —                         |
| `RerankerAdapterInterface`             | Result reranking                 | —                         |
| `ToolFormatAdapterInterface`           | Tool schema conversion           | —                         |
| `SimilarityAdapterInterface`           | Vector similarity                | —                         |
| `VectorStorePersistenceAdapterInterface`| Vector persistence              | —                         |
| `SessionPersistenceInterface`          | Session persistence              | —                         |
| `ToolCallBridgeInterface`              | Tool execution                   | —                         |
| `RetrievalToolInterface`               | Vector store tool                | —                         |
| `DeduplicationAdapterInterface`        | Frame deduplication              | —                         |
| `TruncationAdapterInterface`           | Context truncation               | —                         |
| `PriorityAdapterInterface`             | Priority scoring                 | —                         |

---

## Phases

| # | Phase              | Status      | Description                           | File                            |
|---|--------------------|-------------|---------------------------------------|---------------------------------|
| 0 | Pre-Flight         | ✅ Complete  | Scaffold, types, helpers, constants   | `plans/phases/00-preflight.md`  |
| 1 | Streaming          | ✅ Complete  | Streamer adapter, SSE parser          | `plans/phases/01-streaming.md`  |
| 2 | Provider Adapters  | 🔄 Active    | All 5 provider adapters               | `plans/phases/02-providers.md`  |
| 3 | Embedding Adapters | ⏳ Pending   | All 5 embedding adapters              | `plans/phases/03-embeddings.md` |
| 4 | Policy & Enhance   | ⏳ Pending   | Retry, rate limit, cache, batch       | `plans/phases/04-policy.md`     |
| 5 | Transform & Persist| ⏳ Pending   | Tool format, similarity, persistence  | `plans/phases/05-transform.md`  |
| 6 | Bridge & Finalize  | ⏳ Pending   | Bridges, context builder, docs        | `plans/phases/06-bridge.md`     |

**Status Legend:**
- ✅ Complete
- 🔄 Active
- ⏳ Pending

---

## Type Inventory

> **Purpose:** Track all public types. Update when adding interfaces to `src/types.ts`.

### Error Types

| Type Name          | Category | Status    | Phase |
|--------------------|----------|-----------|-------|
| `AdapterErrorCode` | Data     | ⏳ Pending | 0     |
| `AdapterErrorData` | Data     | ⏳ Pending | 0     |

### Provider Options

| Type Name                          | Category | Status    | Phase |
|------------------------------------|----------|-----------|-------|
| `OpenAIProviderAdapterOptions`     | Options  | ⏳ Pending | 0     |
| `AnthropicProviderAdapterOptions`  | Options  | ⏳ Pending | 0     |
| `OllamaProviderAdapterOptions`     | Options  | ⏳ Pending | 0     |
| `NodeLlamaCppProviderAdapterOptions`| Options | ⏳ Pending | 0     |
| `HuggingFaceProviderAdapterOptions`| Options  | ⏳ Pending | 0     |

### Embedding Options

| Type Name                           | Category | Status    | Phase |
|-------------------------------------|----------|-----------|-------|
| `OpenAIEmbeddingAdapterOptions`     | Options  | ⏳ Pending | 0     |
| `VoyageEmbeddingAdapterOptions`     | Options  | ⏳ Pending | 0     |
| `OllamaEmbeddingAdapterOptions`     | Options  | ⏳ Pending | 0     |
| `NodeLlamaCppEmbeddingAdapterOptions`| Options | ⏳ Pending | 0     |
| `HuggingFaceEmbeddingAdapterOptions`| Options  | ⏳ Pending | 0     |

### Policy Options

| Type Name                            | Category | Status    | Phase |
|--------------------------------------|----------|-----------|-------|
| `ExponentialRetryAdapterOptions`     | Options  | ⏳ Pending | 0     |
| `LinearRetryAdapterOptions`          | Options  | ⏳ Pending | 0     |
| `TokenBucketRateLimitAdapterOptions` | Options  | ⏳ Pending | 0     |
| `SlidingWindowRateLimitAdapterOptions`| Options | ⏳ Pending | 0     |

### Enhancement Options

| Type Name                       | Category | Status    | Phase |
|---------------------------------|----------|-----------|-------|
| `LRUCacheAdapterOptions`        | Options  | ⏳ Pending | 0     |
| `TTLCacheAdapterOptions`        | Options  | ⏳ Pending | 0     |
| `IndexedDBCacheAdapterOptions`  | Options  | ⏳ Pending | 0     |
| `BatchAdapterOptions`           | Options  | ⏳ Pending | 0     |
| `CohereRerankerAdapterOptions`  | Options  | ⏳ Pending | 0     |
| `CrossEncoderRerankerAdapterOptions`| Options | ⏳ Pending | 0   |

### Transform Options

| Type Name                        | Category | Status    | Phase |
|----------------------------------|----------|-----------|-------|
| `OpenAIToolFormatAdapterOptions` | Options  | ⏳ Pending | 0     |
| `AnthropicToolFormatAdapterOptions`| Options | ⏳ Pending | 0    |

### Persistence Options

| Type Name                          | Category | Status    | Phase |
|------------------------------------|----------|-----------|-------|
| `IndexedDBVectorPersistenceOptions`| Options  | ⏳ Pending | 0     |
| `OPFSVectorPersistenceOptions`     | Options  | ⏳ Pending | 0     |
| `HTTPVectorPersistenceOptions`     | Options  | ⏳ Pending | 0     |
| `IndexedDBSessionPersistenceOptions`| Options | ⏳ Pending | 0    |

### Context Builder Options

| Type Name                    | Category | Status    | Phase |
|------------------------------|----------|-----------|-------|
| `DeduplicationAdapterOptions`| Options  | ⏳ Pending | 0     |
| `TruncationAdapterOptions`   | Options  | ⏳ Pending | 0     |
| `PriorityAdapterOptions`     | Options  | ⏳ Pending | 0     |

### External Dependency Interfaces

| Type Name                           | Category   | Status    | Phase |
|-------------------------------------|------------|-----------|-------|
| `NodeLlamaCppContext`               | External   | ⏳ Pending | 0     |
| `NodeLlamaCppContextSequence`       | External   | ⏳ Pending | 0     |
| `NodeLlamaCppModel`                 | External   | ⏳ Pending | 0     |
| `NodeLlamaCppEmbeddingContext`      | External   | ⏳ Pending | 0     |
| `NodeLlamaCppEmbedding`             | External   | ⏳ Pending | 0     |
| `NodeLlamaCppChatWrapper`           | External   | ⏳ Pending | 0     |
| `NodeLlamaCppLlamaText`             | External   | ⏳ Pending | 0     |
| `NodeLlamaCppChatHistoryItem`       | External   | ⏳ Pending | 0     |
| `NodeLlamaCppEvaluateOptions`       | External   | ⏳ Pending | 0     |
| `HuggingFaceFeatureExtractionPipeline`| External | ⏳ Pending | 0    |
| `HuggingFaceTextGenerationPipeline` | External   | ⏳ Pending | 0     |
| `HuggingFaceTensor`                 | External   | ⏳ Pending | 0     |
| `HuggingFacePreTrainedModel`        | External   | ⏳ Pending | 0     |
| `HuggingFaceTokenizer`              | External   | ⏳ Pending | 0     |
| `HuggingFaceBaseStreamer`           | External   | ⏳ Pending | 0     |

### API Response Types (Internal)

| Type Name                      | Category | Status    | Phase |
|--------------------------------|----------|-----------|-------|
| `OpenAIChatCompletionChunk`    | Internal | ⏳ Pending | 0     |
| `OpenAIEmbeddingResponse`      | Internal | ⏳ Pending | 0     |
| `VoyageEmbeddingResponse`      | Internal | ⏳ Pending | 0     |
| `AnthropicMessageStreamEvent`  | Internal | ⏳ Pending | 0     |
| `OllamaChatRequest`            | Internal | ⏳ Pending | 0     |
| `OllamaChatResponse`           | Internal | ⏳ Pending | 0     |
| `OllamaEmbeddingRequest`       | Internal | ⏳ Pending | 0     |
| `OllamaEmbeddingResponse`      | Internal | ⏳ Pending | 0     |
| `SSEEvent`                     | Internal | ⏳ Pending | 0     |
| `SSEParserInterface`           | Internal | ⏳ Pending | 0     |
| `SSEParserAdapterInterface`    | Internal | ⏳ Pending | 0     |
| `SSEParserAdapterOptions`      | Internal | ⏳ Pending | 0     |

### Factory Types

| Type Name                              | Category | Status    | Phase |
|----------------------------------------|----------|-----------|-------|
| `CreateStreamerAdapter`                | Factory  | ⏳ Pending | 0     |
| `CreateSSEParser`                      | Factory  | ⏳ Pending | 0     |
| `CreateOpenAIProviderAdapter`          | Factory  | ⏳ Pending | 0     |
| `CreateAnthropicProviderAdapter`       | Factory  | ⏳ Pending | 0     |
| `CreateOllamaProviderAdapter`          | Factory  | ⏳ Pending | 0     |
| `CreateNodeLlamaCppProviderAdapter`    | Factory  | ⏳ Pending | 0     |
| `CreateHuggingFaceProviderAdapter`     | Factory  | ⏳ Pending | 0     |
| `CreateOpenAIEmbeddingAdapter`         | Factory  | ⏳ Pending | 0     |
| `CreateVoyageEmbeddingAdapter`         | Factory  | ⏳ Pending | 0     |
| `CreateOllamaEmbeddingAdapter`         | Factory  | ⏳ Pending | 0     |
| `CreateNodeLlamaCppEmbeddingAdapter`   | Factory  | ⏳ Pending | 0     |
| `CreateHuggingFaceEmbeddingAdapter`    | Factory  | ⏳ Pending | 0     |
| `CreateExponentialRetryAdapter`        | Factory  | ⏳ Pending | 0     |
| `CreateLinearRetryAdapter`             | Factory  | ⏳ Pending | 0     |
| `CreateTokenBucketRateLimitAdapter`    | Factory  | ⏳ Pending | 0     |
| `CreateSlidingWindowRateLimitAdapter`  | Factory  | ⏳ Pending | 0     |
| `CreateLRUCacheAdapter`                | Factory  | ⏳ Pending | 0     |
| `CreateTTLCacheAdapter`                | Factory  | ⏳ Pending | 0     |
| `CreateIndexedDBCacheAdapter`          | Factory  | ⏳ Pending | 0     |
| `CreateBatchAdapter`                   | Factory  | ⏳ Pending | 0     |
| `CreateCohereRerankerAdapter`          | Factory  | ⏳ Pending | 0     |
| `CreateCrossEncoderRerankerAdapter`    | Factory  | ⏳ Pending | 0     |
| `CreateOpenAIToolFormatAdapter`        | Factory  | ⏳ Pending | 0     |
| `CreateAnthropicToolFormatAdapter`     | Factory  | ⏳ Pending | 0     |
| `CreateCosineSimilarityAdapter`        | Factory  | ⏳ Pending | 0     |
| `CreateDotSimilarityAdapter`           | Factory  | ⏳ Pending | 0     |
| `CreateEuclideanSimilarityAdapter`     | Factory  | ⏳ Pending | 0     |
| `CreateIndexedDBVectorPersistence`     | Factory  | ⏳ Pending | 0     |
| `CreateOPFSVectorPersistence`          | Factory  | ⏳ Pending | 0     |
| `CreateHTTPVectorPersistence`          | Factory  | ⏳ Pending | 0     |
| `CreateIndexedDBSessionPersistence`    | Factory  | ⏳ Pending | 0     |
| `CreateToolCallBridge`                 | Factory  | ⏳ Pending | 0     |
| `CreateRetrievalTool`                  | Factory  | ⏳ Pending | 0     |
| `CreateDeduplicationAdapter`           | Factory  | ⏳ Pending | 0     |
| `CreatePriorityTruncationAdapter`      | Factory  | ⏳ Pending | 0     |
| `CreateFIFOTruncationAdapter`          | Factory  | ⏳ Pending | 0     |
| `CreateLIFOTruncationAdapter`          | Factory  | ⏳ Pending | 0     |
| `CreateScoreTruncationAdapter`         | Factory  | ⏳ Pending | 0     |
| `CreatePriorityAdapter`                | Factory  | ⏳ Pending | 0     |

**Categories:**
- **Options** — Configuration objects
- **Data** — Pure data structures
- **External** — Minimal interfaces for external dependencies
- **Internal** — API response types (not exported publicly)
- **Factory** — Factory function types

---

## Decisions Log

> **Instructions:** Log architectural decisions here. Never remove entries. 

### 2026-01-19: Green Field Refactor
**Decision:** Complete rebuild with no backward compatibility
**Rationale:** Existing codebase is fractured and inconsistent with ecosystem conventions. Clean slate is faster than incremental migration. 
**Alternatives rejected:** Incremental refactor, adapter wrappers for legacy code
**Impacts:** All phases — everything is new

### 2026-01-19: Native Streaming Default
**Decision:** All provider adapters stream by default with SSE parsing built-in
**Rationale:** Streaming is the expected behavior for LLM providers.  Non-streaming is the edge case.
**Alternatives rejected:** Opt-in streaming, separate streaming/non-streaming adapters
**Impacts:** Phase 1, Phase 2

### 2026-01-19: Optional Custom Streamer
**Decision:** Single `streamer` option on all provider adapters for custom streaming behavior
**Rationale:** Consistent API, default covers 95% of use cases, custom streamer for advanced UI batching
**Alternatives rejected:** Multiple streaming options, streamerClass exposure for HuggingFace
**Impacts:** Phase 1, Phase 2

### 2026-01-19: Internal SSE Parsing
**Decision:** SSE parsing is internal to each provider adapter, not exposed publicly
**Rationale:** Each provider has different SSE formats. Encapsulation simplifies public API.
**Alternatives rejected:** Shared SSE parser exposed publicly, SSE adapter
**Impacts:** Phase 1, Phase 2

### 2026-01-19: No Runtime Dependencies on External Libraries
**Decision:** node-llama-cpp and @huggingface/transformers are NOT runtime dependencies
**Rationale:** Consumers who don't use these adapters shouldn't pay the install cost.  Minimal interfaces allow duck typing.
**Alternatives rejected:** Peer dependencies, optional dependencies
**Impacts:** Phase 2, Phase 3

---

## Open Questions

> **Instructions:** Add questions during work.  Resolve with decisions or remove when answered.

- [ ] Should we expose SSEParserInterface publicly for advanced use cases?
- [ ] Should IndexedDB adapters accept raw IDBDatabase or require MinimalDatabaseAccess?
- [ ] Should we add a `createInMemoryVectorPersistenceAdapter` for testing? 

---

## Session Log

> **Purpose:** Track work across multiple sessions. Append new entries at the top.

### 2026-01-19 Session 1

**Started:** Plan creation
**Completed:**
- Created PLAN.md
- Created all phase files (00-06)
- Defined architecture and component structure
- Established type inventory

**Blockers Discovered:**
- None

**Ended:** Phase 0, Deliverable 0. 0 — Plan complete, ready to execute

---

## References

- [adapters.md Guide](../guides/adapters.md) — Source of truth for API design
- [types.ts](../src/types. ts) — Source of truth for type definitions
- [copilot-instructions.md](../. github/copilot-instructions.md) — Coding standards
- [instructions.md](../guides/instructions.md) — Ecosystem conventions