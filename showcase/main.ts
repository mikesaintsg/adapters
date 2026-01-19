import './styles.css'
import {
	// Embeddings
	createOpenAIEmbeddingAdapter,
	createVoyageEmbeddingAdapter,
	createOllamaEmbeddingAdapter,
	// Providers
	createOpenAIProviderAdapter,
	createAnthropicProviderAdapter,
	createOllamaProviderAdapter,
	// Streamer
	createStreamerAdapter,
	// Errors
	isAdapterError,
	createAdapterError,
	// Constants
	DEFAULT_OPENAI_MODEL,
	DEFAULT_ANTHROPIC_MODEL,
} from '../src/index.js'

/**
 * @mikesaintsg/adapters Showcase
 *
 * Interactive demo of all adapters package capabilities.
 * Note: All factories currently throw "Not implemented" as the package is being refactored.
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
    <p class="notice">🚧 Package is being refactored - factories throw "Not implemented"</p>
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

        <div class="demo-card">
          <h3>Streamer Adapter</h3>
          <p>Token emission for streaming responses</p>
          <button id="demo-streamer" class="btn btn-primary">Test Factory</button>
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
        Error handling and type guards for adapters.
      </p>

      <div class="demo-grid">
        <div class="demo-card">
          <h3>Adapter Errors</h3>
          <p>Typed errors with provider codes and retry info</p>
          <button id="demo-errors" class="btn btn-primary">Test Error Handling</button>
        </div>

        <div class="demo-card">
          <h3>Constants</h3>
          <p>Default values for all adapters</p>
          <button id="demo-constants" class="btn btn-primary">View Constants</button>
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

	// Demo buttons - Providers
	document.getElementById('demo-openai-provider')?.addEventListener('click', demoOpenAIProvider)
	document.getElementById('demo-anthropic-provider')?.addEventListener('click', demoAnthropicProvider)
	document.getElementById('demo-ollama-provider')?.addEventListener('click', demoOllamaProvider)
	document.getElementById('demo-streamer')?.addEventListener('click', demoStreamer)

	// Demo buttons - Helpers
	document.getElementById('demo-errors')?.addEventListener('click', demoErrors)
	document.getElementById('demo-constants')?.addEventListener('click', demoConstants)
}

// ============================================================================
// Demo Functions - Embeddings
// ============================================================================

function demoOpenAIEmbedding(): void {
	log('📦 Creating OpenAI embedding adapter...')
	try {
		createOpenAIEmbeddingAdapter({
			apiKey: 'demo-api-key',
			model: 'text-embedding-3-small',
			dimensions: 1536,
		})
		log('✅ OpenAI embedding adapter created successfully')
	} catch (error) {
		log(`⚠️ Expected: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoVoyageEmbedding(): void {
	log('📦 Creating Voyage embedding adapter...')
	try {
		createVoyageEmbeddingAdapter({
			apiKey: 'demo-api-key',
			model: 'voyage-3',
			inputType: 'document',
		})
		log('✅ Voyage embedding adapter created successfully')
	} catch (error) {
		log(`⚠️ Expected: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoOllamaEmbedding(): void {
	log('📦 Creating Ollama embedding adapter...')
	try {
		createOllamaEmbeddingAdapter({
			model: 'nomic-embed-text',
			baseURL: 'http://localhost:11434',
			timeout: 30000,
		})
		log('✅ Ollama embedding adapter created successfully')
	} catch (error) {
		log(`⚠️ Expected: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// ============================================================================
// Demo Functions - Providers
// ============================================================================

function demoOpenAIProvider(): void {
	log('📦 Creating OpenAI provider adapter...')
	try {
		createOpenAIProviderAdapter({
			apiKey: 'demo-api-key',
			model: 'gpt-4o',
			defaultOptions: {
				temperature: 0.7,
				maxTokens: 1000,
			},
		})
		log('✅ OpenAI provider adapter created successfully')
	} catch (error) {
		log(`⚠️ Expected: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoAnthropicProvider(): void {
	log('📦 Creating Anthropic provider adapter...')
	try {
		createAnthropicProviderAdapter({
			apiKey: 'demo-api-key',
			model: 'claude-3-5-sonnet-20241022',
		})
		log('✅ Anthropic provider adapter created successfully')
	} catch (error) {
		log(`⚠️ Expected: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoOllamaProvider(): void {
	log('📦 Creating Ollama provider adapter...')
	try {
		createOllamaProviderAdapter({
			model: 'llama3',
			baseURL: 'http://localhost:11434',
			keepAlive: true,
			timeout: 120000,
		})
		log('✅ Ollama provider adapter created successfully')
	} catch (error) {
		log(`⚠️ Expected: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoStreamer(): void {
	log('📦 Creating streamer adapter...')
	try {
		createStreamerAdapter()
		log('✅ Streamer adapter created successfully')
	} catch (error) {
		log(`⚠️ Expected: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// ============================================================================
// Demo Functions - Helpers
// ============================================================================

function demoErrors(): void {
	log('📦 Demonstrating error handling...')
	try {
		// Create various error types
		const authError = createAdapterError(
			'AUTHENTICATION_ERROR',
			'Invalid API key',
			{ providerCode: '401' },
		)
		log(`✅ Auth error created: ${authError.data.code}`)
		log(`   Message: ${authError.message}`)
		log(`   Provider code: ${authError.data.providerCode}`)

		const rateLimitError = createAdapterError(
			'RATE_LIMIT_ERROR',
			'Too many requests',
			{ retryAfter: 5000, providerCode: '429' },
		)
		log(`✅ Rate limit error created: ${rateLimitError.data.code}`)
		log(`   Retry after: ${rateLimitError.data.retryAfter}ms`)

		// Test type guard
		log(`   isAdapterError(authError): ${isAdapterError(authError)}`)
		log(`   isAdapterError(new Error()): ${isAdapterError(new Error())}`)
	} catch (error) {
		log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function demoConstants(): void {
	log('📦 Default constants:')
	log(`   DEFAULT_OPENAI_MODEL: ${DEFAULT_OPENAI_MODEL}`)
	log(`   DEFAULT_ANTHROPIC_MODEL: ${DEFAULT_ANTHROPIC_MODEL}`)
	log('✅ All constants exported and available')
}

// ============================================================================
// Initialize
// ============================================================================

render()
log('🚀 @mikesaintsg/adapters showcase loaded')
log('🚧 Package is being refactored - factories throw "Not implemented"')
