# Phase 3: Embedding Adapters

> **Status:** ✅ Complete
> **Started:** 2026-01-19
> **Completed:** 2026-01-19
> **Depends on:** Phase 2 (Provider Adapters) ✅ Complete

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project. 

```
Current Deliverable: Phase 3 Complete
Checklist Progress: All items complete
Last Completed: All 5 embedding adapters with 43 tests
Next Task: Phase 4
Blockers: None
```

---

## Objective

Implement all 5 embedding adapters.  By end of phase, all embedding providers can generate vectors for text input.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 6/6       |
| Checklist Items | 30/30     |
| Tests Passing   | 112/112   |
| Quality Gates   | ✅ Pass    |

---

## Deliverables

| #   | Deliverable              | Status    | Assignee | Notes                    |
|-----|--------------------------|-----------|----------|--------------------------|
| 3.1 | OpenAI Embedding         | ✅ Done    | —        | text-embedding-3-*       |
| 3.2 | Voyage Embedding         | ✅ Done    | —        | voyage-3, voyage-code-3  |
| 3.3 | Ollama Embedding         | ✅ Done    | —        | nomic-embed-text, etc.   |
| 3.4 | node-llama-cpp Embedding | ✅ Done    | —        | Local GGUF models        |
| 3.5 | HuggingFace Embedding    | ✅ Done    | —        | feature-extraction       |
| 3.6 | Unit Tests               | ✅ Done    | —        | Mock API responses       |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

| Deliverable | Required Types                                              | Status |
|-------------|-------------------------------------------------------------|--------|
| 3.1         | `OpenAIEmbeddingAdapterOptions`, `OpenAIEmbeddingResponse`  | ✅      |
| 3.2         | `VoyageEmbeddingAdapterOptions`, `VoyageEmbeddingResponse`  | ✅      |
| 3.3         | `OllamaEmbeddingAdapterOptions`, `OllamaEmbeddingResponse`  | ✅      |
| 3.4         | `NodeLlamaCppEmbeddingAdapterOptions`, `NodeLlamaCppEmbeddingContext` | ✅ |
| 3.5         | `HuggingFaceEmbeddingAdapterOptions`, `HuggingFaceFeatureExtractionPipeline` | ✅ |

---

## Implementation Pattern (All Embeddings)

Each embedding adapter follows this pattern:

```typescript
class XxxEmbedding implements EmbeddingAdapterInterface {
	readonly #apiKey: string
	readonly #model: string
	readonly #baseURL: string
	// ... other private fields

	constructor(options: XxxEmbeddingAdapterOptions) {
		this.#apiKey = options.apiKey
		this.#model = options.model ??  DEFAULT_XXX_EMBEDDING_MODEL
		this.#baseURL = options.baseURL ?? DEFAULT_XXX_BASE_URL
		// ... initialize from options
	}

	async embed(
		texts: readonly string[],
		options?: AbortableOptions
	): Promise<readonly Embedding[]> {
		// 1. Build request
		// 2. Send to API
		// 3. Parse response
		// 4. Convert to Float32Array[]
		// 5. Return embeddings
	}

	getModelMetadata(): EmbeddingModelMetadata {
		return {
			modelName: this.#model,
			dimensions: this.#dimensions,
			maxTokens: this. #maxTokens,
		}
	}
}
```

---

## Current Focus:  3.1 OpenAI Embedding

### Requirements

1.  Implements `EmbeddingAdapterInterface`
2. Supports `text-embedding-3-small` and `text-embedding-3-large`
3. Supports optional dimension reduction
4. Batches texts in single request
5. Returns `Float32Array[]`

### Interface Contract

```typescript
// From @mikesaintsg/core
interface EmbeddingAdapterInterface {
	embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]>
	getModelMetadata(): EmbeddingModelMetadata
}

type Embedding = Float32Array
```

### Implementation Order

1. `src/core/embeddings/OpenAIEmbedding.ts` — Implementation
2. `src/factories. ts` — Add `createOpenAIEmbeddingAdapter`
3. `tests/core/embeddings/OpenAIEmbedding.test.ts` — Unit tests

### Implementation Checklist

**Implementation:**
- [ ] Create `src/core/embeddings/OpenAIEmbedding.ts`
- [ ] Implement constructor with options validation
- [ ] Implement `embed()`:
  - [ ] Build request body with input texts
  - [ ] Include `dimensions` if provided
  - [ ] Send POST to `/embeddings` endpoint
  - [ ] Parse response JSON
  - [ ] Convert `number[]` to `Float32Array`
  - [ ] Return in same order as input
  - [ ] Handle abort signal
  - [ ] Map errors to AdapterErrorCode
- [ ] Implement `getModelMetadata()`

**Error Mapping:**
- [ ] 401 → AUTHENTICATION_ERROR
- [ ] 429 → RATE_LIMIT_ERROR
- [ ] 400 → INVALID_REQUEST_ERROR
- [ ] 404 → MODEL_NOT_FOUND_ERROR
- [ ] 500+ → SERVICE_ERROR

**Exports:**
- [ ] Add `createOpenAIEmbeddingAdapter` to factories. ts
- [ ] Update index.ts exports

**Tests:**
- [ ] Test single text embedding
- [ ] Test batch embedding (multiple texts)
- [ ] Test dimension reduction option
- [ ] Test error handling
- [ ] Test abort signal

### Acceptance Criteria

