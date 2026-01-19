# Phase 1: Streaming & SSE

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** —
> **Depends on:** Phase 0 (Pre-Flight) ⏳ Pending

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project. 

```
Current Deliverable: 1.1 SSE Parser
Checklist Progress: 0/16 items complete
Last Completed: Phase 0 complete
Next Task:  Implement SSE parser
Blockers: None
```

---

## Objective

Implement the streaming infrastructure that all provider adapters depend on.  By end of phase, we have a working SSE parser and Streamer adapter that can emit tokens.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/3       |
| Checklist Items | 0/16      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

| #   | Deliverable              | Status    | Assignee | Notes                           |
|-----|--------------------------|-----------|----------|---------------------------------|
| 1.1 | SSE Parser               | ⏳ Pending | —        | Internal, stateful parser       |
| 1.2 | Streamer Adapter         | ⏳ Pending | —        | Default token emitter           |
| 1.3 | Unit Tests               | ⏳ Pending | —        | SSE parsing, token emission     |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation. 

| Deliverable | Required Types                                         | Status    |
|-------------|--------------------------------------------------------|-----------|
| 1.1         | `SSEEvent`, `SSEParserOptions`, `SSEParserInterface`   | ⏳ Pending |
| 1.2         | `StreamerAdapterInterface` (from core)                 | ✅ Done    |

---

## Current Focus: 1.1 SSE Parser

### Requirements

1. Stateful parser that handles chunked SSE data
2. Handles `event: `, `data:`, `id:`, `retry:` fields
3. Handles multi-line data fields
4. Emits parsed events via callback
5. Handles incomplete chunks across feed() calls

### Interface Contract

```typescript
// From src/types.ts
export interface SSEEvent {
	readonly event?:  string
	readonly data:  string
	readonly id?: string
	readonly retry?: number
}

export interface SSEParserOptions {
	readonly onEvent:  (event: SSEEvent) => void
	readonly onError?:  (error: Error) => void
	readonly onEnd?: () => void
}

export interface SSEParserInterface {
	feed(chunk: string): void
	end(): void
	reset(): void
}
```

### Implementation Order

1. `src/internal/SSEParser.ts` — Implementation
2. `tests/internal/SSEParser. test.ts` — Unit tests

### Implementation Checklist

**Implementation:**
- [ ] Create `src/internal/SSEParser.ts`
- [ ] Implement `createSSEParser(options): SSEParserInterface`
- [ ] Handle `data: ` field (including multi-line)
- [ ] Handle `event:` field
- [ ] Handle `id:` field
- [ ] Handle `retry:` field
- [ ] Handle incomplete chunks (buffer across calls)
- [ ] Handle empty lines (event boundary)
- [ ] Implement `end()` — flush remaining buffer
- [ ] Implement `reset()` — clear state

**Tests:**
- [ ] Test single complete event
- [ ] Test multi-line data
- [ ] Test chunked data across multiple feed() calls
- [ ] Test multiple events in one chunk
- [ ] Test event field variations
- [ ] Test error handling

### Acceptance Criteria

```typescript
describe('SSEParser', () => {
	it('parses complete SSE event', () => {
		const events: SSEEvent[] = []
		const parser = createSSEParser({
			onEvent:  (e) => events.push(e),
		})
		
		parser.feed('data:  {"token": "hello"}\n\n')
		
		expect(events).toHaveLength(1)
		expect(events[0]. data).toBe('{"token": "hello"}')
	})

	it('handles chunked data', () => {
		const events: SSEEvent[] = []
		const parser = createSSEParser({
			onEvent: (e) => events.push(e),
		})
		
		parser.feed('data: {"tok')
		parser.feed('en": "hello"}\n\n')
		
		expect(events).toHaveLength(1)
	})
})
```

### Blocked By

- Phase 0 complete

### Blocks

- 1.2 Streamer Adapter (needs SSE for testing patterns)
- Phase 2 Provider Adapters (all use SSE)

---

## 1.2 Streamer Adapter

### Requirements

1. Implements `StreamerAdapterInterface` from core
2. Allows subscribing to token events
3. Emits tokens to all subscribers
4. Signals end of streaming
5. Returns unsubscribe function

### Interface Contract

```typescript
// From @mikesaintsg/core
interface StreamerAdapterInterface {
	onToken(callback: (token: string) => void): Unsubscribe
	emit(token: string): void
	end(): void
}
```

### Implementation Order

1. `src/core/streaming/Streamer. ts` — Implementation
2. `src/factories.ts` — Add `createStreamerAdapter`
3. `tests/core/streaming/Streamer. test.ts` — Unit tests

### Implementation Checklist

**Implementation:**
- [ ] Create `src/core/streaming/Streamer.ts`
- [ ] Use `#listeners = new Set<(token: string) => void>()`
- [ ] Implement `onToken()` — add to set, return unsubscribe
- [ ] Implement `emit()` — call all listeners
- [ ] Implement `end()` — signal completion (optional:  clear listeners)

**Exports:**
- [ ] Add `createStreamerAdapter` to `src/factories.ts`
- [ ] Export from `src/index.ts`

**Tests:**
- [ ] Test single subscriber receives tokens
- [ ] Test multiple subscribers receive tokens
- [ ] Test unsubscribe stops receiving
- [ ] Test emit after end (edge case)

### Acceptance Criteria

```typescript
describe('Streamer', () => {
	it('emits tokens to subscribers', () => {
		const streamer = createStreamerAdapter()
		const tokens:  string[] = []
		
		streamer.onToken((t) => tokens.push(t))
		streamer.emit('Hello')
		streamer.emit(' world')
		
		expect(tokens).toEqual(['Hello', ' world'])
	})

	it('unsubscribe stops receiving', () => {
		const streamer = createStreamerAdapter()
		const tokens: string[] = []
		
		const unsub = streamer. onToken((t) => tokens.push(t))
		streamer.emit('Hello')
		unsub()
		streamer.emit(' world')
		
		expect(tokens).toEqual(['Hello'])
	})
})
```

### Blocked By

- 1.1 SSE Parser (for pattern consistency)

### Blocks

- Phase 2 Provider Adapters (all use Streamer)

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                                      | Action   | Deliverable |
|-------------------------------------------|----------|-------------|
| `src/internal/SSEParser. ts`               | Created  | 1.1         |
| `tests/internal/SSEParser.test. ts`        | Created  | 1.1         |
| `src/core/streaming/Streamer.ts`          | Created  | 1.2         |
| `src/factories.ts`                        | Modified | 1.2         |
| `src/index.ts`                            | Modified | 1.2         |
| `tests/core/streaming/Streamer.test.ts`   | Created  | 1.3         |

---

## Quality Gates (Phase-Specific)

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
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

| Component   | Min Coverage | Current |
|-------------|--------------|---------|
| SSEParser   | 90%          | —       |
| Streamer    | 100%         | —       |

---

## Notes

- SSE format reference: https://html.spec.whatwg.org/multipage/server-sent-events. html
- OpenAI uses `data:  [DONE]` to signal end
- Anthropic uses `event: message_stop`
- Each provider adapter will use SSEParser internally

---

## Rollback Notes

**Safe State:** Phase 0 complete
**Files to Revert:** `src/internal/`, `src/core/streaming/`
**Dependencies:** None

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] No `it.todo()` remaining in phase scope
- [ ] SSE parser handles all edge cases
- [ ] Streamer works with multiple subscribers
- [ ] PLAN.md updated