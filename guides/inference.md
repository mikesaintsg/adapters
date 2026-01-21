# @mikesaintsg/inference API Guide

> **Zero-dependency, adapter-based LLM inference library for browser and Node.js applications.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Engine](#engine)
6. [Session](#session)
7. [Streaming](#streaming)
8. [Tools and Function Calling](#tools-and-function-calling)
9. [Token Counting](#token-counting)
10. [Context Integration](#context-integration)
11. [Error Handling](#error-handling)
12. [TypeScript Integration](#typescript-integration)
13. [Browser Compatibility](#browser-compatibility)
14. [Performance Tips](#performance-tips)
15. [Integration with Ecosystem](#integration-with-ecosystem)
16. [API Reference](#api-reference)
17. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/inference` provides:

- **Adapter-based provider integration** — First-class adapters, not magic strings
- **Unified streaming interface** — Consistent API across all providers
- **Session-based conversation management** — Automatic history tracking
- **Ephemeral generation** — Stateless single-shot completions
- **Token counting** — Estimate context usage before sending
- **Tool call support** — Parse and validate tool calls from responses
- **Zero dependencies** — Built entirely on native `fetch` API

### Design Principles

1. **Adapters, not strings** — Provider integration via instantiated adapters, never magic strings
2. **Required adapter first** — Provider adapter is the first parameter to `createEngine()`
3. **Opt-in optional adapters** — Optional adapters (persistence, retry, rate limit) are in the options object
4. **Streaming-first** — All generation is streaming by default
5. **Session vs ephemeral** — Clear separation between stateful and stateless generation

### Package Boundaries

| Responsibility                | Owner           | Notes                        |
|-------------------------------|-----------------|------------------------------|
| Prompts and messages          | core            | Shared types                 |
| Session/conversation state    | inference       | Manages history              |
| Streaming and parsing         | inference       | Implementation               |
| Token counting                | inference       | `Engine.countTokens()`       |
| Token batching                | inference       | UI performance               |
| Abort coordination            | inference       | AbortScope                   |
| ProviderAdapterInterface      | core            | Shared interface definition  |
| StreamHandleInterface         | core            | Shared interface definition  |
| Provider implementations      | adapters        | OpenAI, Anthropic, Ollama    |
| Persistence adapters          | adapters        | IndexedDB, HTTP, OPFS        |
| Tool registry and routing     | contextprotocol | Separate package             |
| Context assembly              | contextbuilder  | Builds BuiltContext          |

---

## Installation

```bash
npm install @mikesaintsg/inference @mikesaintsg/core
```

For full ecosystem integration:

```bash
npm install @mikesaintsg/inference @mikesaintsg/core @mikesaintsg/adapters
```

---

## Quick Start

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'

// 1. Create provider adapter
const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
})

// 2. Create engine with required adapter as first parameter
const engine = createEngine(provider)

// 3. Create session for conversation
const session = engine.createSession({
	system: 'You are a helpful assistant.',
})

// 4. Add message and stream response
session.addMessage('user', 'What is 2 + 2?')
const stream = session.stream()

for await (const token of stream) {
	process.stdout.write(token)
}

const result = await stream.result()
console.log('\n\nFinish reason:', result.finishReason)

// 5. Or use ephemeral generation (stateless)
const response = await engine.generate([
	{ role: 'user', content: 'What is the capital of France?' }
])
console.log(response.text) // Paris
```

---

## Core Concepts

### Hierarchy: Engine → Session → Message → StreamHandle

```
┌─────────────────────────────────────────────────────────────────┐
│                         Engine                                   │
│  - Holds provider adapter                                       │
│  - Creates sessions                                             │
│  - Provides ephemeral generation                                │
│  - Token counting                                               │
├─────────────────────────────────────────────────────────────────┤
│                         Session                                  │
│  - Maintains message history                                    │
│  - Tracks conversation state                                    │
│  - Provides context-aware generation                            │
├─────────────────────────────────────────────────────────────────┤
│                         Message                                  │
│  - Role: system | user | assistant | tool                       │
│  - Content: text, tool calls, tool results                      │
│  - Metadata: timestamps, IDs                                    │
├─────────────────────────────────────────────────────────────────┤
│                       StreamHandle                               │
│  - Async iteration of tokens                                    │
│  - Abort control                                                │
│  - Final result collection                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Ephemeral vs Session-Based Generation

**Ephemeral generation** — Stateless, single-shot completion:

```ts
const response = await engine.generate([
	{ role: 'user', content: 'What is 2 + 2?' }
])
// No history maintained
```

**Session-based generation** — Stateful conversation:

```ts
const session = engine.createSession({
	system: 'You are a helpful assistant.',
})

session.addMessage('user', 'What is 2 + 2?')
const response = await session.generate()
// History: [system, user, assistant]

session.addMessage('user', 'What about 3 + 3?')
const response2 = await session.generate()
// History: [system, user, assistant, user, assistant]
```

### Message Roles and Their Semantics

| Role        | Purpose                | Provider Mapping                         |
|-------------|------------------------|------------------------------------------|
| `system`    | Instructions, persona  | OpenAI: `system`, Anthropic: `system`    |
| `user`      | User input             | Universal                                |
| `assistant` | Model responses        | Universal                                |
| `tool`      | Tool execution results | OpenAI: `tool`, Anthropic: `tool_result` |

---

## Engine

The Engine is the main entry point for inference. It holds the provider adapter and provides methods for creating sessions and ephemeral generation.

### Creating an Engine

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'

// Required adapter is first parameter
const provider = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY!,
	model: 'gpt-4o',
})

// Optional adapters are in the options object (all opt-in)
const engine = createEngine(provider, {
	// Persistence (opt-in)
	session: sessionPersistenceAdapter,
	// Token counter (opt-in)
	token: tokenCounterAdapter,
	// Policy (opt-in)
	retry: retryAdapter,
	rateLimit: rateLimitAdapter,
})
```

### Ephemeral Generation

Stateless, single-shot completion without session management:

```ts
// Simple generation
const result = await engine.generate([
	{ role: 'user', content: 'What is 2 + 2?' }
])
console.log(result.text) // "4"

// With options
const result = await engine.generate(
	[{ role: 'user', content: 'Write a haiku about coding.' }],
	{ temperature: 0.9, maxTokens: 100 }
)
```

### Ephemeral Streaming

```ts
const stream = engine.stream([
	{ role: 'user', content: 'Tell me a story.' }
])

for await (const token of stream) {
	process.stdout.write(token)
}

const result = await stream.result()
console.log('Finish reason:', result.finishReason)
```

### Token Counting

```ts
// Count tokens in text
const tokens = engine.countTokens('Hello, world!', 'gpt-4o')
console.log(tokens) // ~4

// Count tokens in messages
const messageTokens = engine.countMessages(session.getHistory(), 'gpt-4o')

// Check if content fits in context window
const fits = engine.fitsInContext(longDocument, 'gpt-4o', 8000)

// Get context window size for model
const windowSize = engine.getContextWindowSize('gpt-4o') // 128000
```

### Abort Requests

```ts
const stream = engine.stream([{ role: 'user', content: 'Write a novel.' }])

// Abort by stream
stream.abort()

// Or abort by request ID
engine.abort(stream.requestId)
```

---

## Session

Sessions provide stateful conversation management with automatic history tracking.

### Creating a Session

```ts
const session = engine.createSession({
	system: 'You are a helpful assistant.',
	id: 'session-123', // Optional, auto-generated if not provided
})

console.log(session.getId()) // "session-123"
console.log(session.getSystem()) // "You are a helpful assistant."
```

### Managing Messages

```ts
// Add messages
const userMessage = session.addMessage('user', 'Hello!')
const assistantMessage = session.addMessage('assistant', 'Hi there!')

// Get history
const history = session.getHistory()
console.log(history.length) // 2

// Remove a message
session.removeMessage(userMessage.id)

// Clear all messages (keeps system)
session.clear()

// Keep only last N messages
session.truncateHistory(10)
```

### Session Generation

```ts
// Add user message and generate response
session.addMessage('user', 'What is the capital of France?')
const result = await session.generate()
console.log(result.text) // "Paris..."

// Streaming
session.addMessage('user', 'Tell me more about Paris.')
const stream = session.stream()

for await (const token of stream) {
	process.stdout.write(token)
}
```

### Tool Results

```ts
// After a tool call, add the result
session.addToolResult(
	toolCall.id,      // Tool call ID from response
	toolCall.name,    // Tool name
	{ temperature: 72 } // Result value
)
```

### Token Budget

```ts
const session = engine.createSession({
	system: 'You are helpful.',
	tokenBudget: {
		model: 'gpt-4o',
		warningThreshold: 0.8,    // Warn at 80%
		criticalThreshold: 0.95,  // Critical at 95%
		autoTruncate: true,       // Auto-remove old messages
	},
})

// Subscribe to budget changes
session.onTokenBudgetChange((state) => {
	if (state.level === 'warning') {
		console.warn(`Token usage: ${(state.usage * 100).toFixed(0)}%`)
	}
})

// Check budget before adding
const state = session.getTokenBudgetState()
if (session.fitsInBudget(longContent)) {
	session.addMessage('user', longContent)
}
```

### Session Events

```ts
// Subscribe to message events
const unsub1 = session.onMessageAdded((message) => {
	console.log('Message added:', message.role)
})

const unsub2 = session.onMessageRemoved((id) => {
	console.log('Message removed:', id)
})

// Cleanup
unsub1()
unsub2()
```

---

## Streaming

All generation in inference is streaming by default. The `StreamHandle` provides async iteration, abort control, and event subscriptions.

### Basic Streaming

```ts
const stream = session.stream()

// Async iteration
for await (const token of stream) {
	process.stdout.write(token)
}

// Get final result
const result = await stream.result()
console.log('Complete:', result.text)
console.log('Finish reason:', result.finishReason)
```

### Stream Events

```ts
const stream = session.stream()

// Subscribe to tokens
const unsub1 = stream.onToken((token) => {
	process.stdout.write(token)
})

// Subscribe to completion
const unsub2 = stream.onComplete((result) => {
	console.log('Done:', result.finishReason)
})

// Subscribe to errors
const unsub3 = stream.onError((error) => {
	console.error('Stream error:', error)
})

// Wait for completion
await stream.result()

// Cleanup
unsub1()
unsub2()
unsub3()
```

### Abort Control

```ts
const stream = session.stream()

// Abort directly
stream.abort()

// Or abort via engine using request ID
console.log('Request ID:', stream.requestId)
engine.abort(stream.requestId)

// Check if aborted in result
const result = await stream.result()
if (result.aborted) {
	console.log('Generation was aborted')
}
```

### Token Batching

For UI performance, batch tokens before rendering:

```ts
import { createTokenBatcher } from '@mikesaintsg/inference'

const batcher = createTokenBatcher({
	batchSize: 10,           // Batch every 10 tokens
	flushIntervalMs: 50,     // Or flush every 50ms
	flushOnBoundary: 'word', // Flush on word boundaries
})

batcher.onBatch((batch) => {
	updateUI(batch.text)
})

const stream = session.stream()
for await (const token of stream) {
	batcher.push(token)
}

// Flush remaining tokens
const final = batcher.end()
if (final) {
	updateUI(final.text)
}
```

---

## Tools and Function Calling

Inference supports tool calling for LLM function execution. Tools are registered with contextprotocol and the bridge connects them to inference.

### Basic Tool Usage

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { 
	createOpenAIProviderAdapter,
	createOpenAIToolFormatAdapter,
	createToolCallBridge,
} from '@mikesaintsg/adapters'

// Create provider and formatter
const provider = createOpenAIProviderAdapter({ apiKey })
const formatter = createOpenAIToolFormatAdapter()

// Create engine and registry
const engine = createEngine(provider)
const registry = createToolRegistry(formatter)

// Define and register a tool
const weatherSchema = {
	name: 'get_weather',
	description: 'Get the current weather in a city',
	parameters: {
		type: 'object',
		properties: {
			city: { type: 'string', description: 'City name' },
		},
		required: ['city'],
	},
}

registry.register(weatherSchema, async (args) => {
	const city = args.city as string
	return { temperature: 72, condition: 'sunny' }
})

// Create bridge for tool execution
const bridge = createToolCallBridge({ registry })
```

### Tool Call Flow

```ts
const session = engine.createSession({
	system: 'You are a helpful assistant with access to weather data.',
})

session.addMessage('user', 'What is the weather in Paris?')

// Generate with tools
const stream = session.stream({
	tools: registry.all(),
})

for await (const token of stream) {
	process.stdout.write(token)
}

const result = await stream.result()

// Handle tool calls
if (result.toolCalls.length > 0) {
	// Execute tool calls via bridge
	const toolResults = await bridge.execute(result.toolCalls)
	
	// Add results to session
	for (const toolResult of toolResults) {
		session.addToolResult(
			toolResult.callId,
			toolResult.name,
			toolResult.value
		)
	}
	
	// Continue generation with tool results
	const followUp = await session.generate()
	console.log(followUp.text)
}
```

### Tool Choice

Control how the model uses tools:

```ts
// Auto - model decides when to use tools (default)
const result = await session.generate({
	tools: registry.all(),
	toolChoice: 'auto',
})

// Required - model must use a tool
const result = await session.generate({
	tools: registry.all(),
	toolChoice: 'required',
})

// None - model cannot use tools
const result = await session.generate({
	tools: registry.all(),
	toolChoice: 'none',
})

// Specific - model must use a specific tool
const result = await session.generate({
	tools: registry.all(),
	toolChoice: { name: 'get_weather' },
})
```

---

## Token Counting

Token counting helps manage context windows and estimate costs.

### Basic Token Counting

```ts
// Count tokens in text
const tokens = engine.countTokens('Hello, world!', 'gpt-4o')
console.log(tokens) // ~4

// Count tokens in messages
const messages = session.getHistory()
const total = engine.countMessages(messages, 'gpt-4o')
console.log('Total tokens:', total)

// Check if content fits
const fits = engine.fitsInContext(longDocument, 'gpt-4o', 8000)
if (!fits) {
	// Truncate or summarize
}

// Get context window size
const maxTokens = engine.getContextWindowSize('gpt-4o')
console.log('Max tokens:', maxTokens) // 128000
```

### Custom Token Counter

Provide a custom token counter adapter:

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createTokenCounter } from '@mikesaintsg/inference'
import { DEFAULT_MODEL_MULTIPLIERS } from '@mikesaintsg/adapters'

const tokenCounter = createTokenCounter({
	charsPerToken: 4, // Default estimate
	modelMultipliers: {
		...DEFAULT_MODEL_MULTIPLIERS,
		'custom-model': 3.5, // Custom model multiplier
	},
	contextWindowSizes: {
		'custom-model': 32000,
	},
})

const engine = createEngine(provider, {
	token: tokenCounter,
})
```

---

## Context Integration

Inference integrates with contextbuilder for advanced context management.

### Using BuiltContext

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createContextManager } from '@mikesaintsg/contextbuilder'
import { 
	createDeduplicationAdapter,
	createPriorityTruncationAdapter,
} from '@mikesaintsg/adapters'

// Create context manager with adapters
const context = createContextManager(tokenCounter, {
	maxTokens: 8000,
	reservedTokens: 2000,
	deduplication: createDeduplicationAdapter(),
	truncation: createPriorityTruncationAdapter(),
})

// Add context frames
context.system('You are a helpful coding assistant.')
context.section('guidelines', codingGuidelines, { priority: 'high' })
context.file('src/app.ts', sourceCode, { priority: 'normal' })

// Build context
const built = context.build()

// Generate from built context
const result = await engine.generateFromContext(built, {
	temperature: 0.7,
})

console.log(result.text)
```

### Streaming from Context

```ts
const stream = engine.streamFromContext(built)

for await (const token of stream) {
	process.stdout.write(token)
}

const result = await stream.result()
```

---

## Error Handling

### Error Codes

| Code                      | Description                | Recovery                    |
|---------------------------|----------------------------|-----------------------------|
| `RATE_LIMIT`              | Rate limit exceeded        | Wait and retry              |
| `CONTEXT_LENGTH_EXCEEDED` | Context too long           | Truncate messages           |
| `INVALID_API_KEY`         | Invalid API key            | Check credentials           |
| `PROVIDER_ERROR`          | Provider service error     | Retry later                 |
| `VALIDATION_ERROR`        | Invalid request            | Fix request parameters      |
| `TIMEOUT`                 | Request timeout            | Retry with longer timeout   |
| `ABORTED`                 | Request was aborted        | Normal cancellation         |
| `NETWORK_ERROR`           | Network failure            | Check connection, retry     |

### Error Handling Pattern

```ts
import { isInferenceError } from '@mikesaintsg/inference'

try {
	const result = await session.generate()
} catch (error) {
	if (isInferenceError(error)) {
		switch (error.code) {
			case 'RATE_LIMIT':
				await sleep(60_000)
				break
			case 'CONTEXT_LENGTH_EXCEEDED':
				session.truncateHistory(10)
				break
			case 'ABORTED':
				console.log('Generation cancelled')
				break
			default:
				console.error(`[${error.code}]: ${error.message}`)
		}
	}
}
```

### Retry with Policy Adapter

```ts
import { createExponentialRetryAdapter } from '@mikesaintsg/adapters'

const retry = createExponentialRetryAdapter({
	maxAttempts: 3,
	initialDelayMs: 1000,
	onRetry: (error, attempt, delayMs) => {
		console.log(`Retry ${attempt}, waiting ${delayMs}ms`)
	},
})

const engine = createEngine(provider, {
	retry,
})
```

---

## TypeScript Integration

### Type Imports

```ts
import type {
	// From core
	Message,
	MessageRole,
	MessageContent,
	GenerationOptions,
	GenerationResult,
	StreamHandleInterface,
	ProviderAdapterInterface,
	ToolCall,
	ToolResult,
	BuiltContext,
} from '@mikesaintsg/core'

import type {
	// From inference
	EngineInterface,
	SessionInterface,
	EngineOptions,
	SessionOptions,
	InferenceErrorCode,
} from '@mikesaintsg/inference'
```

### Factory Types

```ts
import type { CreateEngine } from '@mikesaintsg/inference'

const createEngine: CreateEngine = (provider, options) => {
	// Implementation
}
```

---

## Browser Compatibility

| Feature         | Chrome | Firefox | Safari | Edge |
|-----------------|--------|---------|--------|------|
| Fetch API       | ✅      | ✅       | ✅      | ✅    |
| Streaming       | ✅      | ✅       | ✅      | ✅    |
| AbortController | ✅      | ✅       | ✅      | ✅    |
| TextDecoder     | ✅      | ✅       | ✅      | ✅    |

---

## Performance Tips

### Token Batching for UI

Batch tokens to reduce React re-renders:

```ts
const batcher = createTokenBatcher({
	batchSize: 10,
	flushIntervalMs: 16, // ~60fps
})
```

### Request Deduplication

Prevent duplicate requests:

```ts
const engine = createEngine(provider, {
	deduplication: {
		enabled: true,
		windowMs: 1000,
	},
})
```

### Abort Stale Requests

Cancel previous requests when user types:

```ts
let currentStream: StreamHandleInterface | null = null

async function onUserInput(text: string) {
	// Abort previous
	currentStream?.abort()
	
	// Start new
	session.addMessage('user', text)
	currentStream = session.stream()
	
	for await (const token of currentStream) {
		updateUI(token)
	}
}
```

---

## Integration with Ecosystem

### With VectorStore (RAG)

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { 
	createOpenAIProviderAdapter,
	createOpenAIEmbeddingAdapter,
} from '@mikesaintsg/adapters'

// Create stores
const provider = createOpenAIProviderAdapter({ apiKey })
const embedding = createOpenAIEmbeddingAdapter({ apiKey })

const engine = createEngine(provider)
const store = await createVectorStore(embedding)

// RAG pattern
async function queryWithContext(question: string) {
	// 1. Search for relevant documents
	const results = await store.search(question, { limit: 5 })
	
	// 2. Build context
	const context = results.map(r => r.content).join('\n\n')
	
	// 3. Generate with context
	const response = await engine.generate([
		{ role: 'system', content: 'Answer using the provided context.' },
		{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
	])
	
	return response.text
}
```

### With ContextBuilder

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createContextBuilder } from '@mikesaintsg/contextbuilder'

const engine = createEngine(provider)

// Build structured context
const context = createContextBuilder()
	.system('You are a helpful assistant.')
	.section('guidelines', 'Always be concise.')
	.user('Hello!')
	.build()

const result = await engine.generateFromContext(context)
```

### With ContextProtocol

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { createToolCallBridge } from '@mikesaintsg/adapters'

const engine = createEngine(provider)
const registry = createToolRegistry(formatter)
const bridge = createToolCallBridge({ registry })

// Register tools
registry.register(weatherTool.schema, weatherTool.handler)

// Generate with tools
const session = engine.createSession({ system: 'You have access to tools.' })
session.addMessage('user', 'What is the weather?')

const result = await session.generate({ tools: registry.all() })

if (result.toolCalls.length > 0) {
	const results = await bridge.execute(result.toolCalls)
	// Continue with results...
}
```

---

## API Reference

### Factory Functions

| Factory                | Returns                   |
|------------------------|---------------------------|
| `createEngine`         | `EngineInterface`         |
| `createTokenBatcher`   | `TokenBatcherInterface`   |
| `createTokenCounter`   | `TokenCounterInterface`   |
| `createAbortScope`     | `AbortScopeInterface`     |
| `createTimeoutMonitor` | `TimeoutMonitorInterface` |

### EngineInterface

```ts
interface EngineInterface {
	createSession(options?: SessionOptions): SessionInterface
	generate(messages: readonly Message[], options?: GenerationOptions): Promise<GenerationResult>
	stream(messages: readonly Message[], options?: GenerationOptions): StreamHandleInterface
	generateFromContext(context: BuiltContext, options?: GenerationOptions): Promise<GenerationResult>
	streamFromContext(context: BuiltContext, options?: GenerationOptions): StreamHandleInterface
	countTokens(text: string, model: string): number
	countMessages(messages: readonly Message[], model: string): number
	fitsInContext(content: string, model: string, max?: number): boolean
	getContextWindowSize(model: string): number | undefined
	abort(requestId: string): void
	getDeduplicationStats(): DeduplicationStats
}
```

### SessionInterface

```ts
interface SessionInterface {
	getId(): string
	getSystem(): string | undefined
	getCreatedAt(): number
	getHistory(): readonly Message[]
	addMessage(role: MessageRole, content: MessageContent): Message
	addToolResult(callId: string, name: string, result: unknown): Message
	removeMessage(id: string): boolean
	clear(): void
	truncateHistory(count: number): void
	generate(options?: GenerationOptions): Promise<GenerationResult>
	stream(options?: GenerationOptions): StreamHandleInterface
	getTokenBudgetState(): SessionTokenBudgetState | undefined
	fitsInBudget(content: string): boolean
	onMessageAdded(callback: (message: Message) => void): Unsubscribe
	onMessageRemoved(callback: (id: string) => void): Unsubscribe
	onTokenBudgetChange(callback: SessionTokenBudgetCallback): Unsubscribe
}
```

### StreamHandleInterface

```ts
interface StreamHandleInterface {
	readonly requestId: string
	[Symbol.asyncIterator](): AsyncIterator<string>
	result(): Promise<GenerationResult>
	abort(): void
	onToken(callback: (token: string) => void): Unsubscribe
	onComplete(callback: (result: GenerationResult) => void): Unsubscribe
	onError(callback: (error: Error) => void): Unsubscribe
}
```

---

## License

MIT © [Mike Saints-G](https://github.com/mikesaintsg)
