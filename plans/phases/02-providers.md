# Phase 2: Provider Adapters

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** —
> **Depends on:** Phase 1 (Streaming & SSE) ⏳ Pending

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project. 

```
Current Deliverable: 2.1 OpenAI Provider
Checklist Progress: 0/40 items complete
Last Completed:  Phase 1 complete
Next Task: Implement OpenAI provider adapter
Blockers:  None
```

---

## Objective

Implement all 5 provider adapters with native streaming.  By end of phase, all providers can generate streaming text using the Streamer adapter and SSE parser.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/6       |
| Checklist Items | 0/40      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

| #   | Deliverable              | Status    | Assignee | Notes                           |
|-----|--------------------------|-----------|----------|---------------------------------|
| 2.1 | OpenAI Provider          | ⏳ Pending | —        | SSE streaming, tools support    |
| 2.2 | Anthropic Provider       | ⏳ Pending | —        | SSE streaming, tools support    |
| 2.3 | Ollama Provider          | ⏳ Pending | —        | NDJSON streaming, tools support |
| 2.4 | node-llama-cpp Provider  | ⏳ Pending | —        | Token-by-token streaming        |
| 2.5 | HuggingFace Provider     | ⏳ Pending | —        | TextStreamer internal           |
| 2.6 | Unit Tests               | ⏳ Pending | —        | Mock fetch, token emission      |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

| Deliverable | Required Types                                              | Status |
|-------------|-------------------------------------------------------------|--------|
| 2.1         | `OpenAIProviderAdapterOptions`, `OpenAIChatCompletionChunk` | ✅      |
| 2.2         | `AnthropicProviderAdapterOptions`, `AnthropicMessageStreamEvent` | ✅  |
| 2.3         | `OllamaProviderAdapterOptions`, `OllamaChatStreamChunk`     | ✅      |
| 2.4         | `NodeLlamaCppProviderAdapterOptions`, `NodeLlamaCppContext` | ✅      |
| 2.5         | `HuggingFaceProviderAdapterOptions`, `HuggingFaceTextGenerationPipeline` | ✅ |

---

## Implementation Pattern (All Providers)

Each provider adapter follows this pattern:

```typescript
class XxxProvider implements ProviderAdapterInterface {
	readonly #id: string
	readonly #streamer: StreamerAdapterInterface
	// ... other private fields

	constructor(options:  XxxProviderAdapterOptions) {
		this.#id = crypto.randomUUID()
		this.#streamer = options.streamer ??  createStreamerAdapter()
		// ... initialize from options
	}

	getId(): string {
		return this.#id
	}

	generate(
		messages: readonly Message[],
		options: GenerationOptions
	): StreamHandleInterface {
		// 1. Build request
		// 2. Create StreamHandle
		// 3. Start async streaming (fetch + SSE parse)
		// 4. Emit tokens via this.#streamer
		// 5. Return StreamHandle
	}

	supportsTools(): boolean {
		return true // or false for HuggingFace/NodeLlamaCpp
	}

	getCapabilities(): ProviderCapabilities {
		// Return model capabilities
	}
}
```

---

## Current Focus: 2.1 OpenAI Provider

### Requirements

1. Implements `ProviderAdapterInterface`
2. Uses SSE streaming by default
3. Parses `data:  [DONE]` as stream end
4. Supports tool calling
5. Uses custom streamer if provided, default otherwise
6. Maps OpenAI errors to `AdapterErrorCode`

### Interface Contract

```typescript
// From @mikesaintsg/core
interface ProviderAdapterInterface {
	getId(): string
	generate(messages: readonly Message[], options: GenerationOptions): StreamHandleInterface
	supportsTools(): boolean
	getCapabilities(): ProviderCapabilities
}
```

### Implementation Order

1. `src/core/providers/OpenAIProvider.ts` — Implementation
2. `src/factories.ts` — Add `createOpenAIProviderAdapter`
3. `tests/core/providers/OpenAIProvider.test.ts` — Unit tests

### Implementation Checklist

**Implementation:**
- [ ] Create `src/core/providers/OpenAIProvider.ts`
- [ ] Implement constructor with options validation
- [ ] Implement `getId()` — return UUID
- [ ] Implement `generate()`:
  - [ ] Build request body with messages, model, stream:  true
  - [ ] Create fetch request with proper headers
  - [ ] Create and return StreamHandle
  - [ ] Parse SSE stream using internal parser
  - [ ] Emit tokens via streamer
  - [ ] Handle tool calls in response
  - [ ] Handle `data:  [DONE]`
  - [ ] Map errors to AdapterErrorCode
- [ ] Implement `supportsTools()` — return true
- [ ] Implement `getCapabilities()`

**Error Mapping:**
- [ ] 401 → AUTHENTICATION_ERROR
- [ ] 429 → RATE_LIMIT_ERROR (extract retry-after)
- [ ] 400 → INVALID_REQUEST_ERROR
- [ ] 404 → MODEL_NOT_FOUND_ERROR
- [ ] 413 → CONTEXT_LENGTH_ERROR
- [ ] 500+ → SERVICE_ERROR
- [ ] Network errors → NETWORK_ERROR
- [ ] Timeout → TIMEOUT_ERROR

