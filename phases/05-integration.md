# Phase 5: Integration

> **Status:** 🔄 Active
> **Started:** 2026-01-17
> **Target:** —
> **Depends on:** Phase 3 (Embeddings) ✅ and Phase 4 (Providers) ✅

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: 5.7 Showcase Demo
Checklist Progress: 6/8 deliverables complete
Last Completed: 5.6 Retrieval Tool Factory
Next Task: Implement showcase demo
Blockers: None
```

---

## Objective

Implement persistence adapters, bridge functions, and create the showcase demo. By end of phase:

- Session persistence via IndexedDB
- VectorStore persistence via IndexedDB, OPFS, HTTP
- Tool call bridge connecting inference ↔ contextprotocol
- Retrieval tool factory for VectorStore querying
- Comprehensive showcase demonstrating all features
- Full integration tests

---

## Progress Summary

| Metric          | Value      |
|-----------------|------------|
| Deliverables    | 6/8        |
| Checklist Items | 24/35      |
| Tests Passing   | 305        |
| Quality Gates   | ✅ Passing |

---

## Deliverables

| #   | Deliverable                   | Status    | Assignee | Notes                               |
|-----|-------------------------------|-----------|----------|-------------------------------------|
| 5.1 | Session Persistence (IndexedDB)| ✅ Done  | —        | 20 tests, TTL expiration            |
| 5.2 | VectorStore Persistence (IDB) | ✅ Done   | —        | Pre-existing implementation         |
| 5.3 | VectorStore Persistence (OPFS)| ✅ Done   | —        | Pre-existing implementation         |
| 5.4 | VectorStore Persistence (HTTP)| ✅ Done   | —        | Pre-existing implementation         |
| 5.5 | Tool Call Bridge              | ✅ Done   | —        | 14 tests, timeout + hooks           |
| 5.6 | Retrieval Tool Factory        | ✅ Done   | —        | 9 tests, topK/minScore config       |
| 5.7 | Showcase Demo                 | ⏳ Pending | —        | Interactive demo of all features    |
| 5.8 | Integration Tests             | ⏳ Pending | —        | Full package integration tests      |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                                   | Status    |
|-------------|--------------------------------------------------|-----------|
| 5.1         | SessionPersistenceAdapterInterface, IndexedDBSessionPersistenceOptions | ✅ Done |
| 5.2         | VectorStorePersistenceAdapterInterface, IndexedDBVectorPersistenceOptions | ✅ Done |
| 5.3         | OPFSVectorPersistenceOptions                     | ✅ Done   |
| 5.4         | HTTPVectorPersistenceOptions                     | ✅ Done   |
| 5.5         | ToolCallBridgeInterface, ToolCallBridgeOptions   | ✅ Done   |
| 5.6         | RetrievalToolOptions, RetrievalToolResult        | ✅ Done   |

---

## Current Focus: 5.1 Session Persistence (IndexedDB)

### Requirements

1. Implement `SessionPersistenceAdapterInterface`
2. Store sessions in IndexedDB
3. Support TTL-based expiration
4. Provide session listing and cleanup
5. Handle browser storage limits

### Interface Contract

```typescript
interface SessionPersistenceAdapterInterface {
	save(session: PersistedSession): Promise<void>
	load(id: string): Promise<PersistedSession | undefined>
	remove(id: string): Promise<void>
	all(): Promise<readonly SessionSummary[]>
	clear(): Promise<void>
}

