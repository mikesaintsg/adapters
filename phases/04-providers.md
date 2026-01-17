# Phase 4: Providers

> **Status:** ✅ Complete
> **Started:** 2026-01-17
> **Completed:** 2026-01-17
> **Depends on:** Phase 2 (Core Helpers) ✅ Complete

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: All complete
Checklist Progress: 30/30 items complete
Last Completed: 4.7 Unit Tests
Next Task: Phase 5 (Persistence)
Blockers: None
```

---

## Objective

Implement all LLM provider adapters and tool format adapters. By end of phase:

- OpenAI provider adapter with streaming, tool support
- Anthropic provider adapter with streaming, tool support
- Ollama provider adapter for local development
- Tool format adapters for all providers
- All adapters implement `ProviderAdapterInterface` from inference

---

## Progress Summary

| Metric          | Value        |
|-----------------|--------------|
| Deliverables    | 7/7          |
| Checklist Items | 30/30        |
| Tests Passing   | 262          |
| Quality Gates   | ✅ Passing   |

---

## Deliverables

| #   | Deliverable                  | Status    | Assignee | Notes                               |
|-----|------------------------------|-----------|----------|-------------------------------------|
| 4.1 | OpenAI Provider Adapter      | ✅ Done   | —        | GPT-4o, streaming, tools            |
| 4.2 | Anthropic Provider Adapter   | ✅ Done   | —        | Claude 3.5, streaming, tools        |
| 4.3 | Ollama Provider Adapter      | ✅ Done   | —        | Local LLM, NDJSON streaming         |
| 4.4 | OpenAI Tool Format Adapter   | ✅ Done   | —        | Schema translation (pre-existing)   |
| 4.5 | Anthropic Tool Format Adapter| ✅ Done   | —        | Schema translation (pre-existing)   |
| 4.6 | Retryable Provider Wrapper   | ✅ Done   | —        | Wraps provider with retry           |
| 4.7 | Unit Tests                   | ✅ Done   | —        | 40 new tests (262 total)            |

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
| 4.1         | OpenAIProviderAdapterOptions, ProviderAdapterInterface | ✅ Done |
| 4.2         | AnthropicProviderAdapterOptions                  | ✅ Done   |
| 4.3         | OllamaProviderAdapterOptions, OllamaChatRequest  | ✅ Done   |
| 4.4         | OpenAIToolFormatAdapterOptions, ToolFormatAdapterInterface | ✅ Done |
| 4.5         | AnthropicToolFormatAdapterOptions                | ✅ Done   |
| 4.6         | RetryableProviderAdapterOptions                  | ✅ Done   |

---

## Current Focus: 4.1 OpenAI Provider Adapter

### Requirements

1. Implement `ProviderAdapterInterface` from `@mikesaintsg/inference`
2. Support streaming chat completions
3. Support tool/function calling
4. Support GPT-4o, GPT-4, GPT-3.5-turbo models
5. Handle API errors with proper mapping
6. Use shared SSE parser

### Interface Contract

```typescript
// From @mikesaintsg/inference
interface ProviderAdapterInterface {
	getId(): string
	generate(
		messages: readonly Message[],
		options: GenerationOptions
	): StreamHandleInterface
	supportsTools(): boolean
	supportsStreaming(): boolean
	getCapabilities(): ProviderCapabilities
}

