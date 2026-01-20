# ActionLoop Refactor: Adapter Extraction & LLM Integration

> This document specifies the remaining implementation work needed to align ActionLoop with the `@mikesaintsg` ecosystem adapter conventions and enable LLM-powered applications.
>
> **Note:** Types and interfaces have been extracted to their respective `types/` folders. This document now contains only implementation guidance and remaining tasks.

---

## Overview

### Architecture Summary

The refactor aligns ActionLoop with the ecosystem's adapter pattern:

1. **Shared types in `@mikesaintsg/core`**: Actor, EngagementState, DwellRecord, TransitionEvent, EventFilter, persistence adapter interfaces, streaming adapter interfaces
2. **Adapter implementations in `@mikesaintsg/adapters`**: IndexedDB and in-memory persistence adapters, streaming adapters
3. **Domain logic in `@mikesaintsg/actionloop`**: Graphs, engine, builder, validator, analyzer, activity tracker, context formatter

### Changes Summary

| Change                                              | Package      | Status                                     |
|-----------------------------------------------------|--------------|--------------------------------------------|
| Add `EventStorePersistenceAdapterInterface`         | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Add `WeightPersistenceAdapterInterface`             | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Add `ActivityTrackerInterface`                      | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Add `Actor` type to core                            | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Add shared ActionLoop types                         | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Move `StreamerAdapterInterface` to core             | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Move `SSEParserAdapterInterface` to core            | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Move `SSEEvent`, `SSEParserOptions` to core         | `core`       | ✅ Extracted to `types/core/types.ts`       |
| Add adapter options types                           | `adapters`   | ✅ Extracted to `types/adapters/types.ts`   |
| Add adapter factory types                           | `adapters`   | ✅ Extracted to `types/adapters/types.ts`   |
| Update `WorkflowEngineOptions`                      | `actionloop` | ✅ Extracted to `types/actionloop/types.ts` |
| Update `PredictiveGraphOptions`                     | `actionloop` | ✅ Extracted to `types/actionloop/types.ts` |
| Add `ActionLoopContextFormatterInterface`           | `actionloop` | ✅ Extracted to `types/actionloop/types.ts` |
| Add LLM context types                               | `actionloop` | ✅ Extracted to `types/actionloop/types.ts` |
| Implement `createIndexedDBEventPersistenceAdapter`  | `adapters`   | ⏳ Pending                                  |
| Implement `createIndexedDBWeightPersistenceAdapter` | `adapters`   | ⏳ Pending                                  |
| Implement `createInMemoryEventPersistenceAdapter`   | `adapters`   | ⏳ Pending                                  |
| Implement `createInMemoryWeightPersistenceAdapter`  | `adapters`   | ⏳ Pending                                  |
| Implement `createActivityTracker`                   | `actionloop` | ⏳ Pending                                  |
| Implement `createActionLoopContextFormatter`        | `actionloop` | ⏳ Pending                                  |

---

## Part 0: Streaming Adapter Architecture

### Streaming Adapter Interfaces (Moved to Core)

Streaming adapter interfaces have been moved from `@mikesaintsg/adapters` to `@mikesaintsg/core` since they are shared contracts consumed by multiple packages.

**Interfaces moved:**
- `StreamerAdapterInterface` - Universal token emission
- `SSEParserAdapterInterface` - SSE stream parsing factory
- `SSEParserInterface` - Stateful SSE parser
- `SSEParserOptions` - Parser callback options
- `SSEEvent` - Parsed SSE event structure

### Streaming by Provider Type

| Provider Type                                    | Streaming Format                | Adapters Used             |
|--------------------------------------------------|---------------------------------|---------------------------|
| **Server-side** (OpenAI, Anthropic)              | SSE (Server-Sent Events)        | SSE Parser → Streamer     |
| **Local NDJSON** (Ollama)                        | NDJSON (Newline Delimited JSON) | NDJSON parsing → Streamer |
| **Local callback** (node-llama-cpp, HuggingFace) | AsyncGenerator / TextStreamer   | Direct → Streamer         |

