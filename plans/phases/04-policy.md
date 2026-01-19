# Phase 4: Policy & Enhancement Adapters

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** —
> **Depends on:** Phase 0 (Pre-Flight) ✅ Complete

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project. 

```
Current Deliverable: 4.1 Exponential Retry
Checklist Progress:  0/48 items complete
Last Completed: Phase 3 complete
Next Task:  Implement exponential retry adapter
Blockers:  None
```

---

## Objective

Implement all policy adapters (retry, rate limit) and enhancement adapters (cache, batch, reranker). By end of phase, systems can use these adapters to add resilience and performance optimizations.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/11      |
| Checklist Items | 0/48      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

### Policy Adapters

| #   | Deliverable              | Status    | Assignee | Notes                    |
|-----|--------------------------|-----------|----------|--------------------------|
| 4.1 | Exponential Retry        | ⏳ Pending | —        | Backoff with jitter      |
| 4.2 | Linear Retry             | ⏳ Pending | —        | Fixed delay              |
| 4.3 | Token Bucket Rate Limit  | ⏳ Pending | —        | Token bucket algorithm   |
| 4.4 | Sliding Window Rate Limit| ⏳ Pending | —        | Sliding window algorithm |

### Enhancement Adapters

| #   | Deliverable              | Status    | Assignee | Notes                    |
|-----|--------------------------|-----------|----------|--------------------------|
| 4.5 | LRU Cache                | ⏳ Pending | —        | In-memory with eviction  |
| 4.6 | TTL Cache                | ⏳ Pending | —        | Time-based expiration    |
| 4.7 | IndexedDB Cache          | ⏳ Pending | —        | Persistent browser cache |
| 4.8 | Batch Adapter            | ⏳ Pending | —        | Request batching         |
| 4.9 | Cohere Reranker          | ⏳ Pending | —        | API-based reranking      |
| 4.10| Cross-Encoder Reranker   | ⏳ Pending | —        | Local model reranking    |
| 4.11| Unit Tests               | ⏳ Pending | —        | All policy & enhancement |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

| Deliverable | Required Types                              | Status |
|-------------|---------------------------------------------|--------|
| 4.1         | `ExponentialRetryAdapterOptions`            | ✅      |
| 4.2         | `LinearRetryAdapterOptions`                 | ✅      |
| 4.3         | `TokenBucketRateLimitAdapterOptions`        | ✅      |
| 4.4         | `SlidingWindowRateLimitAdapterOptions`      | ✅      |
| 4.5         | `LRUCacheAdapterOptions`                    | ✅      |
| 4.6         | `TTLCacheAdapterOptions`                    | ✅      |
| 4.7         | `IndexedDBCacheAdapterOptions`              | ✅      |
| 4.8         | `BatchAdapterOptions`                       | ✅      |
| 4.9         | `CohereRerankerAdapterOptions`              | ✅      |
| 4.10        | `CrossEncoderRerankerAdapterOptions`        | ✅      |

---

## Current Focus: 4.1 Exponential Retry

### Requirements

1. Implements `RetryAdapterInterface`
2. Exponential backoff with configurable multiplier
3. Jitter option to prevent thundering herd
4. Configurable max attempts and delays
5. Configurable retryable error codes
6. `onRetry` callback before each retry

### Interface Contract

```typescript
// From @mikesaintsg/core
interface RetryAdapterInterface {
	shouldRetry(error:  unknown, attempt: number): boolean
	getDelay(attempt:  number): number
	getMaxAttempts(): number
}
```

### Implementation Order

1. `src/core/policy/ExponentialRetry.ts` — Implementation
2. `src/factories.ts` — Add `createExponentialRetryAdapter`
3. `tests/core/policy/ExponentialRetry. test.ts` — Unit tests

### Implementation Checklist

**Implementation:**
- [ ] Create `src/core/policy/ExponentialRetry. ts`
- [ ] Implement constructor with options
- [ ] Implement `shouldRetry()`:
  - [ ] Check attempt < maxAttempts
  - [ ] Check error code is in retryableCodes
  - [ ] Call onRetry callback if provided
- [ ] Implement `getDelay()`:
  - [ ] Calculate:  `initialDelayMs * (backoffMultiplier ^ attempt)`
  - [ ] Apply jitter if enabled:  `delay * (0.5 + Math.random())`
  - [ ] Cap at maxDelayMs
- [ ] Implement `getMaxAttempts()`

**Tests:**
- [ ] Test exponential growth of delays
- [ ] Test jitter randomization
- [ ] Test max delay cap
- [ ] Test retryable codes filtering
- [ ] Test onRetry callback

### Acceptance Criteria