**Exports:**
- [ ] Add `createOpenAIProviderAdapter` to factories. ts
- [ ] Update index.ts exports

**Tests:**
- [ ] Test streaming token emission
- [ ] Test tool call parsing
- [ ] Test error mapping
- [ ] Test custom streamer option
- [ ] Test abort handling

### Acceptance Criteria

```typescript
describe('OpenAIProvider', () => {
	it('streams tokens', async () => {
		const provider = createOpenAIProviderAdapter({
			apiKey: 'test-key',
			model: 'gpt-4o',
		})
		
		// Mock fetch to return SSE stream
		const stream = provider.generate([
			{ role: 'user', content: 'Hello' }
		], {})
		
		const tokens: string[] = []
		for await (const token of stream) {
			tokens.push(token)
		}
		
		expect(tokens. length).toBeGreaterThan(0)
	})
})
```

### Blocked By

- Phase 1 complete (SSE Parser, Streamer)

### Blocks

- 2.6 Unit Tests

---

## 2.2 Anthropic Provider

### Specific Requirements

- Uses Anthropic SSE format (`event: content_block_delta`)
- Different tool format than OpenAI
- Messages API endpoint

### Error Mapping

- 401 → AUTHENTICATION_ERROR
- 429 → RATE_LIMIT_ERROR
- 400 → INVALID_REQUEST_ERROR
- 529 → SERVICE_ERROR (overloaded)

---

## 2.3 Ollama Provider

### Specific Requirements

- Uses NDJSON streaming (not SSE)
- Local endpoint (default: http://localhost:11434)
- `keep_alive` option for model persistence
- Tool support via Ollama format

### NDJSON Parsing

```typescript
// Each line is a complete JSON object
{ "model": "llama3", "message": { "content": "Hello" }, "done": false }
{ "model": "llama3", "message": { "content":  " world" }, "done": false }
{ "model": "llama3", "message": { "content":  "" }, "done": true }
```

---

## 2.4 node-llama-cpp Provider

### Specific Requirements

- Consumer passes initialized `LlamaContext`
- Token-by-token streaming via `sequence. evaluate()`
- No tool support
- No SSE — direct token iteration

### Implementation Pattern

```typescript
async *#generateTokens(tokens: readonly number[]): AsyncGenerator<string> {
	const sequence = this.#context.getSequence()
	for await (const token of sequence.evaluate(tokens, this.#evalOptions)) {
		const text = this.#context.model.detokenize([token])
		yield text
	}
}
```

---

## 2.5 HuggingFace Provider

### Specific Requirements

- Consumer passes initialized `TextGenerationPipeline`
- Uses `TextStreamer` internally for streaming
- No tool support
- Access `pipeline.model. generate()` with streamer option

### Implementation Pattern

```typescript
// Create internal TextStreamer that emits to our streamer
const internalStreamer = new TextStreamer(this.#pipeline.tokenizer, {
	skip_special_tokens: true,
	callback_function: (token:  string) => {
		this.#streamer. emit(token)
	},
})

await this.#pipeline.model.generate({
	inputs: encodedInput,
	streamer: internalStreamer,
	... generationConfig,
})
```

---

## Files Created/Modified

| File                                         | Action   | Deliverable |
|----------------------------------------------|----------|-------------|
| `src/core/providers/OpenAIProvider.ts`       | Created  | 2.1         |
| `src/core/providers/AnthropicProvider.ts`    | Created  | 2.2         |
| `src/core/providers/OllamaProvider. ts`       | Created  | 2.3         |
| `src/core/providers/NodeLlamaCppProvider.ts` | Created  | 2.4         |
| `src/core/providers/HuggingFaceProvider. ts`  | Created  | 2.5         |
| `src/factories.ts`                           | Modified | 2.1-2.5     |
| `src/index.ts`                               | Modified | 2.1-2.5     |
| `tests/core/providers/*. test.ts`             | Created  | 2.6         |

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

| Component          | Min Coverage | Current |
|--------------------|--------------|---------|
| OpenAIProvider     | 80%          | —       |
| AnthropicProvider  | 80%          | —       |
| OllamaProvider     | 80%          | —       |
| NodeLlamaCppProvider| 80%         | —       |
| HuggingFaceProvider| 80%          | —       |

---

## Notes

- Mock `fetch` for testing — don't hit real APIs
- Create mock SSE response helpers in test setup
- node-llama-cpp and HuggingFace need mock context/pipeline
- Each provider has different SSE/streaming format
- Tool call parsing differs between providers

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All 5 providers implemented
- [ ] All providers stream tokens natively
- [ ] All providers support custom streamer option
- [ ] Tool-supporting providers parse tool calls correctly
- [ ] Error mapping is comprehensive
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes with ≥80% coverage
- [ ] No `it.todo()` remaining
- [ ] PLAN.md updated