### File Structure for Streaming Adapters

```
@mikesaintsg/adapters/
  src/
    streamers/                   # Streaming adapter implementations
      streamer.ts                # createStreamerAdapter()
      sse-parser.ts              # createSSEParserAdapter()
      index.ts                   # Barrel exports
```

### Implementation: `src/streamers/streamer.ts`

````typescript
import type { StreamerAdapterInterface, Unsubscribe } from '@mikesaintsg/core'

/**
 * Create a streamer adapter for token emission.
 *
 * @returns Streamer adapter interface
 *
 * @example
 * ```ts
 * const streamer = createStreamerAdapter()
 *
 * streamer.onToken((token) => process.stdout.write(token))
 * streamer.emit('Hello')
 * streamer.emit(' world')
 * streamer.end()
 * ```
 */
export function createStreamerAdapter(): StreamerAdapterInterface {
	const listeners = new Set<(token: string) => void>()
	
	return {
		onToken(callback: (token: string) => void): Unsubscribe {
			listeners.add(callback)
			return () => listeners.delete(callback)
		},
		
		emit(token: string): void {
			for (const listener of listeners) {
				listener(token)
			}
		},
		
		end(): void {
			listeners.clear()
		},
		
		error(err: Error): void {
			// Optionally handle errors
			console.error('Streamer error:', err)
		},
	}
}
````

### Implementation: `src/streamers/sse-parser.ts`

````typescript
import type {
	SSEParserAdapterInterface,
	SSEParserInterface,
	SSEParserOptions,
	SSEEvent,
} from '@mikesaintsg/core'

import type { SSEParserAdapterOptions } from '../types.js'

/**
 * Create an SSE parser adapter for parsing Server-Sent Events.
 *
 * @param options - Optional parser configuration
 * @returns SSE parser adapter interface
 *
 * @example
 * ```ts
 * const sseAdapter = createSSEParserAdapter()
 *
 * const parser = sseAdapter.createParser({
 *   onEvent: (event) => console.log(event.data),
 *   onEnd: () => console.log('Done'),
 * })
 *
 * parser.feed('data: {"content": "Hello"}\n\n')
 * parser.end()
 * ```
 */
export function createSSEParserAdapter(
	options?: SSEParserAdapterOptions
): SSEParserAdapterInterface {
	const lineDelimiter = options?.lineDelimiter ?? '\n'
	const eventDelimiter = options?.eventDelimiter ?? '\n\n'
	
	return {
		createParser(parserOptions: SSEParserOptions): SSEParserInterface {
			let buffer = ''
			
			return {
				feed(chunk: string): void {
					buffer += chunk
					
					// Split by event delimiter
					const events = buffer.split(eventDelimiter)
					buffer = events.pop() ?? ''
					
					for (const eventBlock of events) {
						if (!eventBlock.trim()) continue
						
						const event = parseSSEEvent(eventBlock, lineDelimiter)
						if (event) {
							parserOptions.onEvent(event)
						}
					}
				},
				
				end(): void {
					// Process remaining buffer
					if (buffer.trim()) {
						const event = parseSSEEvent(buffer, lineDelimiter)
						if (event) {
							parserOptions.onEvent(event)
						}
					}
					buffer = ''
					parserOptions.onEnd?.()
				},
				
				reset(): void {
					buffer = ''
				},
			}
		},
	}
}

function parseSSEEvent(block: string, lineDelimiter: string): SSEEvent | undefined {
	const lines = block.split(lineDelimiter)
	let event: string | undefined
	let data = ''
	let id: string | undefined
	let retry: number | undefined
	
	for (const line of lines) {
		if (line.startsWith('event:')) {
			event = line.slice(6).trim()
		} else if (line.startsWith('data:')) {
			data += (data ? '\n' : '') + line.slice(5).trim()
		} else if (line.startsWith('id:')) {
			id = line.slice(3).trim()
		} else if (line.startsWith('retry:')) {
			retry = parseInt(line.slice(6).trim(), 10)
		}
	}
	
	if (!data) return undefined
	
	return { event, data, id, retry }
}
````

