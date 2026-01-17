import './styles.css'
import {
	// Embeddings
	createOpenAIEmbeddingAdapter,
	createVoyageEmbeddingAdapter,
	createOllamaEmbeddingAdapter,
	createBatchedEmbeddingAdapter,
	createCachedEmbeddingAdapter,
	// Providers
	createOpenAIProviderAdapter,
	createAnthropicProviderAdapter,
	createOllamaProviderAdapter,
	// Helpers
	createRateLimiter,
	createSSEParser,
	// Persistence
	createIndexedDBSessionPersistence,
	// Bridges
	createToolCallBridge,
	createRetrievalTool,
	// Errors
	AdapterError,
	isAdapterError,
} from '../src/index.js'
import type {
	RateLimiterState,
	SSEEvent,
	ToolRegistryInterface,
	VectorStoreInterface,
	SearchResult,
} from '../src/types.js'

/**
 * @mikesaintsg/adapters Showcase
 *
 * Interactive demo of all adapters package capabilities.
 */

// ============================================================================
// Demo State
// ============================================================================

interface DemoState {
	activeTab: string
	logs: readonly string[]
}

const state: DemoState = {
	activeTab: 'embeddings',
	logs: [],
}

// ============================================================================
// Logging Helper
// ============================================================================

function log(message: string): void {
	const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] ?? ''
	const logEntry = `[${timestamp}] ${message}`
	state.logs = [...state.logs.slice(-49), logEntry]
	updateLogDisplay()
}

function updateLogDisplay(): void {
	const logOutput = document.getElementById('log-output')
	if (logOutput) {
		logOutput.textContent = state.logs.join('\n')
		logOutput.scrollTop = logOutput.scrollHeight
	}
}

// ============================================================================
// UI Rendering
// ============================================================================

function getAppElement(): HTMLElement {
	const app = document.getElementById('app')
	if (!app) throw new Error('App element not found')
	return app
}

function render(): void {
	const app = getAppElement()
	app.innerHTML = `
<div class="showcase">
  <header class="header">
    <h1>@mikesaintsg/adapters</h1>
    <p class="subtitle">Zero-dependency LLM provider and embedding adapters</p>
  </header>

  <nav class="tabs">
    <button class="tab ${state.activeTab === 'embeddings' ? 'active' : ''}" data-tab="embeddings">
      🧠 Embeddings
    </button>
    <button class="tab ${state.activeTab === 'providers' ? 'active' : ''}" data-tab="providers">
      💬 Providers
    </button>
    <button class="tab ${state.activeTab === 'helpers' ? 'active' : ''}" data-tab="helpers">
      🔧 Helpers
    </button>
    <button class="tab ${state.activeTab === 'persistence' ? 'active' : ''}" data-tab="persistence">
      💾 Persistence
    </button>
    <button class="tab ${state.activeTab === 'bridges' ? 'active' : ''}" data-tab="bridges">
      🌉 Bridges
    </button>
  </nav>

  <main class="content">
    ${renderTabContent()}
  </main>

  <section class="log-section">
    <h3>📋 Activity Log</h3>
    <pre id="log-output" class="log-output">${state.logs.join('\n')}</pre>
    <button id="clear-logs" class="btn btn-secondary">Clear Logs</button>
  </section>

  <footer>
    <p>Built with TypeScript • Zero Dependencies • Browser + Node.js</p>
  </footer>
</div>
`
	attachEventListeners()
}

function renderTabContent(): string {
	switch (state.activeTab) {
		case 'embeddings':
			return renderEmbeddingsTab()
		case 'providers':
			return renderProvidersTab()
		case 'helpers':
			return renderHelpersTab()
		case 'persistence':
			return renderPersistenceTab()
		case 'bridges':
			return renderBridgesTab()
		default:
			return ''
	}
}

