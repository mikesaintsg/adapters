# Phase 5: Transform & Persistence Adapters

> **Status:** ✅ Complete
> **Started:** 2026-01-19
> **Target:** —
> **Depends on:** Phase 0 (Pre-Flight) ✅ Complete

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: Phase 5 Complete
Checklist Progress: 40/40 items complete
Last Completed: All transform and persistence adapters
Next Task: Begin Phase 6
Blockers: None
```

---

## Objective

Implement all transform adapters (tool format, similarity) and persistence adapters (IndexedDB, OPFS, HTTP). By end of phase, tools can be formatted for providers and data can be persisted. 

---

## Progress Summary

| Metric          | Value       |
|-----------------|-------------|
| Deliverables    | 10/10       |
| Checklist Items | 40/40       |
| Tests Passing   | 262         |
| Quality Gates   | ✅ Pass     |

---

## Deliverables

### Transform Adapters

| #   | Deliverable              | Status    | Assignee | Notes                    |
|-----|--------------------------|-----------|----------|--------------------------|
| 5.1 | OpenAI Tool Format       | ✅ Done   | —        | Function calling format  |
| 5.2 | Anthropic Tool Format    | ✅ Done   | —        | Tool use format          |
| 5.3 | Cosine Similarity        | ✅ Done   | —        | Normalized dot product   |
| 5.4 | Dot Similarity           | ✅ Done   | —        | Raw dot product          |
| 5.5 | Euclidean Similarity     | ✅ Done   | —        | Distance to similarity   |

### Persistence Adapters

| #   | Deliverable                  | Status    | Assignee | Notes                |
|-----|------------------------------|-----------|----------|----------------------|
| 5.6 | IndexedDB Vector Persistence | ✅ Done   | —        | Browser persistence  |
| 5.7 | OPFS Vector Persistence      | ✅ Done   | —        | File system storage  |
| 5.8 | HTTP Vector Persistence      | ✅ Done   | —        | Remote storage       |
| 5.9 | IndexedDB Session Persistence| ✅ Done   | —        | Session storage      |
| 5.10| Unit Tests                   | ✅ Done   | —        | All transform/persist|

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

| Deliverable | Required Types                              | Status |
|-------------|---------------------------------------------|--------|
| 5.1         | `OpenAIToolFormatAdapterOptions`            | ✅      |
| 5.2         | `AnthropicToolFormatAdapterOptions`         | ✅      |
| 5.3-5.5     | `SimilarityAdapterInterface`                | ✅      |
| 5.6         | `IndexedDBVectorPersistenceOptions`         | ✅      |
| 5.7         | `OPFSVectorPersistenceOptions`              | ✅      |
| 5.8         | `HTTPVectorPersistenceOptions`              | ✅      |
| 5.9         | `IndexedDBSessionPersistenceOptions`        | ✅      |

---

## Current Focus: 5.1 OpenAI Tool Format

### Requirements

1. Implements `ToolFormatAdapterInterface`
2. Converts tool schemas to OpenAI function format
3. Parses tool calls from OpenAI response
4. Formats tool results for OpenAI

### Interface Contract

```typescript
// From @mikesaintsg/core
interface ToolFormatAdapterInterface {
	formatSchemas(schemas: readonly ToolSchema[]): unknown
	parseToolCalls(response: unknown): readonly ToolCall[]
	formatResult(result: ToolResult): unknown
}
```

### Implementation Order

1. `src/core/transform/OpenAIToolFormat.ts` — Implementation
2. `src/factories.ts` — Add `createOpenAIToolFormatAdapter`
3. `tests/core/transform/OpenAIToolFormat. test.ts` — Unit tests

### Implementation Checklist

**Implementation:**
- [ ] Create `src/core/transform/OpenAIToolFormat. ts`
- [ ] Implement `formatSchemas()`:
  - [ ] Convert ToolSchema[] to OpenAI tools format
  - [ ] Wrap in `{ type: 'function', function: {... } }`
- [ ] Implement `parseToolCalls()`:
  - [ ] Extract tool_calls from response
  - [ ] Parse function arguments (JSON string → object)
  - [ ] Return ToolCall[]
- [ ] Implement `formatResult()`:
  - [ ] Format for tool message role
  - [ ] JSON stringify result value

### OpenAI Tool Format

```typescript
// Input: ToolSchema
{
	name: 'get_weather',
	description:  'Get current weather',
	parameters: {
		type: 'object',
		properties: { city: { type: 'string' } },
		required: ['city'],
	},
}