```typescript
describe('ExponentialRetry', () => {
	it('calculates exponential delay', () => {
		const retry = createExponentialRetryAdapter({
			initialDelayMs: 1000,
			backoffMultiplier:  2,
			jitter: false,
		})
		
		expect(retry.getDelay(0)).toBe(1000)  // 1000 * 2^0
		expect(retry. getDelay(1)).toBe(2000)  // 1000 * 2^1
		expect(retry.getDelay(2)).toBe(4000)  // 1000 * 2^2
	})

	it('respects max delay', () => {
		const retry = createExponentialRetryAdapter({
			initialDelayMs: 1000,
			backoffMultiplier:  2,
			maxDelayMs: 5000,
			jitter: false,
		})
		
		expect(retry.getDelay(10)).toBe(5000) // Capped
	})
})
```

---

## 4.2 Linear Retry

### Specific Requirements

- Fixed delay between attempts
- Same interface as exponential

### Implementation

```typescript
getDelay(attempt: number): number {
	return this.#delayMs
}
```

---

## 4.3 Token Bucket Rate Limit

### Specific Requirements

- Implements `RateLimitAdapterInterface`
- Token bucket algorithm
- Configurable bucket size and refill rate
- Max concurrent requests
- `acquire()` waits for available token
- `release()` returns token to bucket

### Interface Contract

```typescript
// From @mikesaintsg/core
interface RateLimitAdapterInterface {
	acquire(): Promise<void>
	release(): void
	getState(): RateLimitState
	setLimit(requestsPerMinute: number): void
}

interface RateLimitState {
	readonly activeRequests: number
	readonly availableTokens: number
	readonly maxConcurrent: number
	readonly requestsPerMinute:  number
}
```

### Implementation Pattern

```typescript
class TokenBucketRateLimit implements RateLimitAdapterInterface {
	#tokens: number
	#maxTokens: number
	#refillRate: number // tokens per ms
	#lastRefill: number
	#activeRequests: number = 0
	#maxConcurrent: number
	#waitQueue: Array<() => void> = []

	async acquire(): Promise<void> {
		this.#refillTokens()
		
		if (this. #tokens > 0 && this.#activeRequests < this. #maxConcurrent) {
			this.#tokens--
			this.#activeRequests++
			return
		}
		
		// Wait for a token
		return new Promise((resolve) => {
			this.#waitQueue.push(resolve)
		})
	}

	release(): void {
		this.#activeRequests--
		this.#processQueue()
	}
}
```

---

## 4.4 Sliding Window Rate Limit

### Specific Requirements

- Sliding window algorithm
- Tracks requests within time window
- More accurate than fixed windows

### Implementation Pattern

```typescript
class SlidingWindowRateLimit implements RateLimitAdapterInterface {
	#requests: number[] = [] // timestamps
	#windowMs: number
	#maxRequests: number

	async acquire(): Promise<void> {
		const now = Date.now()
		
		// Remove expired requests
		this. #requests = this. #requests.filter(
			(t) => now - t < this.#windowMs
		)
		
		if (this.#requests.length >= this.#maxRequests) {
			// Wait until oldest request expires
			const waitTime = this.#requests[0] + this.#windowMs - now
			await sleep(waitTime)
			return this.acquire() // Retry
		}
		
		this.#requests.push(now)
	}
}
```

---

## 4.5 LRU Cache

### Specific Requirements

- Implements `EmbeddingCacheAdapterInterface`
- LRU eviction when maxSize exceeded
- Optional TTL per entry
- `onEvict` callback

### Interface Contract

```typescript
// From @mikesaintsg/core
interface EmbeddingCacheAdapterInterface {
	get(text: string): Embedding | undefined
	set(text: string, embedding:  Embedding): void
	has(text: string): boolean
	delete(text: string): boolean
	clear(): void
	getStats(): CacheStats
}
```

### Implementation Pattern

```typescript
class LRUCache implements EmbeddingCacheAdapterInterface {
	#cache = new Map<string, CacheEntry>()
	#maxSize:  number
	#ttlMs?:  number
	#onEvict?:  (text: string, embedding:  Embedding) => void

	get(text: string): Embedding | undefined {
		const entry = this.#cache. get(text)
		if (!entry) return undefined
		
		// Check TTL
		if (this.#ttlMs && Date.now() - entry.timestamp > this. #ttlMs) {
			this. delete(text)
			return undefined
		}
		
		// Move to end (most recently used)
		this.#cache. delete(text)
		this.#cache.set(text, entry)
		
		return entry.embedding
	}

	set(text: string, embedding: Embedding): void {
		// Evict if at capacity
		if (this.#cache. size >= this.#maxSize && ! this.#cache.has(text)) {
			const oldest = this.#cache.keys().next().value
			if (oldest !== undefined) {
				const entry = this.#cache.get(oldest)
				this.#cache.delete(oldest)
				this.#onEvict?.(oldest, entry! .embedding)
			}
		}
		
		this. #cache.set(text, { embedding, timestamp: Date.now() })
	}
}
```

---

## 4.6 TTL Cache