function renderEmbeddingsTab(): string {
	return `
    <section class="demo-section">
      <h2>🧠 Embedding Adapters</h2>
      <p class="description">
        Generate vector embeddings from text using various providers.
        Adapters support batching, caching, and composition.
      </p>

      <div class="demo-grid">
        <div class="demo-card">
          <h3>OpenAI Embeddings</h3>
          <p>text-embedding-3-small/large with dimension reduction</p>
          <button id="demo-openai-embed" class="btn btn-primary">Test Factory</button>
        </div>

        <div class="demo-card">
          <h3>Voyage AI Embeddings</h3>
          <p>voyage-3, voyage-3-lite, voyage-code-3 with input types</p>
          <button id="demo-voyage-embed" class="btn btn-primary">Test Factory</button>
        </div>

        <div class="demo-card">
          <h3>Ollama Embeddings</h3>
          <p>Local embeddings for development (nomic-embed-text, mxbai)</p>
          <button id="demo-ollama-embed" class="btn btn-primary">Test Factory</button>
        </div>

        <div class="demo-card">
          <h3>Wrapper Composition</h3>
          <p>Batched + Cached + Base adapter composition</p>
          <button id="demo-wrapper-embed" class="btn btn-primary">Test Composition</button>
        </div>
      </div>
    </section>
  `
}

function renderProvidersTab(): string {
	return `
    <section class="demo-section">
      <h2>💬 Provider Adapters</h2>
      <p class="description">
        Connect to LLM providers for chat completions with streaming support.
        Each adapter handles provider-specific SSE formats and tool calling.
      </p>

      <div class="demo-grid">
        <div class="demo-card">
          <h3>OpenAI Provider</h3>
          <p>GPT-4o, GPT-4, GPT-3.5-turbo with streaming and tools</p>
          <button id="demo-openai-provider" class="btn btn-primary">Test Factory</button>
        </div>

        <div class="demo-card">
          <h3>Anthropic Provider</h3>
          <p>Claude 3.5 Sonnet, Claude 3 Opus/Haiku with tool use</p>
          <button id="demo-anthropic-provider" class="btn btn-primary">Test Factory</button>
        </div>

        <div class="demo-card">
          <h3>Ollama Provider</h3>
          <p>Local LLMs (Llama 2/3, Mistral, CodeLlama) for development</p>
          <button id="demo-ollama-provider" class="btn btn-primary">Test Factory</button>
        </div>
      </div>
    </section>
  `
}

function renderHelpersTab(): string {
	return `
    <section class="demo-section">
      <h2>🔧 Helper Utilities</h2>
      <p class="description">
        Core utilities shared across adapters: SSE parsing, rate limiting,
        error mapping, and retry logic.
      </p>

      <div class="demo-grid">
        <div class="demo-card">
          <h3>Rate Limiter</h3>
          <p>Sliding window with concurrent request limiting</p>
          <button id="demo-rate-limiter" class="btn btn-primary">Test Rate Limiter</button>
        </div>

        <div class="demo-card">
          <h3>SSE Parser</h3>
          <p>Stateful parser for chunked SSE streams</p>
          <button id="demo-sse-parser" class="btn btn-primary">Test SSE Parser</button>
        </div>

        <div class="demo-card">
          <h3>Adapter Errors</h3>
          <p>Typed errors with provider codes and retry info</p>
          <button id="demo-errors" class="btn btn-primary">Test Error Handling</button>
        </div>
      </div>
    </section>
  `
}

function renderPersistenceTab(): string {
	return `
    <section class="demo-section">
      <h2>💾 Persistence Adapters</h2>
      <p class="description">
        Store sessions and vectors in browser storage.
        Supports IndexedDB, OPFS, and HTTP backends.
      </p>

      <div class="demo-grid">
        <div class="demo-card">
          <h3>Session Persistence</h3>
          <p>IndexedDB storage with TTL expiration</p>
          <button id="demo-session-persistence" class="btn btn-primary">Test Session Storage</button>
        </div>

        <div class="demo-card">
          <h3>VectorStore Persistence</h3>
          <p>IndexedDB, OPFS, and HTTP backends</p>
          <button id="demo-vector-persistence" class="btn btn-primary">Test Factories</button>
        </div>
      </div>
    </section>
  `
}

