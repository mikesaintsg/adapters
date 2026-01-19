# Phase 0: Pre-Flight

> **Status:** 🔄 In Progress
> **Started:** 2026-01-19
> **Target:** 2026-01-19
> **Depends on:** None

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project. 

```
Current Deliverable: 0.1 Project Scaffold
Checklist Progress: 0/12 items complete
Last Completed: Plan created
Next Task: Delete all existing src/ and tests/ content
Blockers: None
```

---

## Objective

Establish the project foundation with proper structure, validated types, and supporting infrastructure.  By end of phase, the project should have a clean scaffold ready for implementation.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/4       |
| Checklist Items | 0/32      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

| #   | Deliverable              | Status    | Assignee | Notes                        |
|-----|--------------------------|-----------|----------|------------------------------|
| 0.1 | Project Scaffold         | ⏳ Pending | —        | Clean slate, folder structure|
| 0.2 | Types Validation         | ⏳ Pending | —        | Ensure types. ts compiles     |
| 0.3 | Helpers & Constants      | ⏳ Pending | —        | Error helpers, defaults      |
| 0.4 | Barrel Exports           | ⏳ Pending | —        | index.ts, factories.ts stubs |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                                    | Status    |
|-------------|---------------------------------------------------|-----------|
| 0.2         | All types from types.ts                           | ⏳ Pending |
| 0.3         | `AdapterErrorCode`, `AdapterErrorData`            | ⏳ Pending |

---

## Current Focus:  0.1 Project Scaffold

### Requirements

1. Delete ALL existing content in `src/` and `tests/`
2. Create folder structure matching architecture
3. Create empty placeholder files

### Folder Structure

```
src/
├── index.ts              # Barrel exports only
├── types.ts              # All types (from our types.ts)
├── helpers.ts            # Type guards, pure functions
├── constants.ts          # Defaults, error codes
├── factories.ts          # All create* factory functions
├── core/
│   ├── streaming/
│   │   └── Streamer.ts
│   ├── providers/
│   │   ├── OpenAIProvider.ts
│   │   ├── AnthropicProvider.ts
│   │   ├── OllamaProvider.ts
│   │   ├── NodeLlamaCppProvider.ts
│   │   └── HuggingFaceProvider.ts
│   ├── embeddings/
│   │   ├── OpenAIEmbedding.ts
│   │   ├── VoyageEmbedding.ts
│   │   ├── OllamaEmbedding.ts
│   │   ├── NodeLlamaCppEmbedding.ts
│   │   └── HuggingFaceEmbedding.ts
│   ├── policy/
│   │   ├── ExponentialRetry.ts
│   │   ├── LinearRetry.ts
│   │   ├── TokenBucketRateLimit.ts
│   │   └── SlidingWindowRateLimit.ts
│   ├── enhancement/
│   │   ├── LRUCache.ts
│   │   ├── TTLCache.ts
│   │   ├── IndexedDBCache.ts
│   │   ├── Batch.ts
│   │   ├── CohereReranker.ts
│   │   └── CrossEncoderReranker.ts
│   ├── transform/
│   │   ├── OpenAIToolFormat.ts
│   │   ├── AnthropicToolFormat.ts
│   │   ├── CosineSimilarity.ts
│   │   ├── DotSimilarity.ts
│   │   └── EuclideanSimilarity.ts
│   ├── persistence/
│   │   ├── IndexedDBVectorPersistence. ts
│   │   ├── OPFSVectorPersistence.ts
│   │   ├── HTTPVectorPersistence. ts
│   │   └── IndexedDBSessionPersistence.ts
│   ├── bridge/
│   │   ├── ToolCallBridge. ts
│   │   └── RetrievalTool. ts
│   └── contextbuilder/
│       ├── Deduplication.ts
│       ├── PriorityTruncation.ts
│       ├── FIFOTruncation.ts
│       ├── LIFOTruncation.ts
│       ├── ScoreTruncation.ts
│       └── Priority.ts
└── internal/
    └── SSEParser.ts

tests/
├── setup.ts
└── core/
    ├── streaming/
    │   └── Streamer.test.ts
    ├── providers/
    │   ├── OpenAIProvider.test.ts
    │   ├── AnthropicProvider.test.ts
    │   ├── OllamaProvider.test. ts
    │   ├── NodeLlamaCppProvider. test.ts
    │   └── HuggingFaceProvider.test.ts
    ├── embeddings/
    │   └── ...  (mirrors src/)
    ├── policy/
    │   └── ... (mirrors src/)
    ├── enhancement/
    │   └── ... (mirrors src/)
    ├── transform/
    │   └── ...  (mirrors src/)
    ├── persistence/
    │   └── ... (mirrors src/)
    ├── bridge/
    │   └── ... (mirrors src/)
    └── contextbuilder/
        └── ...  (mirrors src/)
```

### Implementation Checklist

**Cleanup:**
- [ ] Delete all files in `src/` (except keep package.json, tsconfig.json, etc.)
- [ ] Delete all files in `tests/`

**Folders:**
- [ ] Create `src/core/streaming/`
- [ ] Create `src/core/providers/`
- [ ] Create `src/core/embeddings/`
- [ ] Create `src/core/policy/`
- [ ] Create `src/core/enhancement/`
- [ ] Create `src/core/transform/`
- [ ] Create `src/core/persistence/`
- [ ] Create `src/core/bridge/`
- [ ] Create `src/core/contextbuilder/`
- [ ] Create `src/internal/`
- [ ] Create `tests/core/` (mirroring src/core/)