### Specific Requirements

- Time-based expiration only (no LRU)
- No size limit
- Simpler than LRU cache

---

## 4.7 IndexedDB Cache

### Specific Requirements

- Persistent across sessions
- Async operations
- Uses `MinimalDatabaseAccess` interface
- TTL-based expiration

### Implementation Pattern

```typescript
class IndexedDBCache implements EmbeddingCacheAdapterInterface {
	#database: MinimalDatabaseAccess
	#storeName: string
	#ttlMs:  number

	async get(text: string): Promise<Embedding | undefined> {
		const key = await this.#hashText(text)
		const entry = await this.#database.get(this.#storeName, key)
		
		if (!entry) return undefined
		
		// Check TTL
		if (Date.now() - entry.timestamp > this. #ttlMs) {
			await this.#database.delete(this.#storeName, key)
			return undefined
		}
		
		return new Float32Array(entry.embedding)
	}

	async set(text: string, embedding:  Embedding): Promise<void> {
		const key = await this.#hashText(text)
		await this.#database. put(this.#storeName, {
			id: key,
			text,
			embedding:  Array.from(embedding),
			timestamp: Date.now(),
		})
	}

	async #hashText(text:  string): Promise<string> {
		const encoder = new TextEncoder()
		const data = encoder.encode(text)
		const hashBuffer = await crypto. subtle.digest('SHA-256', data)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		return hashArray. map((b) => b.toString(16).padStart(2, '0')).join('')
	}
}
```

---

## 4.8 Batch Adapter

### Specific Requirements

- Implements `BatchAdapterInterface`
- Collects requests and processes in batches
- Configurable batch size and delay
- Deduplication option

### Interface Contract

```typescript
// From @mikesaintsg/core
interface BatchAdapterInterface {
	add<T>(key: string, executor: () => Promise<T>): Promise<T>
	flush(): Promise<void>
	getStats(): BatchStats
}
```

---

## 4.9 Cohere Reranker

### Specific Requirements

- Implements `RerankerAdapterInterface`
- Calls Cohere rerank API
- Returns reordered results with scores

### Interface Contract

```typescript
// From @mikesaintsg/core
interface RerankerAdapterInterface {
	rerank(
		query: string,
		documents: readonly string[],
		options?: RerankOptions
	): Promise<readonly RerankResult[]>
}

interface RerankResult {
	readonly index: number
	readonly score: number
	readonly document: string
}
```

---

## 4.10 Cross-Encoder Reranker

### Specific Requirements

- Local cross-encoder model
- Consumer must provide model path/instance
- Slower but no API calls

---

## Files Created/Modified

| File                                           | Action   | Deliverable |
|------------------------------------------------|----------|-------------|
| `src/core/policy/ExponentialRetry.ts`          | Created  | 4.1         |
| `src/core/policy/LinearRetry.ts`               | Created  | 4.2         |
| `src/core/policy/TokenBucketRateLimit.ts`      | Created  | 4.3         |
| `src/core/policy/SlidingWindowRateLimit.ts`    | Created  | 4.4         |
| `src/core/enhancement/LRUCache.ts`             | Created  | 4.5         |
| `src/core/enhancement/TTLCache.ts`             | Created  | 4.6         |
| `src/core/enhancement/IndexedDBCache.ts`       | Created  | 4.7         |
| `src/core/enhancement/Batch.ts`                | Created  | 4.8         |
| `src/core/enhancement/CohereReranker.ts`       | Created  | 4.9         |
| `src/core/enhancement/CrossEncoderReranker.ts` | Created  | 4.10        |
| `src/factories.ts`                             | Modified | All         |
| `src/index.ts`                                 | Modified | All         |
| `tests/core/policy/*. test.ts`                  | Created  | 4.11        |
| `tests/core/enhancement/*.test. ts`             | Created  | 4.11        |

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
| ExponentialRetry       | 100%         | —       |
| LinearRetry            | 100%         | —       |
| TokenBucketRateLimit   | 90%          | —       |
| SlidingWindowRateLimit | 90%          | —       |
| LRUCache               | 90%          | —       |
| TTLCache               | 90%          | —       |
| IndexedDBCache         | 80%          | —       |
| Batch                  | 80%          | —       |
| CohereReranker         | 80%          | —       |
| CrossEncoderReranker   | 80%          | —       |

---

## Notes

- Retry and rate limit adapters are synchronous-friendly but may need async
- LRU cache uses Map iteration order (insertion order) for LRU behavior
- IndexedDB cache needs hash function for keys (text may be too long)
- Use short timers (10-50ms) in tests for rate limiting

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All 10 adapters implemented
- [ ] Retry adapters calculate delays correctly
- [ ] Rate limit adapters throttle correctly
- [ ] Cache adapters evict correctly
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes with ≥80% coverage
- [ ] No `it.todo()` remaining
- [ ] PLAN. md updated