// From src/types.ts
interface OpenAIProviderAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
	readonly organization?: string
	readonly defaultOptions?: GenerationDefaults
}
```

### Implementation Order

1. `src/types.ts` — Already done
2. `src/providers/openai.ts` — OpenAI adapter implementation
3. `src/factories.ts` — Add `createOpenAIProviderAdapter`
4. `tests/providers/openai.test.ts` — Unit tests

### Implementation Checklist

**Adapter Implementation:**
- [ ] Create `src/providers/` directory
- [ ] Create `createOpenAIProviderAdapter()` factory
- [ ] Implement `getId()` — returns `openai:${model}`
- [ ] Implement `supportsTools()` — returns true
- [ ] Implement `supportsStreaming()` — returns true
- [ ] Implement `getCapabilities()` method
- [ ] Implement `generate()` method with streaming

**Message Formatting:**
- [ ] Convert Message to OpenAI format
- [ ] Handle system messages
- [ ] Handle tool messages
- [ ] Format tool calls in request

**Streaming:**
- [ ] Use shared SSE parser
- [ ] Parse OpenAI delta format
- [ ] Accumulate tool call arguments
- [ ] Handle [DONE] sentinel
- [ ] Create StreamHandle with async iteration
- [ ] Support abort via AbortSignal

**Error Handling:**
- [ ] Map OpenAI error codes
- [ ] Extract retry-after from rate limits
- [ ] Handle network errors
- [ ] Handle timeout errors

**Exports:**
- [ ] Create `src/providers/index.ts` barrel
- [ ] Add factory to `src/factories.ts`
- [ ] Export from `src/index.ts`

### Acceptance Criteria

```typescript
describe('OpenAI Provider Adapter', () => {
	it('implements ProviderAdapterInterface', () => {
		const adapter = createOpenAIProviderAdapter({
			apiKey: 'test-key',
		})
		
		expect(adapter.getId()).toBe('openai:gpt-4o')
		expect(adapter.supportsTools()).toBe(true)
		expect(adapter.supportsStreaming()).toBe(true)
	})

	it('generates streaming response', async () => {
		const adapter = createOpenAIProviderAdapter({
			apiKey: 'test-key',
		})
		
		const handle = adapter.generate([
			{ role: 'user', content: 'Hello' }
		], {})
		
		const chunks: string[] = []
		for await (const chunk of handle) {
			chunks.push(chunk)
		}
		
		expect(chunks.length).toBeGreaterThan(0)
	})
})
```

### Blocked By

- Phase 2 (Core Helpers) — needs SSE parser, error mapping

### Blocks

- 4.4 (Tool Format) — tool format used by provider
- 4.6 (Retryable) — wraps provider adapter

---

## Deliverable 4.2: Anthropic Provider Adapter

### Requirements

1. Implement `ProviderAdapterInterface`
2. Support Claude 3.5 Sonnet, Claude 3 Opus/Haiku
3. Support streaming with SSE
4. Support tool use (Anthropic format)
5. Handle system prompt as separate parameter

### Implementation Checklist

- [ ] Create `createAnthropicProviderAdapter()` factory
- [ ] Implement all interface methods
- [ ] Convert messages to Anthropic format
- [ ] Extract system as separate parameter
- [ ] Handle Anthropic event types (content_block_delta, etc.)
- [ ] Accumulate tool use partial_json
- [ ] Map Anthropic error codes
- [ ] Add factory to exports

### Blocked By

- 4.1 (OpenAI Provider) — same pattern

---

## Deliverable 4.3: Ollama Provider Adapter

### Requirements

1. Implement `ProviderAdapterInterface`
2. Support llama2, llama3, mistral, codellama models
3. Support streaming via NDJSON
4. Support keep_alive for model persistence
5. Handle connection errors gracefully

### Implementation Checklist

- [ ] Create `createOllamaProviderAdapter()` factory
- [ ] Implement all interface methods
- [ ] Convert messages to Ollama format
- [ ] Handle NDJSON streaming (not SSE)
- [ ] Support keep_alive option
- [ ] Handle Ollama-specific errors
- [ ] Handle model not found error
- [ ] Support timeout configuration
- [ ] Add factory to exports

### Blocked By

- 4.2 (Anthropic Provider) — sequential implementation

---

## Deliverable 4.4: OpenAI Tool Format Adapter

### Requirements

1. Implement `ToolFormatAdapterInterface` from `@mikesaintsg/core`
2. Convert ToolSchema to OpenAI function format
3. Parse tool calls from OpenAI response
4. Format tool results for injection

### Interface Contract

```typescript
// From @mikesaintsg/core
interface ToolFormatAdapterInterface {
	formatSchemas(schemas: readonly ToolSchema[]): unknown
	parseToolCalls(response: unknown): readonly ToolCall[]
	formatResult(result: ToolResult): unknown
}
```

### Implementation Checklist

- [ ] Create `createOpenAIToolFormatAdapter()` factory
- [ ] Implement `formatSchemas()` — ToolSchema → OpenAI function
- [ ] Implement `parseToolCalls()` — OpenAI response → ToolCall[]
- [ ] Implement `formatResult()` — ToolResult → OpenAI tool message
- [ ] Handle tool_choice options
- [ ] Add factory to exports

### Blocked By

- 4.1 (OpenAI Provider) — uses tool format

---

## Deliverable 4.5: Anthropic Tool Format Adapter

### Requirements

1. Implement `ToolFormatAdapterInterface`
2. Convert ToolSchema to Anthropic tool format
3. Parse tool_use blocks from response
4. Format tool_result blocks for injection

### Implementation Checklist

- [ ] Create `createAnthropicToolFormatAdapter()` factory
- [ ] Implement `formatSchemas()` — ToolSchema → Anthropic tool
- [ ] Implement `parseToolCalls()` — Anthropic response → ToolCall[]
- [ ] Implement `formatResult()` — ToolResult → Anthropic tool_result
- [ ] Handle tool_choice options
- [ ] Add factory to exports

### Blocked By

- 4.4 (OpenAI Tool Format) — same pattern

---

## Deliverable 4.6: Retryable Provider Wrapper

### Requirements

1. Wrap any `ProviderAdapterInterface`
2. Apply retry logic from Phase 2
3. Handle streaming with retry
4. Passthrough all interface methods

### Implementation Checklist

- [ ] Create `createRetryableProviderAdapter()` factory
- [ ] Wrap `generate()` with retry logic
- [ ] Handle streaming abort on retry
- [ ] Passthrough `getId()`, `supportsTools()`, etc.
- [ ] Use RetryOptions from types
- [ ] Add factory to exports

### Blocked By

- 4.3 (Ollama Provider) — need adapter to wrap
- 2.4 (Retry Wrapper) — reuse retry logic

---

## Deliverable 4.7: Unit Tests

### Requirements

1. Test each provider in isolation
2. Mock fetch/HTTP for deterministic tests
3. Test streaming behavior
4. Test tool calling
5. Test error handling

### Implementation Checklist

**OpenAI Tests:**
- [ ] `tests/providers/openai.test.ts`
- [ ] Test getId()
- [ ] Test capabilities
- [ ] Test streaming generation
- [ ] Test tool call parsing
- [ ] Test error mapping

**Anthropic Tests:**
- [ ] `tests/providers/anthropic.test.ts`
- [ ] Test streaming generation
- [ ] Test system prompt handling
- [ ] Test tool use
- [ ] Test error mapping

**Ollama Tests:**
- [ ] `tests/providers/ollama.test.ts`
- [ ] Test NDJSON streaming
- [ ] Test keep_alive
- [ ] Test connection errors

**Tool Format Tests:**
- [ ] `tests/formatters/openai.test.ts`
- [ ] `tests/formatters/anthropic.test.ts`
- [ ] Test schema conversion
- [ ] Test tool call parsing
- [ ] Test result formatting

**Retryable Tests:**
- [ ] `tests/wrappers/retryable-provider.test.ts`
- [ ] Test retry on rate limit
- [ ] Test max retries
- [ ] Test abort handling

### Blocked By

- 4.1-4.6 — all implementations complete

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                                   | Action  | Deliverable |
|----------------------------------------|---------|-------------|
| `src/providers/openai.ts`              | Created | 4.1         |
| `src/providers/anthropic.ts`           | Created | 4.2         |
| `src/providers/ollama.ts`              | Created | 4.3         |
| `src/providers/index.ts`               | Created | 4.1         |
| `src/formatters/openai.ts`             | Modified| 4.4         |
| `src/formatters/anthropic.ts`          | Modified| 4.5         |
| `src/wrappers/retryable.ts`            | Modified| 4.6         |
| `src/factories.ts`                     | Modified| All         |
| `src/index.ts`                         | Modified| All         |
| `tests/providers/openai.test.ts`       | Created | 4.7         |
| `tests/providers/anthropic.test.ts`    | Created | 4.7         |
| `tests/providers/ollama.test.ts`       | Created | 4.7         |
| `tests/formatters/openai.test.ts`      | Created | 4.7         |
| `tests/formatters/anthropic.test.ts`   | Created | 4.7         |

---

## Quality Gates (Phase-Specific)

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
```