---

## Part 1: Adapter Factory Implementations for `@mikesaintsg/adapters`

### File: `src/persistence/event/indexeddb.ts`

````typescript
/**
 * IndexedDB event persistence adapter for ActionLoop.
 */

import type {
	EventStorePersistenceAdapterInterface,
	TransitionEvent,
	EventFilter,
} from '@mikesaintsg/core'

import type { IndexedDBEventPersistenceOptions } from '../../types.js'

/**
 * Create an IndexedDB-backed event persistence adapter.
 *
 * @param options - Configuration options
 * @returns Event persistence adapter
 *
 * @example
 * ```ts
 * import { createIndexedDBEventPersistenceAdapter } from '@mikesaintsg/adapters'
 *
 * const eventPersistence = createIndexedDBEventPersistenceAdapter({
 *   databaseName: 'my-app-events',
 * })
 *
 * const engine = createWorkflowEngine(procedural, predictive, {
 *   eventPersistence,
 * })
 * ```
 */
export function createIndexedDBEventPersistenceAdapter(
	options?: IndexedDBEventPersistenceOptions
): EventStorePersistenceAdapterInterface {
	// Implementation uses @mikesaintsg/indexeddb internally
	// TODO: Implement
	throw new Error('Not implemented')
}
````

### File: `src/persistence/weight/indexeddb.ts`

````typescript
/**
 * IndexedDB weight persistence adapter for ActionLoop.
 */

import type {
	WeightPersistenceAdapterInterface,
	ExportedPredictiveGraph,
} from '@mikesaintsg/core'

import type { IndexedDBWeightPersistenceOptions } from '../../types.js'

/**
 * Create an IndexedDB-backed weight persistence adapter.
 *
 * @param options - Configuration options
 * @returns Weight persistence adapter
 *
 * @example
 * ```ts
 * import { createIndexedDBWeightPersistenceAdapter } from '@mikesaintsg/adapters'
 *
 * const weightPersistence = createIndexedDBWeightPersistenceAdapter({
 *   databaseName: 'my-app-weights',
 *   autoSaveInterval: 60000, // Save every minute
 * })
 *
 * const predictive = createPredictiveGraph(procedural, {
 *   persistence: weightPersistence,
 * })
 * ```
 */
export function createIndexedDBWeightPersistenceAdapter(
	options?: IndexedDBWeightPersistenceOptions
): WeightPersistenceAdapterInterface {
	// Implementation uses @mikesaintsg/indexeddb internally
	// TODO: Implement
	throw new Error('Not implemented')
}
````

### File: `src/persistence/event/memory.ts`

````typescript
/**
 * In-memory event persistence adapter for ActionLoop.
 *
 * Useful for testing or when persistence is not required.
 */

import type {
	EventStorePersistenceAdapterInterface,
	TransitionEvent,
	EventFilter,
} from '@mikesaintsg/core'

import type { InMemoryEventPersistenceOptions } from '../../types.js'

/**
 * Create an in-memory event persistence adapter.
 *
 * @param options - Configuration options
 * @returns Event persistence adapter
 *
 * @example
 * ```ts
 * import { createInMemoryEventPersistenceAdapter } from '@mikesaintsg/adapters'
 *
 * const eventPersistence = createInMemoryEventPersistenceAdapter({
 *   maxEvents: 5000,
 * })
 * ```
 */
export function createInMemoryEventPersistenceAdapter(
	options?: InMemoryEventPersistenceOptions
): EventStorePersistenceAdapterInterface {
	// TODO: Implement
	throw new Error('Not implemented')
}
````

### File: `src/persistence/weight/memory.ts`

````typescript
/**
 * In-memory weight persistence adapter for ActionLoop.
 *
 * Useful for testing or when persistence is not required.
 */

import type {
	WeightPersistenceAdapterInterface,
	ExportedPredictiveGraph,
} from '@mikesaintsg/core'