function renderBridgesTab(): string {
	return `
    <section class="demo-section">
      <h2>🌉 Bridge Functions</h2>
      <p class="description">
        Connect inference tool calls to execution and vector retrieval.
        Provides lifecycle hooks and timeout handling.
      </p>

      <div class="demo-grid">
        <div class="demo-card">
          <h3>Tool Call Bridge</h3>
          <p>Connect inference to context protocol execution</p>
          <button id="demo-tool-bridge" class="btn btn-primary">Test Tool Bridge</button>
        </div>

        <div class="demo-card">
          <h3>Retrieval Tool</h3>
          <p>Create VectorStore query tools</p>
          <button id="demo-retrieval-tool" class="btn btn-primary">Test Retrieval Tool</button>
        </div>
      </div>
    </section>
  `
}

// ============================================================================
// Event Listeners
// ============================================================================

function attachEventListeners(): void {
	// Tab navigation
	document.querySelectorAll('.tab').forEach((tab) => {
		tab.addEventListener('click', (e) => {
			const target = e.target as HTMLElement
			const tabName = target.dataset.tab
			if (tabName) {
				state.activeTab = tabName
				render()
			}
		})
	})

	// Clear logs
	document.getElementById('clear-logs')?.addEventListener('click', () => {
		state.logs = []
		updateLogDisplay()
	})

	// Demo buttons - Embeddings
	document.getElementById('demo-openai-embed')?.addEventListener('click', demoOpenAIEmbedding)
	document.getElementById('demo-voyage-embed')?.addEventListener('click', demoVoyageEmbedding)
	document.getElementById('demo-ollama-embed')?.addEventListener('click', demoOllamaEmbedding)
	document.getElementById('demo-wrapper-embed')?.addEventListener('click', demoWrapperComposition)

	// Demo buttons - Providers
	document.getElementById('demo-openai-provider')?.addEventListener('click', demoOpenAIProvider)
	document.getElementById('demo-anthropic-provider')?.addEventListener('click', demoAnthropicProvider)
	document.getElementById('demo-ollama-provider')?.addEventListener('click', demoOllamaProvider)

	// Demo buttons - Helpers
	document.getElementById('demo-rate-limiter')?.addEventListener('click', () => { void demoRateLimiter() })
	document.getElementById('demo-sse-parser')?.addEventListener('click', demoSSEParser)
	document.getElementById('demo-errors')?.addEventListener('click', demoErrors)

	// Demo buttons - Persistence
	document.getElementById('demo-session-persistence')?.addEventListener('click', () => { void demoSessionPersistence() })
	document.getElementById('demo-vector-persistence')?.addEventListener('click', demoVectorPersistence)

	// Demo buttons - Bridges
	document.getElementById('demo-tool-bridge')?.addEventListener('click', demoToolBridge)
	document.getElementById('demo-retrieval-tool')?.addEventListener('click', demoRetrievalTool)
}

// ============================================================================
// Demo Functions - Embeddings
// ============================================================================