**Placeholder Files (empty or minimal):**
- [ ] Create all `.ts` files as empty placeholders with TODO comments

### Acceptance Criteria

```
✓ All old src/ content deleted
✓ All old tests/ content deleted  
✓ Folder structure matches architecture diagram
✓ All placeholder files created
```

### Blocked By

- Nothing

### Blocks

- 0.2, 0.3, 0.4 — All require scaffold

---

## 0.2 Types Validation

### Requirements

1. Copy the new types. ts content into `src/types.ts`
2. Ensure it compiles with `npm run check`
3. Verify all imports from `@mikesaintsg/core` resolve

### Implementation Checklist

**Types:**
- [ ] Copy new types.ts content
- [ ] Run `npm run check` — must pass
- [ ] Verify no missing imports from `@mikesaintsg/core`

### Blocked By

- 0.1 Project Scaffold

---

## 0.3 Helpers & Constants

### Requirements

1. Create `isAdapterError` type guard
2. Create `createAdapterError` helper
3. Create default constants for all adapters
4. Create error code constants

### Implementation Checklist

**helpers.ts:**
- [ ] `isAdapterError(error: unknown): error is AdapterError`
- [ ] `createAdapterError(code, message, data? ): AdapterError`
- [ ] `narrowUnknown<T>(value: unknown, guard: (v: unknown) => v is T): T | undefined`

**constants.ts:**
- [ ] `DEFAULT_OPENAI_MODEL`
- [ ] `DEFAULT_OPENAI_BASE_URL`
- [ ] `DEFAULT_ANTHROPIC_MODEL`
- [ ] `DEFAULT_ANTHROPIC_BASE_URL`
- [ ] `DEFAULT_OLLAMA_BASE_URL`
- [ ] `DEFAULT_VOYAGE_BASE_URL`
- [ ] `DEFAULT_RETRY_MAX_ATTEMPTS`
- [ ] `DEFAULT_RETRY_INITIAL_DELAY_MS`
- [ ] `DEFAULT_RETRY_MAX_DELAY_MS`
- [ ] `DEFAULT_RATE_LIMIT_RPM`
- [ ] `DEFAULT_CACHE_MAX_SIZE`
- [ ] `DEFAULT_CACHE_TTL_MS`
- [ ] `DEFAULT_BATCH_SIZE`
- [ ] `DEFAULT_TIMEOUT_MS`
- [ ] `RETRYABLE_ERROR_CODES`

### Blocked By

- 0.2 Types Validation

---

## 0.4 Barrel Exports

### Requirements

1. Create `src/factories.ts` with stub factory functions
2. Create `src/index.ts` with all exports
3. All stubs should throw "Not implemented" for now

### Implementation Checklist

**factories. ts:**
- [ ] Add stub for every `create*` function
- [ ] Each stub throws `new Error('Not implemented:  createXxx')`

**index.ts:**
- [ ] Export all types from types.ts
- [ ] Export all helpers from helpers.ts
- [ ] Export all constants from constants.ts
- [ ] Export all factory functions from factories. ts

### Acceptance Criteria

```typescript
// This must compile
import { 
  createStreamerAdapter,
  createOpenAIProviderAdapter,
  isAdapterError,
  DEFAULT_OPENAI_MODEL,
  type OpenAIProviderAdapterOptions,
} from '@mikesaintsg/adapters'
```

### Blocked By

- 0.3 Helpers & Constants

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review. 

| File                                      | Action   | Deliverable |
|-------------------------------------------|----------|-------------|
| `src/*` (all old files)                   | Deleted  | 0.1         |
| `tests/*` (all old files)                 | Deleted  | 0.1         |
| `src/core/**/*`                           | Created  | 0.1         |
| `src/internal/*`                          | Created  | 0.1         |
| `tests/core/**/*`                         | Created  | 0.1         |
| `src/types.ts`                            | Created  | 0.2         |
| `src/helpers.ts`                          | Created  | 0.3         |
| `src/constants.ts`                        | Created  | 0.3         |
| `src/factories.ts`                        | Created  | 0.4         |
| `src/index.ts`                            | Created  | 0.4         |

---

## Quality Gates (Phase-Specific)

> **Instructions:** Run after EACH deliverable, not just at phase end.

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests (will have no tests yet)
```

**Current Status:**

| Gate             | Last Run | Result |
|------------------|----------|--------|
| `npm run check`  | —        | ⏳      |
| `npm run format` | —        | ⏳      |
| `npm run build`  | —        | ⏳      |
| `npm test`       | —        | ⏳      |

---

## Test Coverage Requirements

| Component      | Min Coverage | Current |
|----------------|--------------|---------|
| helpers. ts     | 100%         | —       |
| constants.ts   | N/A          | —       |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- Remember:  This is a GREEN FIELD project — no legacy code consideration
- All old code is deleted, not refactored
- Use `#` private fields, not `private` keyword
- All factory stubs throw until implemented

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** Git commit before starting Phase 0
**Files to Revert:** All of `src/`, `tests/`
**Dependencies:** None — clean slate

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes (even if no tests)
- [ ] Folder structure matches architecture
- [ ] types.ts compiles with all imports resolved
- [ ] index.ts exports compile
- [ ] PLAN.md updated:
  - [ ] Phase 0 status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