/**
 * Create an in-memory weight persistence adapter.
 *
 * @returns Weight persistence adapter
 *
 * @example
 * ```ts
 * import { createInMemoryWeightPersistenceAdapter } from '@mikesaintsg/adapters'
 *
 * const weightPersistence = createInMemoryWeightPersistenceAdapter()
 * ```
 */
export function createInMemoryWeightPersistenceAdapter(): WeightPersistenceAdapterInterface {
	// TODO: Implement
	throw new Error('Not implemented')
}
````

---

## Part 2: Activity Tracker Implementation

The `createActivityTracker` factory lives in `@mikesaintsg/actionloop` because:

1. It's the primary package that uses it
2. It has no external dependencies (uses native browser APIs)
3. It's not a persistence or transform adapter

### File: `src/factories.ts` (in actionloop package)

````typescript
import type {
	ActivityTrackerInterface,
	ActivityTrackerOptions,
} from '@mikesaintsg/core'

import type { CreateActivityTracker, IsActivityTrackingSupported } from '../types.js'

/**
 * Create an activity tracker for engagement-aware predictions.
 *
 * @param options - Activity tracker configuration
 * @returns Activity tracker interface
 *
 * @example
 * ```ts
 * import { createActivityTracker } from '@mikesaintsg/actionloop'
 *
 * const activity = createActivityTracker({
 *   idleThreshold: 30000,
 *   awayThreshold: 300000,
 * })
 *
 * const engine = createWorkflowEngine(procedural, predictive, {
 *   activity,
 * })
 * ```
 */
export const createActivityTracker: CreateActivityTracker = (options) => {
	// TODO: Implement using browser APIs
	// - document.visibilityState
	// - pointermove, pointerdown
	// - keydown
	throw new Error('Not implemented')
}

/**
 * Check if activity tracking is supported in current environment.
 *
 * @returns true if browser environment with required APIs
 */
export const isActivityTrackingSupported: IsActivityTrackingSupported = () => {
	return (
		typeof document !== 'undefined' &&
		typeof document.visibilityState !== 'undefined' &&
		typeof window !== 'undefined' &&
		typeof window.addEventListener === 'function'
	)
}
````

---

## Part 3: ActionLoop Context Formatter

The `createActionLoopContextFormatter` factory transforms ActionLoop state into LLM-consumable context. This enables LLM-powered applications to receive predictions, engagement data, and pattern insights.

### File: `src/core/ContextFormatter.ts` (in actionloop package)

````typescript
import type {
	ActionLoopContextFormatterInterface,
	ActionLoopLLMContext,
	ContextFormatterOptions,
	DetailedPrediction,
	FormattedPrediction,
	ActivitySummary,
	PatternInsights,
} from '../types.js'

import type { TransitionEvent, EngagementState } from '@mikesaintsg/core'

/**
 * Create an ActionLoop context formatter for LLM integration.
 *
 * @param options - Optional formatter configuration
 * @returns Context formatter interface
 *
 * @example
 * ```ts
 * import { createActionLoopContextFormatter } from '@mikesaintsg/actionloop'
 *
 * const formatter = createActionLoopContextFormatter({
 *   maxRecentEvents: 10,
 *   includePatterns: true,
 *   getNodeLabel: (nodeId) => graph.getNode(nodeId)?.label ?? nodeId,
 * })
 *
 * const predictions = engine.predictNextDetailed(currentNode, context)
 * const events = await engine.getEvents({ sessionId, limit: 20 })
 * const llmContext = formatter.format(predictions, events)
 *
 * // Use in prompt
 * const prompt = formatter.toNaturalLanguage(llmContext)
 * ```
 */
