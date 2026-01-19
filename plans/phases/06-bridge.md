# Phase 6: Bridge & Finalize

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** —
> **Depends on:** Phase 5 (Transform & Persistence) ⏳ Pending

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project. 

```
Current Deliverable: 6.1 Tool Call Bridge
Checklist Progress: 0/36 items complete
Last Completed: Phase 5 complete
Next Task: Implement tool call bridge
Blockers: None
```

---

## Objective

Implement bridge functions, context builder adapters, and finalize the package. By end of phase, the package is complete, documented, and ready for release.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/10      |
| Checklist Items | 0/36      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

### Bridge Functions

| #   | Deliverable              | Status    | Assignee | Notes                    |
|-----|--------------------------|-----------|----------|--------------------------|
| 6.1 | Tool Call Bridge         | ⏳ Pending | —        | Inference ↔ contextprotocol |
| 6.2 | Retrieval Tool           | ⏳ Pending | —        | Vectorstore → tool       |

### Context Builder Adapters

| #   | Deliverable              | Status    | Assignee | Notes                    |
|-----|--------------------------|-----------|----------|--------------------------|
| 6.3 | Deduplication Adapter    | ⏳ Pending | —        | Frame deduplication      |
| 6.4 | Priority Truncation      | ⏳ Pending | —        | Priority-based truncation|
| 6.5 | FIFO Truncation          | ⏳ Pending | —        | Oldest first             |
| 6.6 | LIFO Truncation          | ⏳ Pending | —        | Newest first             |
| 6.7 | Score Truncation         | ⏳ Pending | —        | Score-based truncation   |
| 6.8 | Priority Adapter         | ⏳ Pending | —        | Priority scoring         |

### Finalization

| #   | Deliverable              | Status    | Assignee | Notes                    |
|-----|--------------------------|-----------|----------|--------------------------|
| 6.9 | Unit Tests               | ⏳ Pending | —        | All bridge & CB adapters |
| 6.10| Final Review             | ⏳ Pending | —        | Docs, exports, coverage  |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

| Deliverable | Required Types                              | Status |
|-------------|---------------------------------------------|--------|
| 6.1         | `ToolCallBridgeOptions`, `ToolCallBridgeInterface` | ✅   |
| 6.2         | `RetrievalToolOptions`, `RetrievalToolInterface` | ✅    |
| 6.3         | `DeduplicationAdapterOptions`               | ✅      |
| 6.4-6.7     | `TruncationAdapterOptions`                  | ✅      |
| 6.8         | `PriorityAdapterOptions`                    | ✅      |

---

## Current Focus: 6.1 Tool Call Bridge

### Requirements

1. Implements `ToolCallBridgeInterface`
2. Connects inference tool calls to contextprotocol handlers
3. Array overload for batch execution
4. Timeout support
5. Error callback

### Interface Contract

```typescript
// From @mikesaintsg/core
interface ToolCallBridgeInterface {
	execute(toolCall: ToolCall): Promise<ToolResult>
	execute(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	hasTool(name: string): boolean
}

interface ToolCallBridgeOptions {
	readonly registry:  ToolRegistryInterface
	readonly timeout?: number
	readonly onError?: (error:  unknown, toolCall:  ToolCall) => void
}
```

### Implementation Order

1. `src/core/bridge/ToolCallBridge. ts` — Implementation
2. `src/factories.ts` — Add `createToolCallBridge`
3. `tests/core/bridge/ToolCallBridge.test.ts` — Unit tests

### Implementation Checklist

**Implementation:**
- [ ] Create `src/core/bridge/ToolCallBridge.ts`
- [ ] Implement constructor with options
- [ ] Implement `execute(toolCall)`:
  - [ ] Look up handler in registry
  - [ ] Execute with timeout if configured
  - [ ] Wrap result in ToolResult
  - [ ] Call onError on failure