interface IndexedDBSessionPersistenceOptions {
	readonly databaseName?: string  // default: 'mikesaintsg-sessions'
	readonly storeName?: string     // default: 'sessions'
	readonly ttlMs?: number         // default: 7 days
}
```

### Implementation Order

1. `src/types.ts` — Already done
2. `src/persistence/sessions/indexeddb.ts` — Implementation
3. `src/persistence/sessions/index.ts` — Barrel export
4. `src/factories.ts` — Add factory
5. `tests/persistence/sessions/indexeddb.test.ts` — Unit tests

### Implementation Checklist

**Persistence Implementation:**
- [ ] Create `src/persistence/sessions/` directory
- [ ] Create `createIndexedDBSessionPersistence()` factory
- [ ] Open/create IndexedDB database
- [ ] Implement `save()` — serialize and store session
- [ ] Implement `load()` — deserialize session
- [ ] Implement `remove()` — delete by ID
- [ ] Implement `all()` — list session summaries
- [ ] Implement `clear()` — remove all sessions
- [ ] Handle TTL expiration on load
- [ ] Auto-prune expired sessions

**IndexedDB Handling:**
- [ ] Handle database versioning
- [ ] Handle quota exceeded errors
- [ ] Handle missing object store
- [ ] Support transaction aborts

**Exports:**
- [ ] Create `src/persistence/sessions/index.ts` barrel
- [ ] Add factory to `src/factories.ts`
- [ ] Export from `src/persistence/index.ts`
- [ ] Export from `src/index.ts`

### Acceptance Criteria

```typescript
describe('IndexedDB Session Persistence', () => {
	it('saves and loads session', async () => {
		const persistence = createIndexedDBSessionPersistence({
			databaseName: 'test-sessions',
		})
		
		const session: PersistedSession = {
			id: 'test-session',
			messages: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		
		await persistence.save(session)
		const loaded = await persistence.load('test-session')
		
		expect(loaded).toBeDefined()
		expect(loaded?.id).toBe('test-session')
	})

	it('respects TTL expiration', async () => {
		const persistence = createIndexedDBSessionPersistence({
			ttlMs: 100, // 100ms TTL
		})
		
		await persistence.save(session)
		await sleep(150)
		
		const loaded = await persistence.load('test-session')
		expect(loaded).toBeUndefined()
	})
})
```

### Blocked By

- Phase 3 and 4 must be complete

### Blocks

- 5.7 (Showcase) — uses session persistence

---

## Deliverable 5.2: VectorStore Persistence (IndexedDB)

### Requirements

1. Implement `VectorStorePersistenceAdapterInterface` from `@mikesaintsg/core`
2. Store documents and metadata in IndexedDB
3. Handle Float32Array serialization
4. Support batch operations

### Interface Contract

```typescript
// From @mikesaintsg/core
interface VectorStorePersistenceAdapterInterface {
	load(): Promise<readonly StoredDocument[]>
	loadMetadata(): Promise<VectorStoreMetadata | undefined>
	save(docs: StoredDocument | readonly StoredDocument[]): Promise<void>
	saveMetadata(metadata: VectorStoreMetadata): Promise<void>
	remove(ids: string | readonly string[]): Promise<void>
	clear(): Promise<void>
	isAvailable(): Promise<boolean>
}
```

### Implementation Checklist

- [ ] Create `createIndexedDBVectorPersistence()` factory
- [ ] Implement all interface methods
- [ ] Handle Float32Array serialization (use helpers)
- [ ] Support batch save operations
- [ ] Support batch remove operations
- [ ] Handle database versioning
- [ ] Add factory to exports

### Blocked By

- 5.1 (Session Persistence) — same IndexedDB pattern

---

## Deliverable 5.3: VectorStore Persistence (OPFS)

### Requirements

1. Implement `VectorStorePersistenceAdapterInterface`
2. Store vectors in Origin Private File System
3. Handle chunked storage for large datasets
4. Support efficient batch operations

### Implementation Checklist

- [ ] Create `createOPFSVectorPersistence()` factory
- [ ] Implement all interface methods
- [ ] Use chunked file storage for documents
- [ ] Store metadata in separate file
- [ ] Handle OPFS availability check
- [ ] Handle file read/write errors
- [ ] Add factory to exports

### Blocked By

- 5.2 (IndexedDB Persistence) — similar pattern

---

## Deliverable 5.4: VectorStore Persistence (HTTP)

### Requirements

1. Implement `VectorStorePersistenceAdapterInterface`
2. Sync vectors with remote HTTP API
3. Support custom headers (auth tokens)
4. Handle network errors gracefully

### Implementation Checklist

- [ ] Create `createHTTPVectorPersistence()` factory
- [ ] Implement all interface methods
- [ ] Use fetch for HTTP requests
- [ ] Support custom headers
- [ ] Handle timeout configuration
- [ ] Map HTTP errors to appropriate errors
- [ ] Add factory to exports

### Blocked By

- 5.3 (OPFS Persistence) — sequential implementation

---

## Deliverable 5.5: Tool Call Bridge

### Requirements

1. Implement `ToolCallBridgeInterface`
2. Connect inference tool calls to contextprotocol execution
3. Support timeout per tool
4. Provide error handling hooks

### Interface Contract

```typescript
interface ToolCallBridgeInterface {
	execute(toolCall: ToolCall): Promise<ToolResult>
	executeAll(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	hasTool(name: string): boolean
}

interface ToolCallBridgeOptions {
	readonly registry: ToolRegistryInterface
	readonly timeout?: number
	readonly onError?: (error: unknown, toolCall: ToolCall) => void
	readonly onBeforeExecute?: (toolCall: ToolCall) => void
	readonly onAfterExecute?: (toolCall: ToolCall, result: unknown) => void
}
```

### Implementation Checklist

- [ ] Create `src/bridges/` directory
- [ ] Create `createToolCallBridge()` factory
- [ ] Implement `execute()` — single tool call
- [ ] Implement `executeAll()` — parallel execution
- [ ] Implement `hasTool()` — check registry
- [ ] Support timeout per execution
- [ ] Call lifecycle hooks
- [ ] Handle errors with callback
- [ ] Add factory to exports

### Blocked By

- 5.4 (HTTP Persistence) — sequential implementation

---

## Deliverable 5.6: Retrieval Tool Factory

### Requirements

1. Create tool schema for VectorStore querying
2. Create execute function that queries VectorStore
3. Support topK and minScore configuration
4. Support custom result formatting

### Interface Contract

```typescript
interface RetrievalToolOptions {
	readonly vectorStore: VectorStoreInterface
	readonly name: string
	readonly description: string
	readonly topK?: number      // default: 5
	readonly minScore?: number  // default: 0.7
	readonly formatResult?: (result: SearchResult) => unknown
}

interface RetrievalToolResult {
	readonly schema: ToolSchema
	readonly execute: (params: { readonly query: string }) => Promise<readonly SearchResult[]>
}
```

### Implementation Checklist

- [ ] Create `createRetrievalTool()` factory
- [ ] Generate ToolSchema with query parameter
- [ ] Implement execute function
- [ ] Support topK limit
- [ ] Support minScore threshold
- [ ] Support custom result formatting
- [ ] Add factory to exports

### Blocked By

- 5.5 (Tool Call Bridge) — uses same patterns

---

## Deliverable 5.7: Showcase Demo

### Requirements

1. Interactive demo of all adapter features
2. Display embedding generation
3. Display provider streaming
4. Display persistence operations
5. Single-file HTML output

### Implementation Checklist

**Demo Features:**
- [ ] Embedding adapter demo section
- [ ] Provider adapter streaming demo
- [ ] Persistence operations demo
- [ ] Tool call bridge demo
- [ ] Error handling demo

**UI:**
- [ ] Clean, responsive layout
- [ ] Status indicators
- [ ] Result display areas
- [ ] Copy-to-clipboard for code

**Build:**
- [ ] Vite single-file build
- [ ] `npm run show` script
- [ ] Output to `dist/showcase/`

### Blocked By

- 5.1-5.6 — all features implemented

---

## Deliverable 5.8: Integration Tests

### Requirements

1. Test full adapter composition
2. Test provider + tool format integration
3. Test embedding + caching + batching
4. Test persistence + retrieval

### Implementation Checklist

**Embedding Integration:**
- [ ] `tests/integration/embeddings.test.ts`
- [ ] Test cached + batched + base composition
- [ ] Test with mock API

**Provider Integration:**
- [ ] `tests/integration/providers.test.ts`
- [ ] Test provider + tool format
- [ ] Test streaming with tools

**Persistence Integration:**
- [ ] `tests/integration/persistence.test.ts`
- [ ] Test session save/restore
- [ ] Test vector store operations

**Bridge Integration:**
- [ ] `tests/integration/bridges.test.ts`
- [ ] Test tool call bridge flow
- [ ] Test retrieval tool

### Blocked By

- 5.7 (Showcase) — all features working

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                                        | Action  | Deliverable |
|---------------------------------------------|---------|-------------|
| `src/persistence/sessions/indexeddb.ts`     | Created | 5.1         |
| `src/persistence/sessions/index.ts`         | Created | 5.1         |
| `src/persistence/vectorstore/indexeddb.ts`  | Modified| 5.2         |
| `src/persistence/vectorstore/opfs.ts`       | Modified| 5.3         |
| `src/persistence/vectorstore/http.ts`       | Modified| 5.4         |
| `src/bridges/tool-call.ts`                  | Created | 5.5         |
| `src/bridges/retrieval.ts`                  | Created | 5.6         |
| `src/bridges/index.ts`                      | Created | 5.5         |
| `src/factories.ts`                          | Modified| All         |
| `src/index.ts`                              | Modified| All         |
| `showcase/main.ts`                          | Modified| 5.7         |
| `showcase/styles.css`                       | Modified| 5.7         |
| `showcase/index.html`                       | Modified| 5.7         |
| `tests/persistence/sessions/indexeddb.test.ts` | Created | 5.1      |
| `tests/persistence/vectorstore/*.test.ts`   | Created | 5.2-5.4     |
| `tests/bridges/tool-call.test.ts`           | Created | 5.5         |
| `tests/bridges/retrieval.test.ts`           | Created | 5.6         |
| `tests/integration/*.test.ts`               | Created | 5.8         |

---

## Quality Gates (Phase-Specific)

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
npm run show     # Build showcase
```

**Current Status:**

| Gate            | Last Run | Result |
|-----------------|----------|--------|
| `npm run check` | —        | ⏳     |
| `npm run format`| —        | ⏳     |
| `npm run build` | —        | ⏳     |
| `npm test`      | —        | ⏳     |
| `npm run show`  | —        | ⏳     |

---

## Test Coverage Requirements

| Component                         | Min Coverage | Current |
|-----------------------------------|--------------|---------|
| persistence/sessions/indexeddb.ts | 85%          | —       |
| persistence/vectorstore/*.ts      | 80%          | —       |
| bridges/tool-call.ts              | 90%          | —       |
| bridges/retrieval.ts              | 85%          | —       |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- IndexedDB transactions are async; handle properly
- OPFS requires secure context (HTTPS or localhost)
- HTTP persistence needs proper error handling
- Tool call bridge must handle tool not found
- Retrieval tool generates dynamic schema
- Showcase should work without external APIs (mock mode)
- Use `#` private fields in all implementations

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** End of Phase 4
**Files to Revert:** All files in src/persistence/, src/bridges/, showcase/
**Dependencies:** IndexedDB databases may need manual cleanup in browser

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run show` generates showcase
- [ ] No `it.todo()` remaining in phase scope
- [ ] All files in "Files Created/Modified" reviewed
- [ ] Showcase demonstrates all features
- [ ] PLAN.md updated:
  - [ ] Phase 5 status → ✅ Complete
  - [ ] All success criteria checked
  - [ ] Session Log entry added

---

## Project Completion Criteria

When Phase 5 is complete, verify:

- [ ] All provider adapters work with real APIs (manual test)
- [ ] All embedding adapters work with real APIs (manual test)
- [ ] Ollama adapters work with local Ollama (manual test)
- [ ] All persistence adapters work in browser (manual test)
- [ ] Showcase runs successfully
- [ ] Documentation is complete
- [ ] Package can be published to npm