```typescript
describe('OpenAIEmbedding', () => {
	it('embeds single text', async () => {
		const embedding = createOpenAIEmbeddingAdapter({
			apiKey: 'test-key',
			model:  'text-embedding-3-small',
		})
		
		// Mock fetch
		const result = await embedding.embed(['Hello, world!'])
		
		expect(result).toHaveLength(1)
		expect(result[0]).toBeInstanceOf(Float32Array)
		expect(result[0]. length).toBe(1536)
	})

	it('embeds batch preserving order', async () => {
		const embedding = createOpenAIEmbeddingAdapter({
			apiKey:  'test-key',
		})
		
		const texts = ['First', 'Second', 'Third']
		const result = await embedding.embed(texts)
		
		expect(result).toHaveLength(3)
	})
})
```

### Blocked By

- Phase 0 complete

### Blocks

- 3.6 Unit Tests

---

## 3.2 Voyage Embedding

### Specific Requirements

- Voyage AI API format
- `input_type` option:  'document' | 'query'
- Different model names (voyage-3, voyage-code-3)

### API Format

```typescript
// Request
{
	input:  ['text1', 'text2'],
	model: 'voyage-3',
	input_type: 'document',
}

// Response
{
	object: 'list',
	data: [
		{ object: 'embedding', embedding: [... ], index: 0 },
		{ object:  'embedding', embedding: [...], index: 1 },
	],
}
```

---

## 3.3 Ollama Embedding

### Specific Requirements

- Local endpoint (default: http://localhost:11434)
- Uses `/api/embed` endpoint
- Supports multiple inputs in one request

### API Format

```typescript
// Request
{
	model: 'nomic-embed-text',
	input: ['text1', 'text2'],
}

// Response
{
	model: 'nomic-embed-text',
	embeddings: [[...], [...]],
}
```

---

## 3.4 node-llama-cpp Embedding

### Specific Requirements

- Consumer passes initialized `LlamaEmbeddingContext`
- No API calls — direct embedding generation
- Process one text at a time via `getEmbeddingFor()`

### Implementation Pattern

```typescript
async embed(texts: readonly string[]): Promise<readonly Embedding[]> {
	const embeddings: Embedding[] = []
	
	for (const text of texts) {
		const result = await this.#embeddingContext.getEmbeddingFor(text)
		embeddings. push(new Float32Array(result. vector))
	}
	
	return embeddings
}
```

---

## 3.5 HuggingFace Embedding

### Specific Requirements

- Consumer passes initialized `FeatureExtractionPipeline`
- Supports pooling strategies:  'mean', 'cls', 'none'
- Supports normalization option
- Pipeline returns tensor, need to extract data

### Implementation Pattern

```typescript
async embed(texts: readonly string[]): Promise<readonly Embedding[]> {
	const tensor = await this.#pipeline(texts as string[], {
		pooling: this.#pooling,
		normalize: this.#normalize,
	})
	
	// Tensor shape: [batch_size, hidden_size] after pooling
	const data = tensor.tolist() as number[][]
	
	return data.map((vec) => new Float32Array(vec))
}
```

### Pooling Implementation

```typescript
// If pooling is 'none', tensor is [batch, seq_len, hidden]
// We need to apply our own pooling

function applyMeanPooling(tensor: number[][]): number[] {
	const seqLen = tensor. length
	const hiddenSize = tensor[0].length
	const result = new Array(hiddenSize).fill(0)
	
	for (let i = 0; i < seqLen; i++) {
		for (let j = 0; j < hiddenSize; j++) {
			result[j] += tensor[i][j]
		}
	}
	
	return result. map((v) => v / seqLen)
}
```

---

## Files Created/Modified

| File                                           | Action   | Deliverable |
|------------------------------------------------|----------|-------------|
| `src/core/embeddings/OpenAIEmbedding.ts`       | Created  | 3.1         |
| `src/core/embeddings/VoyageEmbedding.ts`       | Created  | 3.2         |
| `src/core/embeddings/OllamaEmbedding.ts`       | Created  | 3.3         |
| `src/core/embeddings/NodeLlamaCppEmbedding. ts` | Created  | 3.4         |
| `src/core/embeddings/HuggingFaceEmbedding.ts`  | Created  | 3.5         |
| `src/factories.ts`                             | Modified | 3.1-3.5     |
| `src/index.ts`                                 | Modified | 3.1-3.5     |
| `tests/core/embeddings/*. test.ts`              | Created  | 3.6         |

---

## Quality Gates (Phase-Specific)

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
```

**Current Status:**

| Gate             | Last Run   | Result |
|------------------|------------|--------|
| `npm run check`  | 2026-01-19 | ✅ Pass |
| `npm run format` | 2026-01-19 | ✅ Pass |
| `npm run build`  | 2026-01-19 | ✅ Pass |
| `npm test`       | 2026-01-19 | ✅ Pass (112 tests) |

---

## Test Coverage Requirements

| Component              | Min Coverage | Current |
|------------------------|--------------|---------|
| OpenAIEmbedding        | 80%          | ✅ 11 tests |
| VoyageEmbedding        | 80%          | ✅ 8 tests |
| OllamaEmbedding        | 80%          | ✅ 9 tests |
| NodeLlamaCppEmbedding  | 80%          | ✅ 8 tests |
| HuggingFaceEmbedding   | 80%          | ✅ 7 tests |

---

## Notes

- All embeddings must return `Float32Array` for memory efficiency
- Order of returned embeddings must match order of input texts
- Batch processing should use single API call where possible
- node-llama-cpp processes one at a time (no batch API)
- HuggingFace tensor handling requires careful dimension management

---

## Phase Completion Criteria

All of the following must be true:

- [x] All 5 embedding adapters implemented
- [x] All adapters return `Float32Array[]`
- [x] All adapters preserve input order
- [x] Error mapping is comprehensive
- [x] `npm run check` passes
- [x] `npm run format` passes
- [x] `npm run build` passes
- [x] `npm test` passes with ≥80% coverage
- [x] No `it.todo()` remaining
- [x] PLAN.md updated