**Current Status:**

| Gate            | Last Run   | Result |
|-----------------|------------|--------|
| `npm run check` | 2026-01-17 | ✅     |
| `npm run format`| 2026-01-17 | ✅     |
| `npm run build` | 2026-01-17 | ✅     |
| `npm test`      | 2026-01-17 | ✅ 262 |

---

## Test Coverage Requirements

| Component              | Min Coverage | Current |
|------------------------|--------------|---------|
| providers/openai.ts    | 80%          | ✅      |
| providers/anthropic.ts | 80%          | ✅      |
| providers/ollama.ts    | 75%          | ✅      |
| formatters/openai.ts   | 85%          | ✅      |
| formatters/anthropic.ts| 85%          | ✅      |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- OpenAI uses `data: [DONE]` to signal stream end
- Anthropic uses event types: `message_start`, `content_block_delta`, `message_stop`
- Ollama uses NDJSON, not SSE
- Tool calls may be streamed in chunks; accumulate arguments
- System messages handled differently per provider
- Used createDoneIteratorResult helper for iterator completion pattern

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** End of Phase 3
**Files to Revert:** All files in src/providers/, src/formatters/
**Dependencies:** None (no external state)

---

## Phase Completion Criteria

All of the following must be true:

- [x] All deliverables marked ✅ Done
- [x] `npm run check` passes
- [x] `npm run format` passes
- [x] `npm run build` passes
- [x] `npm test` passes
- [x] No `it.todo()` remaining in phase scope
- [x] All files in "Files Created/Modified" reviewed
- [ ] PLAN.md updated:
  - [ ] Phase 4 status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