// Output: OpenAI format
{
	type: 'function',
	function: {
		name: 'get_weather',
		description: 'Get current weather',
		parameters: {
			type: 'object',
			properties: { city:  { type: 'string' } },
			required: ['city'],
		},
	},
}
```

### Acceptance Criteria

```typescript
describe('OpenAIToolFormat', () => {
	it('formats schemas for OpenAI', () => {
		const formatter = createOpenAIToolFormatAdapter()
		
		const schemas = [{
			name: 'get_weather',
			description: 'Get weather',
			parameters: { type: 'object', properties: {} },
		}]
		
		const formatted = formatter.formatSchemas(schemas)
		
		expect(formatted).toEqual([{
			type: 'function',
			function: schemas[0],
		}])
	})

	it('parses tool calls from response', () => {
		const formatter = createOpenAIToolFormatAdapter()
		
		const response = {
			choices: [{
				message: {
					tool_calls: [{
						id: 'call_123',
						type:  'function',
						function: {
							name: 'get_weather',
							arguments: '{"city":"Paris"}',
						},
					}],
				},
			}],
		}
		
		const toolCalls = formatter. parseToolCalls(response)
		
		expect(toolCalls).toEqual([{
			id:  'call_123',
			name: 'get_weather',
			arguments: { city: 'Paris' },
		}])
	})
})
```

---

## 5.2 Anthropic Tool Format

### Specific Requirements

- Different format than OpenAI
- Tool use blocks in content
- Tool result blocks for responses

### Anthropic Tool Format

```typescript
// Input schema format
{
	name: 'get_weather',
	description: 'Get weather',
	input_schema: {
		type: 'object',
		properties:  { city: { type: 'string' } },
		required: ['city'],
	},
}

// Tool use in response (content block)
{
	type: 'tool_use',
	id: 'toolu_123',
	name: 'get_weather',
	input:  { city: 'Paris' },
}