- [ ] Implement `execute(toolCalls)` (array overload):
  - [ ] Execute all in parallel
  - [ ] Return results in same order
- [ ] Implement `hasTool()`:
  - [ ] Delegate to registry

### Implementation Pattern

```typescript
class ToolCallBridge implements ToolCallBridgeInterface {
	#registry: ToolRegistryInterface
	#timeout?:  number
	#onError?: (error:  unknown, toolCall:  ToolCall) => void

	execute(toolCall: ToolCall): Promise<ToolResult>
	execute(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	async execute(
		input: ToolCall | readonly ToolCall[]
	): Promise<ToolResult | readonly ToolResult[]> {
		if (Array.isArray(input)) {
			return Promise.all(input. map((tc) => this.#executeSingle(tc)))
		}
		return this.#executeSingle(input)
	}

	async #executeSingle(toolCall: ToolCall): Promise<ToolResult> {
		const handler = this.#registry.get(toolCall.name)
		if (!handler) {
			return {
				callId: toolCall. id,
				name: toolCall.name,
				value: null,
				error: `Tool not found: ${toolCall.name}`,
			}
		}

		try {
			const value = await this.#withTimeout(
				handler(toolCall. arguments),
				this.#timeout
			)
			return {
				callId: toolCall.id,
				name: toolCall.name,
				value,
			}
		} catch (error) {
			this.#onError? .(error, toolCall)
			return {
				callId: toolCall.id,
				name:  toolCall.name,
				value: null,
				error:  error instanceof Error ? error.message : String(error),
			}
		}
	}
}
```

### Acceptance Criteria

```typescript
describe('ToolCallBridge', () => {
	it('executes single tool call', async () => {
		const registry = createMockRegistry()
		registry.register(weatherSchema, async (args) => {
			return { temperature: 72 }
		})

		const bridge = createToolCallBridge({ registry })

		const result = await bridge.execute({
			id: 'call_123',
			name: 'get_weather',
			arguments: { city:  'Paris' },
		})

		expect(result. value).toEqual({ temperature: 72 })
	})

	it('executes multiple tool calls in parallel', async () => {
		const bridge = createToolCallBridge({ registry })

		const results = await bridge.execute([
			{ id:  'call_1', name: 'get_weather', arguments: { city: 'Paris' } },
			{ id:  'call_2', name: 'get_weather', arguments: { city: 'London' } },
		])

		expect(results).toHaveLength(2)
	})
})
```

---

## 6.2 Retrieval Tool

### Requirements

1. Creates a tool that queries a vector store
2. Returns `RetrievalToolInterface` with schema and handler
3. Configurable default limit and score threshold

### Interface Contract

```typescript
interface RetrievalToolInterface {
	readonly schema: ToolSchema
	readonly handler:  (args:  Readonly<Record<string, unknown>>) => Promise<readonly unknown[]>
}

interface RetrievalToolOptions {
	readonly vectorStore: VectorStoreInterface
	readonly name: string
	readonly description: string
	readonly defaultLimit?:  number
	readonly scoreThreshold?: number
}
```

### Implementation

```typescript
function createRetrievalTool(options:  RetrievalToolOptions): RetrievalToolInterface {
	const {
		vectorStore,
		name,
		description,
		defaultLimit = 5,
		scoreThreshold = 0.7,
	} = options

	const schema:  ToolSchema = {
		name,
		description,
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query',
				},
				limit:  {
					type:  'number',
					description:  'Maximum number of results',
				},
			},
			required:  ['query'],
		},
	}

	const handler = async (args:  Readonly<Record<string, unknown>>) => {
		const query = args.query as string
		const limit = (args.limit as number) ?? defaultLimit

		const results = await vectorStore.search(query, {
			limit,
			scoreThreshold,
		})

		return results.map((r) => r.content)
	}

	return { schema, handler }
}
```

---

## 6.3-6.8 Context Builder Adapters

### Deduplication Adapter