function demoOpenAIEmbedding(): void {
	log('📦 Creating OpenAI embedding adapter...')
	try {
		const adapter = createOpenAIEmbeddingAdapter({
			apiKey: 'demo-api-key',
			model: 'text-embedding-3-small',
			dimensions: 1536,
		})
		log('✅ OpenAI embedding adapter created successfully')
		log(`   Model: ${adapter.getModelMetadata().model}`)
		log(`   Dimensions: ${adapter.getModelMetadata().dimensions}`)
		log(`   Provider: ${adapter.getModelMetadata().provider}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoVoyageEmbedding(): void {
	log('📦 Creating Voyage embedding adapter...')
	try {
		const adapter = createVoyageEmbeddingAdapter({
			apiKey: 'demo-api-key',
			model: 'voyage-3',
			inputType: 'document',
		})
		log('✅ Voyage embedding adapter created successfully')
		log(`   Model: ${adapter.getModelMetadata().model}`)
		log(`   Dimensions: ${adapter.getModelMetadata().dimensions}`)
		log(`   Provider: ${adapter.getModelMetadata().provider}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoOllamaEmbedding(): void {
	log('📦 Creating Ollama embedding adapter...')
	try {
		const adapter = createOllamaEmbeddingAdapter({
			model: 'nomic-embed-text',
			baseURL: 'http://localhost:11434',
			timeout: 30000,
		})
		log('✅ Ollama embedding adapter created successfully')
		log(`   Model: ${adapter.getModelMetadata().model}`)
		log(`   Provider: ${adapter.getModelMetadata().provider}`)
		log('   Note: Requires local Ollama server')
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoWrapperComposition(): void {
	log('📦 Creating composed embedding adapter...')
	try {
		// Create base adapter
		const baseAdapter = createOpenAIEmbeddingAdapter({
			apiKey: 'demo-api-key',
			model: 'text-embedding-3-small',
		})
		log('   ✅ Base adapter created')

		// Wrap with batching
		const batchedAdapter = createBatchedEmbeddingAdapter({
			adapter: baseAdapter,
			batchSize: 100,
			delayMs: 50,
			deduplicate: true,
		})
		log('   ✅ Batched wrapper added (batchSize: 100)')

		// Wrap with caching
		const cache = new Map()
		const cachedAdapter = createCachedEmbeddingAdapter({
			adapter: batchedAdapter,
			cache,
			ttlMs: 3600000, // 1 hour
		})
		log('   ✅ Cache wrapper added (TTL: 1 hour)')

		log('✅ Composed adapter ready: Cached → Batched → OpenAI')
		log(`   Final model: ${cachedAdapter.getModelMetadata().model}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// ============================================================================
// Demo Functions - Providers
// ============================================================================

function demoOpenAIProvider(): void {
	log('📦 Creating OpenAI provider adapter...')
	try {
		const adapter = createOpenAIProviderAdapter({
			apiKey: 'demo-api-key',
			model: 'gpt-4o',
			defaultOptions: {
				temperature: 0.7,
				maxTokens: 1000,
			},
		})
		log('✅ OpenAI provider adapter created successfully')
		const caps = adapter.getCapabilities()
		log(`   Models: ${caps.models.join(', ')}`)
		log(`   Supports streaming: ${caps.supportsStreaming}`)
		log(`   Supports tools: ${caps.supportsTools}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoAnthropicProvider(): void {
	log('📦 Creating Anthropic provider adapter...')
	try {
		const adapter = createAnthropicProviderAdapter({
			apiKey: 'demo-api-key',
			model: 'claude-3-5-sonnet-20241022',
		})
		log('✅ Anthropic provider adapter created successfully')
		const caps = adapter.getCapabilities()
		log(`   Models: ${caps.models.join(', ')}`)
		log(`   Supports streaming: ${caps.supportsStreaming}`)
		log(`   Supports tools: ${caps.supportsTools}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoOllamaProvider(): void {
	log('📦 Creating Ollama provider adapter...')
	try {
		const adapter = createOllamaProviderAdapter({
			model: 'llama3',
			baseURL: 'http://localhost:11434',
			keepAlive: true,
			timeout: 120000,
		})
		log('✅ Ollama provider adapter created successfully')
		const caps = adapter.getCapabilities()
		log(`   Models: ${caps.models.join(', ')}`)
		log(`   Supports streaming: ${caps.supportsStreaming}`)
		log('   Note: Requires local Ollama server')
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// ============================================================================
// Demo Functions - Helpers
// ============================================================================

async function demoRateLimiter(): Promise<void> {
	log('📦 Creating rate limiter...')
	try {
		const limiter = createRateLimiter({
			requestsPerMinute: 60,
			maxConcurrent: 5,
			windowMs: 60000,
		})
		log('✅ Rate limiter created')

		const initialState: RateLimiterState = limiter.getState()
		log(`   Requests per minute: ${initialState.requestsPerMinute}`)
		log(`   Max concurrent: ${initialState.maxConcurrent}`)
		log(`   Active requests: ${initialState.activeRequests}`)

		// Simulate acquiring a slot
		log('⏳ Acquiring slot...')
		await limiter.acquire()
		log('✅ Slot acquired')

		const afterAcquire: RateLimiterState = limiter.getState()
		log(`   Active requests: ${afterAcquire.activeRequests}`)
		log(`   Requests in window: ${afterAcquire.requestsInWindow}`)

		// Release
		limiter.release()
		log('✅ Slot released')

		const afterRelease: RateLimiterState = limiter.getState()
		log(`   Active requests: ${afterRelease.activeRequests}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoSSEParser(): void {
	log('📦 Creating SSE parser...')
	try {
		const events: SSEEvent[] = []
		const parser = createSSEParser({
			onEvent: (event: SSEEvent) => {
				events.push(event)
				log(`   Event received: ${event.data.substring(0, 50)}...`)
			},
			onError: (error: Error) => {
				log(`   Parse error: ${error.message}`)
			},
			onEnd: () => {
				log('   Stream ended')
			},
		})
		log('✅ SSE parser created')

		// Feed sample SSE data
		log('📡 Feeding sample SSE data...')
		parser.feed('event: message\n')
		parser.feed('data: {"content":"Hello"}\n')
		parser.feed('\n')
		parser.feed('data: {"content":"World"}\n')
		parser.feed('\n')
		parser.feed('data: [DONE]\n')
		parser.feed('\n')
		parser.end()

		log(`✅ Parsed ${events.length} events`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoErrors(): void {
	log('📦 Demonstrating error handling...')
	try {
		// Create various error types
		const authError = new AdapterError(
			'AUTHENTICATION_ERROR',
			'Invalid API key',
			{ providerCode: '401' },
		)
		log(`✅ Auth error: ${authError.code}`)
		log(`   Message: ${authError.message}`)
		log(`   Provider code: ${authError.providerCode}`)

		const rateLimitError = new AdapterError(
			'RATE_LIMIT_ERROR',
			'Too many requests',
			{ retryAfter: 5000, providerCode: '429' },
		)
		log(`✅ Rate limit error: ${rateLimitError.code}`)
		log(`   Retry after: ${rateLimitError.retryAfter}ms`)

		// Test type guard
		log(`   isAdapterError(authError): ${isAdapterError(authError)}`)
		log(`   isAdapterError(new Error()): ${isAdapterError(new Error())}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// ============================================================================
// Demo Functions - Persistence
// ============================================================================

async function demoSessionPersistence(): Promise<void> {
	log('📦 Creating session persistence adapter...')
	try {
		const persistence = createIndexedDBSessionPersistence({
			databaseName: 'adapters-demo-sessions',
			storeName: 'sessions',
			ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
		})
		log('✅ Session persistence adapter created')

		// Create a test session with proper Message format
		const now = Date.now()
		const testSession = {
			id: `demo-session-${now}`,
			system: undefined,
			messages: [
				{ id: 'msg-1', role: 'user' as const, content: 'Hello!', createdAt: now },
				{ id: 'msg-2', role: 'assistant' as const, content: 'Hi there!', createdAt: now + 1 },
			],
			createdAt: now,
			updatedAt: now,
		}

		// Save session
		log('💾 Saving session...')
		await persistence.save(testSession)
		log(`✅ Session saved: ${testSession.id}`)

		// Load session
		log('📂 Loading session...')
		const loaded = await persistence.load(testSession.id)
		if (loaded) {
			log(`✅ Session loaded: ${loaded.id}`)
			log(`   Messages: ${loaded.messages.length}`)
		}

		// List all sessions
		log('📋 Listing sessions...')
		const allSessions = await persistence.all()
		log(`✅ Total sessions: ${allSessions.length}`)

		// Clean up
		await persistence.remove(testSession.id)
		log('🗑️ Test session removed')
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoVectorPersistence(): void {
	log('📦 VectorStore persistence factories available:')
	log('   • createIndexedDBVectorStorePersistence() - Browser IndexedDB')
	log('   • createOPFSVectorStorePersistence() - Origin Private File System')
	log('   • createHTTPVectorStorePersistence() - Remote HTTP API')
	log('✅ All factories exported and ready for use')
}

// ============================================================================
// Demo Functions - Bridges
// ============================================================================

function demoToolBridge(): void {
	log('📦 Creating tool call bridge...')
	try {
		// Create a mock tool registry
		const mockRegistry: ToolRegistryInterface = {
			getSchemas: () => [
				{
					name: 'get_weather',
					description: 'Get weather for a location',
					parameters: {
						type: 'object' as const,
						properties: {
							location: { type: 'string', description: 'City name' },
						},
						required: ['location'],
					},
				},
			],
			execute: (name: string, args: unknown) => {
				log(`   Tool executed: ${name}(${JSON.stringify(args)})`)
				return Promise.resolve({ temperature: 72, conditions: 'sunny' })
			},
			has: (name: string) => name === 'get_weather',
		}

		const bridge = createToolCallBridge({
			registry: mockRegistry,
			timeout: 30000,
			onBeforeExecute: (toolCall) => {
				log(`   🔧 Before: ${toolCall.name}`)
			},
			onAfterExecute: (toolCall, result) => {
				log(`   ✅ After: ${toolCall.name} → ${JSON.stringify(result)}`)
			},
			onError: (error, toolCall) => {
				log(`   ❌ Error in ${toolCall.name}: ${String(error)}`)
			},
		})
		log('✅ Tool call bridge created')

		// Test hasTool
		log(`   hasTool('get_weather'): ${bridge.hasTool('get_weather')}`)
		log(`   hasTool('unknown'): ${bridge.hasTool('unknown')}`)

		// Execute a tool call
		log('🔧 Executing tool call...')
		void bridge.execute({
			id: 'call_1',
			name: 'get_weather',
			arguments: { location: 'San Francisco' },
		}).then((result) => {
			log(`✅ Tool result: success=${result.success}, value=${JSON.stringify(result.value)}`)
		}).catch((error: unknown) => {
			log(`❌ Tool error: ${error instanceof Error ? error.message : String(error)}`)
		})
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoRetrievalTool(): void {
	log('📦 Creating retrieval tool...')
	try {
		// Create a mock vector store
		const mockVectorStore: VectorStoreInterface = {
			search: (query: string, options?: { topK?: number; minScore?: number }) => {
				log(`   Searching for: "${query}" (topK: ${options?.topK ?? 5})`)
				const results: SearchResult[] = [
					{ id: 'doc1', content: 'TypeScript is great', score: 0.95 },
					{ id: 'doc2', content: 'JavaScript runtime', score: 0.85 },
				]
				return Promise.resolve(results)
			},
		}

		const tool = createRetrievalTool({
			vectorStore: mockVectorStore,
			name: 'search_docs',
			description: 'Search documentation for relevant information',
			topK: 5,
			minScore: 0.7,
		})
		log('✅ Retrieval tool created')
		log(`   Tool name: ${tool.schema.name}`)
		log(`   Description: ${tool.schema.description}`)

		// Execute a search
		log('🔍 Executing search...')
		void tool.execute({ query: 'TypeScript' }).then((results) => {
			log(`✅ Found ${results.length} results`)
			results.forEach((r) => {
				log(`   • ${r.id}: ${r.content.substring(0, 30)}... (score: ${r.score.toFixed(2)})`)
			})
		}).catch((error: unknown) => {
			log(`❌ Search error: ${error instanceof Error ? error.message : String(error)}`)
		})
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// ============================================================================
// Initialize
// ============================================================================

render()
log('🚀 @mikesaintsg/adapters showcase loaded')