export function createActionLoopContextFormatter(
	options?: ContextFormatterOptions
): ActionLoopContextFormatterInterface {
	const maxRecentEvents = options?.maxRecentEvents ?? 10
	const includePatterns = options?.includePatterns ?? false
	const includeDwell = options?.includeDwell ?? true
	const getNodeLabel = options?.getNodeLabel ?? ((nodeId: string) => nodeId)

	return {
		format(
			predictions: DetailedPrediction,
			events: readonly TransitionEvent[],
			overrideOptions?: ContextFormatterOptions
		): ActionLoopLLMContext {
			const opts = { ...options, ...overrideOptions }
			const labelFn = opts?.getNodeLabel ?? getNodeLabel
			const recentEvents = events.slice(-(opts?.maxRecentEvents ?? maxRecentEvents))

			return {
				currentNode: predictions.currentNode,
				predictions: predictions.predictions.slice(0, 5).map((p) => ({
					nodeId: p.nodeId,
					label: labelFn(p.nodeId),
					confidencePercent: Math.round(p.confidence * 100),
					reasoning: formatReasoning(p.factors),
				})),
				warmupComplete: predictions.warmupComplete,
				transitionCount: predictions.transitionCount,
				recentActivity: recentEvents.map((e) => ({
					from: e.from,
					to: e.to,
					actor: e.actor,
					timestamp: e.timestamp,
					dwellSeconds: e.dwell?.activeTime ? Math.round(e.dwell.activeTime / 1000) : undefined,
					engagement: e.engagement,
				})),
				engagement: recentEvents[recentEvents.length - 1]?.engagement ?? 'unknown',
				patterns: (opts?.includePatterns ?? includePatterns) ? extractPatterns(events) : undefined,
			}
		},

		toNaturalLanguage(context: ActionLoopLLMContext): string {
			const lines: string[] = []

			lines.push(`Current location: ${context.currentNode}`)
			lines.push(`User engagement: ${context.engagement}`)

			if (context.warmupComplete && context.predictions.length > 0) {
				lines.push('')
				lines.push('Predicted next actions (based on learned patterns):')
				for (const p of context.predictions.slice(0, 3)) {
					lines.push(`  - ${p.label}: ${p.confidencePercent}% likely (${p.reasoning})`)
				}
			} else if (!context.warmupComplete) {
				lines.push('')
				lines.push('Note: Predictions will improve with more usage data.')
			}

			if (context.patterns) {
				lines.push('')
				lines.push('Pattern insights:')
				if (context.patterns.frequentPaths.length > 0) {
					lines.push(`  - Frequent paths: ${context.patterns.frequentPaths.join(', ')}`)
				}
				if (context.patterns.bottlenecks.length > 0) {
					lines.push(`  - Bottlenecks: ${context.patterns.bottlenecks.join(', ')}`)
				}
			}

			return lines.join('\n')
		},

		toJSON(context: ActionLoopLLMContext): string {
			return JSON.stringify(context, null, 2)
		},
	}
}

function formatReasoning(factors: {
	frequency: number
	recency: number
	engagement: number
	sampleSize: number
}): string {
	const parts: string[] = []
	if (factors.frequency > 0.7) parts.push('frequently visited')
	if (factors.recency > 0.7) parts.push('recently accessed')
	if (factors.engagement > 0.7) parts.push('high engagement')
	if (factors.sampleSize > 0.7) parts.push('strong pattern')
	return parts.length > 0 ? parts.join(', ') : 'based on workflow structure'
}

function extractPatterns(events: readonly TransitionEvent[]): PatternInsights {
	// TODO: Implement pattern extraction
	// This would analyze events to find:
	// - Most frequent paths (sequence of transitions)
	// - Bottleneck nodes (high dwell time or many incoming transitions)
	// - Automation candidates (repetitive sequences)
	return {
		frequentPaths: [],
		bottlenecks: [],
		automationCandidates: [],
		avgSessionMinutes: 0,
	}
}
````

---

## Part 4: Migration Checklist

### In `@mikesaintsg/core`

- [x] Add shared types to `types/core/types.ts`
- [x] Add `Actor` type as shared type
- [x] Add TSDoc to all interfaces
- [x] Remove duplicate method definitions

### In `@mikesaintsg/adapters`