// Tool result format
{
	type: 'tool_result',
	tool_use_id: 'toolu_123',
	content: '{"temperature":  72}',
}
```

---

## 5.3 Cosine Similarity

### Requirements

1. Implements `SimilarityAdapterInterface`
2. Calculates cosine similarity between vectors
3. Returns value between -1 and 1

### Interface Contract

```typescript
// From @mikesaintsg/core
interface SimilarityAdapterInterface {
	calculate(a:  Embedding, b:  Embedding): number
}
```

### Implementation

```typescript
class CosineSimilarity implements SimilarityAdapterInterface {
	calculate(a: Embedding, b: Embedding): number {
		if (a.length !== b.length) {
			throw new Error('Vectors must have same dimensions')
		}
		
		let dotProduct = 0
		let normA = 0
		let normB = 0
		
		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i]
			normA += a[i] * a[i]
			normB += b[i] * b[i]
		}
		
		const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
		if (magnitude === 0) return 0
		
		return dotProduct / magnitude
	}
}
```

---

## 5.4 Dot Similarity

### Implementation

```typescript
calculate(a: Embedding, b: Embedding): number {
	let dotProduct = 0
	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i]
	}
	return dotProduct
}
```

---

## 5.5 Euclidean Similarity

### Implementation

```typescript
calculate(a: Embedding, b: Embedding): number {
	let sumSquares = 0
	for (let i = 0; i < a.length; i++) {
		const diff = a[i] - b[i]
		sumSquares += diff * diff
	}
	const distance = Math.sqrt(sumSquares)
	
	// Convert distance to similarity (0 to 1)
	return 1 / (1 + distance)
}
```

---

## 5.6 IndexedDB Vector Persistence

### Requirements

1. Implements `VectorStorePersistenceAdapterInterface`
2. Stores documents and metadata
3. Uses `MinimalDatabaseAccess`

### Interface Contract

```typescript
// From @mikesaintsg/core
interface VectorStorePersistenceAdapterInterface {
	save(documents: readonly StoredDocument[]): Promise<void>
	load(): Promise<readonly StoredDocument[]>
	saveMetadata(metadata:  VectorStoreMetadata): Promise<void>
	loadMetadata(): Promise<VectorStoreMetadata | undefined>
	clear(): Promise<void>
}
```

---

## 5.7 OPFS Vector Persistence

### Requirements

1. Uses Origin Private File System
2. `MinimalDirectoryAccess` interface
3. Chunked file storage for large datasets

---

## 5.8 HTTP Vector Persistence

### Requirements

1. REST API for persistence
2. Configurable endpoints
3. Authentication headers

---

## 5.9 IndexedDB Session Persistence

### Requirements

1. Implements `SessionPersistenceInterface`
2. Stores session history
3. TTL-based cleanup

### Interface Contract

```typescript
// From @mikesaintsg/core
interface SessionPersistenceInterface {
	save(sessionId: string, data: SessionData): Promise<void>
	load(sessionId: string): Promise<SessionData | undefined>
	delete(sessionId: string): Promise<void>
	list(): Promise<readonly string[]>
	clear(): Promise<void>
}
```

---

## Files Created/Modified

| File                                              | Action   | Deliverable |
|---------------------------------------------------|----------|-------------|
| `src/core/transform/OpenAIToolFormat.ts`          | Created  | 5.1         |
| `src/core/transform/AnthropicToolFormat.ts`       | Created  | 5.2         |
| `src/core/transform/CosineSimilarity. ts`          | Created  | 5.3         |
| `src/core/transform/DotSimilarity. ts`             | Created  | 5.4         |
| `src/core/transform/EuclideanSimilarity. ts`       | Created  | 5.5         |
| `src/core/persistence/IndexedDBVectorPersistence. ts` | Created | 5.6       |
| `src/core/persistence/OPFSVectorPersistence. ts`   | Created  | 5.7         |
| `src/core/persistence/HTTPVectorPersistence.ts`   | Created  | 5.8         |
| `src/core/persistence/IndexedDBSessionPersistence.ts` | Created | 5.9      |
| `src/factories.ts`                                | Modified | All         |
| `src/index.ts`                                    | Modified | All         |
| `tests/core/transform/*. test.ts`                  | Created  | 5.10        |
| `tests/core/persistence/*.test.ts`                | Created  | 5.10        |

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

| Component                    | Min Coverage | Current |
|------------------------------|--------------|---------|
| OpenAIToolFormat             | 90%          | —       |
| AnthropicToolFormat          | 90%          | —       |
| CosineSimilarity             | 100%         | —       |
| DotSimilarity                | 100%         | —       |
| EuclideanSimilarity          | 100%         | —       |
| IndexedDBVectorPersistence   | 80%          | —       |
| OPFSVectorPersistence        | 80%          | —       |
| HTTPVectorPersistence        | 80%          | —       |
| IndexedDBSessionPersistence  | 80%          | —       |

---

## Notes

- Similarity functions are pure math — easy to test
- Tool format adapters need careful JSON parsing
- Persistence adapters need mock database/filesystem in tests
- OPFS has limited Safari support in private browsing

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All 9 adapters implemented
- [ ] Tool formats work bidirectionally
- [ ] Similarity functions are mathematically correct
- [ ] Persistence round-trips data correctly
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes with ≥80% coverage
- [ ] No `it.todo()` remaining
- [ ] PLAN. md updated