```typescript
interface DeduplicationAdapterInterface {
	deduplicate(frames: readonly ContextFrame[]): readonly ContextFrame[]
}
```

### Truncation Adapters

```typescript
interface TruncationAdapterInterface {
	truncate(
		frames: readonly ContextFrame[],
		targetTokens: number,
		currentTokens: number
	): readonly ContextFrame[]
}
```

### Priority Adapter

```typescript
interface PriorityAdapterInterface {
	score(frame: ContextFrame): number
}
```

---

## 6.10 Final Review Checklist

### Exports Verification

- [ ] All factory functions exported from index. ts
- [ ] All types exported from index.ts
- [ ] All helpers exported from index.ts
- [ ] All constants exported from index.ts
- [ ] No internal types accidentally exported

### Documentation Verification

- [ ] adapters.md matches implementation exactly
- [ ] All factory functions documented
- [ ] All options types documented
- [ ] Error codes documented

### Test Coverage Verification

- [ ] Overall coverage ≥80%
- [ ] All edge cases covered
- [ ] No `it.todo()` remaining
- [ ] All quality gates passing

### Final Quality Gates

```powershell
npm run check    # Must pass
npm run format   # Must pass
npm run build    # Must pass
npm test         # Must pass with ≥80% coverage
```

---

## Files Created/Modified

| File                                              | Action   | Deliverable |
|---------------------------------------------------|----------|-------------|
| `src/core/bridge/ToolCallBridge. ts`               | Created  | 6.1         |
| `src/core/bridge/RetrievalTool.ts`                | Created  | 6.2         |
| `src/core/contextbuilder/Deduplication.ts`        | Created  | 6.3         |
| `src/core/contextbuilder/PriorityTruncation.ts`   | Created  | 6.4         |
| `src/core/contextbuilder/FIFOTruncation.ts`       | Created  | 6.5         |
| `src/core/contextbuilder/LIFOTruncation.ts`       | Created  | 6.6         |
| `src/core/contextbuilder/ScoreTruncation.ts`      | Created  | 6.7         |
| `src/core/contextbuilder/Priority.ts`             | Created  | 6.8         |
| `src/factories.ts`                                | Modified | All         |
| `src/index.ts`                                    | Modified | All         |
| `tests/core/bridge/*. test.ts`                     | Created  | 6.9         |
| `tests/core/contextbuilder/*.test.ts`             | Created  | 6.9         |

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

| Component              | Min Coverage | Current |
|------------------------|--------------|---------|
| ToolCallBridge         | 90%          | —       |
| RetrievalTool          | 90%          | —       |
| Deduplication          | 90%          | —       |
| PriorityTruncation     | 90%          | —       |
| FIFOTruncation         | 90%          | —       |
| LIFOTruncation         | 90%          | —       |
| ScoreTruncation        | 90%          | —       |
| Priority               | 90%          | —       |

---

## Notes

- ToolCallBridge is the critical connection between inference and contextprotocol
- RetrievalTool enables RAG patterns with minimal boilerplate
- Context builder adapters integrate with @mikesaintsg/contextbuilder
- Final review must ensure adapters. md is accurate

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All 8 adapters/functions implemented
- [ ] ToolCallBridge handles errors gracefully
- [ ] RetrievalTool works with vectorstore
- [ ] All context builder adapters work correctly
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes with ≥80% overall coverage
- [ ] No `it.todo()` remaining
- [ ] adapters.md matches implementation
- [ ] All exports verified
- [ ] PLAN.md updated with completion

---

## Project Completion Criteria

When Phase 6 is complete, verify: 

- [ ] All 6 phases marked ✅ Complete
- [ ] All 40+ adapters implemented
- [ ] All adapters have ≥80% test coverage
- [ ] adapters.md is accurate and complete
- [ ] types.ts matches all implementations
- [ ] No legacy code remaining
- [ ] All quality gates pass
- [ ] Package is ready for npm publish