- [x] Add adapter options types to `types/adapters/types.ts`
- [x] Add factory function types to `types/adapters/types.ts`
- [ ] Implement `createIndexedDBEventPersistenceAdapter`
- [ ] Implement `createIndexedDBWeightPersistenceAdapter`
- [ ] Implement `createInMemoryEventPersistenceAdapter`
- [ ] Implement `createInMemoryWeightPersistenceAdapter`
- [ ] Add tests for each adapter

### In `@mikesaintsg/actionloop`

- [x] Update `types/actionloop/types.ts` with new interfaces
- [x] Update `PredictiveGraphOptions` to accept `persistence` adapter
- [x] Update `WorkflowEngineOptions` to accept `activity` and `eventPersistence` adapters
- [x] Add `ActionLoopLLMContext` types for LLM integration
- [x] Add `ActionLoopContextFormatterInterface` for context formatting
- [x] Re-export `Actor` from core for convenience
- [ ] Implement `createActivityTracker`
- [ ] Implement `isActivityTrackingSupported`
- [ ] Implement `createActionLoopContextFormatter`
- [ ] Add confidence scoring to `predictNextDetailed`
- [ ] Add warmup detection
- [ ] Add `GraphVersion` support
- [ ] Update tests for new functionality

---

## Part 5: Breaking Changes

| Change                              | Migration                                                          |
|-------------------------------------|--------------------------------------------------------------------|
| `eventSourcing: boolean` removed    | Use `eventPersistence` adapter instead                             |
| `DetailedPrediction` has new fields | Add handling for `warmupComplete`, `transitionCount`, `confidence` |
| `PredictionResult` has new fields   | Add handling for `confidence`, `factors`                           |
| Shared types moved to `core`        | Update imports from `@mikesaintsg/core`                            |
| `Actor` type moved to `core`        | Import from `@mikesaintsg/core` (re-exported from actionloop)      |

---

## Part 6: Adapter Selection Guide

| Use Case                   | Event Adapter                            | Weight Adapter                            |
|----------------------------|------------------------------------------|-------------------------------------------|
| Development/testing        | `createInMemoryEventPersistenceAdapter`  | `createInMemoryWeightPersistenceAdapter`  |
| Browser app (persistent)   | `createIndexedDBEventPersistenceAdapter` | `createIndexedDBWeightPersistenceAdapter` |
| Browser app (no audit)     | None (omit)                              | `createIndexedDBWeightPersistenceAdapter` |
| Server-side                | Custom HTTP adapter                      | Custom HTTP adapter                       |
| Ephemeral (no persistence) | None (omit)                              | None (omit)                               |

---

## Part 7: LLM Integration Pattern

The ActionLoop context formatter enables a powerful integration pattern with the inference package:

```typescript
// 1. Get predictions from ActionLoop
const predictions = engine.predictNextDetailed(currentNode, {
	actor: 'user',
	sessionId,
	path: window.location.pathname,
	count: 5,
})

// 2. Get recent events for context
const events = await engine.getEvents({ sessionId, limit: 20 })

// 3. Format for LLM consumption
const formatter = createActionLoopContextFormatter({
	getNodeLabel: (id) => graph.getNode(id)?.label ?? id,
})
const llmContext = formatter.format(predictions, events)

// 4. Add to context builder
const builder = createContextBuilder(tokenCounter, { budget: { maxTokens: 4000 } })
builder.addFrame({
	id: 'actionloop-context',
	type: 'context',
	priority: 'high',
	content: formatter.toNaturalLanguage(llmContext),
	metadata: { source: 'actionloop' },
})

// 5. LLM now has awareness of:
//    - Current location
//    - Predicted next actions with confidence
//    - User engagement patterns
//    - Recent activity history
```

This pattern enables:
- **Predictive UI**: Display ActionLoop predictions as confidence-ranked action buttons
- **Contextual Assistance**: LLM receives behavioral context for personalized responses
- **Tool Automation**: LLM can suggest or trigger transitions based on patterns
- **Insight Generation**: LLM can synthesize insights from ActionLoop data

