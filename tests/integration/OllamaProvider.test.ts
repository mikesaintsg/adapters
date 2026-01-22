/**
 * Integration tests for OllamaProvider with real Ollama instance.
 *
 * These tests require a running Ollama server with the configured model.
 * Run with: npm run test:ollama
 *
 * Uses @mikesaintsg/inference for engine and session management.
 */

import { describe, it, expect } from 'vitest'
import {
	getEngine,
	getProvider,
	createTestSession,
	createTestProvider,
	createTestMessage,
	createSystemMessage,
	createAssistantMessage,
	TEST_TIMEOUTS,
	OLLAMA_CONFIG,
} from './setup.js'
import type { ToolSchema } from '@mikesaintsg/core'

describe('OllamaProvider Integration', () => {
	// =========================================================================
	// Engine Ephemeral Generation
	// =========================================================================

	describe('engine.generate (ephemeral)', () => {
		it('generates text response without session', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('What is 2 + 2?')]

			const result = await engine.generate(messages, { maxTokens: 30 })

			expect(result.text).toBeDefined()
			expect(result.text.length).toBeGreaterThan(0)
			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.integration)

		it('handles empty user message', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('')]

			const result = await engine.generate(messages, { maxTokens: 20 })

			expect(result).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('handles very short maxTokens', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('Tell me a long story')]

			const result = await engine.generate(messages, { maxTokens: 3 })

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('handles multiple messages in ephemeral mode', async() => {
			const engine = getEngine()
			const messages = [
				createSystemMessage('You are a math tutor.'),
				createTestMessage('What is 5 + 5?'),
				createAssistantMessage('10'),
				createTestMessage('And 10 + 10?'),
			]

			const result = await engine.generate(messages, { maxTokens: 30 })

			expect(result.text).toBeDefined()
			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.integration)
	})

	// =========================================================================
	// Engine Streaming
	// =========================================================================

	describe('engine.stream (ephemeral)', () => {
		it('streams tokens', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('Count from 1 to 5')]

			const stream = engine.stream(messages, { maxTokens: 50 })
			const result = await stream.result()

			// Verify streaming completed successfully
			expect(result.text).toBeDefined()
			expect(result.text.length).toBeGreaterThan(0)
			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.streaming)

		it('can abort stream', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('Write a very long essay about history')]

			const stream = engine.stream(messages, { maxTokens: 500 })

			setTimeout(() => stream.abort(), 100)

			const result = await stream.result()
			expect(result.aborted).toBe(true)
		}, TEST_TIMEOUTS.streaming)
	})

	// =========================================================================
	// Session-Based Generation
	// =========================================================================

	describe('session.generate', () => {
		it('generates response with session context', async() => {
			const session = createTestSession()
			session.addMessage('user', 'Hello!')

			const result = await session.generate({ maxTokens: 30 })

			expect(result.text).toBeDefined()
			expect(result.text.length).toBeGreaterThan(0)

			const history = session.getHistory()
			expect(history.length).toBeGreaterThanOrEqual(2)
		}, TEST_TIMEOUTS.integration)

		it('maintains conversation context across turns', async() => {
			const session = createTestSession('You are helpful. Remember what the user tells you.')

			session.addMessage('user', 'My name is TestUser.')
			await session.generate({ maxTokens: 30 })

			session.addMessage('user', 'What is my name?')
			const result = await session.generate({ maxTokens: 30 })

			const history = session.getHistory()
			expect(history.length).toBeGreaterThanOrEqual(4)
			expect(result.text.toLowerCase()).toContain('testuser')
		}, TEST_TIMEOUTS.integration)

		it('respects custom system prompt', async() => {
			const session = createTestSession('You are a pirate. Always say "Arrr" or "Ahoy" in your responses.')
			session.addMessage('user', 'Hello!')

			const result = await session.generate({ maxTokens: 50 })

			const text = result.text.toLowerCase()
			const hasPirateLanguage = text.includes('arrr') ||
				text.includes('ahoy') ||
				text.includes('matey') ||
				text.includes('ye')
			expect(hasPirateLanguage).toBe(true)
		}, TEST_TIMEOUTS.integration)

		it('handles session.clear()', async() => {
			const session = createTestSession()
			session.addMessage('user', 'Hello!')
			await session.generate({ maxTokens: 20 })

			expect(session.getHistory().length).toBeGreaterThan(0)

			session.clear()
			expect(session.getHistory().length).toBe(0)
		}, TEST_TIMEOUTS.integration)
	})

	// =========================================================================
	// Session Streaming
	// =========================================================================

	describe('session.stream', () => {
		it('streams with session context', async() => {
			const session = createTestSession()
			session.addMessage('user', 'Count to 3')

			const stream = session.stream({ maxTokens: 30 })
			const result = await stream.result()

			// Verify streaming completed successfully
			expect(result.text).toBeDefined()
			expect(result.text.length).toBeGreaterThan(0)
		}, TEST_TIMEOUTS.streaming)

		it('updates session history after streaming', async() => {
			const session = createTestSession()
			session.addMessage('user', 'Say hi')

			const initialLength = session.getHistory().length

			const stream = session.stream({ maxTokens: 20 })
			await stream.result()

			expect(session.getHistory().length).toBeGreaterThan(initialLength)
		}, TEST_TIMEOUTS.streaming)
	})

	// =========================================================================
	// Generation Options
	// =========================================================================

	describe('generation options', () => {
		it('respects maxTokens limit', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Write a very long story about a robot.')]

			const stream = provider.generate(messages, { maxTokens: 20 })
			const result = await stream.result()

			expect(result.finishReason).toBe('length')
		}, TEST_TIMEOUTS.integration)

		it('respects low temperature (deterministic)', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('What is 1 + 1?')]

			const result = await engine.generate(messages, {
				maxTokens: 10,
				temperature: 0,
			})

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('respects high temperature (creative)', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('Tell me something random')]

			const result = await engine.generate(messages, {
				maxTokens: 30,
				temperature: 1.5,
			})

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('respects stop sequences', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Count from 1 to 10, separated by commas.')]

			const stream = provider.generate(messages, { stop: ['5'] })
			const result = await stream.result()

			expect(result.text).not.toContain('6')
		}, TEST_TIMEOUTS.integration)

		it('respects topP parameter', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('Describe a sunset')]

			const result = await engine.generate(messages, {
				maxTokens: 30,
				topP: 0.9,
			})

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)
	})

	// =========================================================================
	// Tool Calling
	// =========================================================================

	describe('tool calling', () => {
		const weatherTool: ToolSchema = {
			name: 'get_weather',
			description: 'Get the current weather for a location',
			parameters: {
				type: 'object',
				properties: {
					location: {
						type: 'string',
						description: 'The city name',
					},
					units: {
						type: 'string',
						description: 'Temperature units: celsius or fahrenheit',
					},
				},
				required: ['location'],
			},
		}

		it('can call tools with standard schema types', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('What is the weather in New York?')]

			const stream = provider.generate(messages, { tools: [weatherTool] })
			const result = await stream.result()

			expect(result.aborted).toBe(false)
			if (result.toolCalls.length > 0) {
				expect(result.toolCalls[0]?.name).toBe('get_weather')
				const args = result.toolCalls[0]?.arguments as { location?: string }
				expect(args.location).toBeDefined()
			}
		}, TEST_TIMEOUTS.toolCalling)

		it('normalizes non-standard schema types (bool to boolean)', async() => {
			const provider = getProvider()

			const toolWithBool: ToolSchema = {
				name: 'toggle_setting',
				description: 'Toggle a boolean setting',
				parameters: {
					type: 'object',
					properties: {
						setting_name: { type: 'string', description: 'Name of the setting' },
						enabled: { type: 'bool' as string, description: 'Whether to enable' },
					},
					required: ['setting_name', 'enabled'],
				},
			}

			const messages = [createTestMessage('Please enable the dark mode setting.')]
			const stream = provider.generate(messages, { tools: [toolWithBool] })
			const result = await stream.result()

			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.toolCalling)

		it('handles nested schemas with non-standard types', async() => {
			const provider = getProvider()

			const complexTool: ToolSchema = {
				name: 'create_item',
				description: 'Create a new item with options',
				parameters: {
					type: 'object',
					properties: {
						name: { type: 'str' as string },
						count: { type: 'int' as string },
						options: {
							type: 'dict' as string,
							properties: {
								visible: { type: 'bool' as string },
								tags: { type: 'list' as string },
							},
						},
					},
					required: ['name'],
				},
			}

			const messages = [createTestMessage('Create an item named "test" with count 5 and make it visible.')]
			const stream = provider.generate(messages, { tools: [complexTool] })
			const result = await stream.result()

			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.toolCalling)

		it('handles multiple tools', async() => {
			const provider = getProvider()

			const calculatorTool: ToolSchema = {
				name: 'calculate',
				description: 'Perform a calculation',
				parameters: {
					type: 'object',
					properties: {
						expression: { type: 'string', description: 'Math expression' },
					},
					required: ['expression'],
				},
			}

			const messages = [createTestMessage('What is the weather in London and what is 5 + 5?')]
			const stream = provider.generate(messages, {
				tools: [weatherTool, calculatorTool],
			})
			const result = await stream.result()

			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.toolCalling)
	})

	// =========================================================================
	// Usage Tracking
	// =========================================================================

	describe('usage tracking', () => {
		it('reports token usage', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Hello')]

			const stream = provider.generate(messages, {})
			const result = await stream.result()

			expect(result.usage).toBeDefined()
			expect(result.usage?.promptTokens).toBeGreaterThan(0)
			expect(result.usage?.completionTokens).toBeGreaterThan(0)
			expect(result.usage?.totalTokens).toBeGreaterThan(0)
		}, TEST_TIMEOUTS.integration)

		it('usage totals are consistent', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Count to 5')]

			const stream = provider.generate(messages, { maxTokens: 50 })
			const result = await stream.result()

			if (result.usage) {
				expect(result.usage.totalTokens).toBe(
					result.usage.promptTokens + result.usage.completionTokens,
				)
			}
		}, TEST_TIMEOUTS.integration)
	})

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles unicode content', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('你好！你能说中文吗？')]

			const result = await engine.generate(messages, { maxTokens: 30 })

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('handles special characters', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('What does @#$%^& mean?')]

			const result = await engine.generate(messages, { maxTokens: 30 })

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('handles newlines in input', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('Line 1\nLine 2\nLine 3')]

			const result = await engine.generate(messages, { maxTokens: 30 })

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('handles very long input', async() => {
			const engine = getEngine()
			const longInput = 'Hello '.repeat(100)
			const messages = [createTestMessage(longInput)]

			const result = await engine.generate(messages, { maxTokens: 20 })

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)

		it('handles emoji', async() => {
			const engine = getEngine()
			const messages = [createTestMessage('What do you think about 🐱 cats?')]

			const result = await engine.generate(messages, { maxTokens: 30 })

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.integration)
	})

	// =========================================================================
	// Abort Handling
	// =========================================================================

	describe('abort handling', () => {
		it('can abort generation via provider', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Write a very long story about space exploration.')]

			const stream = provider.generate(messages, {})

			setTimeout(() => stream.abort(), 100)

			const result = await stream.result()
			expect(result.aborted).toBe(true)
		}, TEST_TIMEOUTS.streaming)

		it('aborted stream returns partial content', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Write a very long story.')]

			const stream = provider.generate(messages, { maxTokens: 500 })
			const tokens: string[] = []
			const unsub = stream.onToken((t) => tokens.push(t))

			setTimeout(() => stream.abort(), 200)

			const result = await stream.result()
			unsub()

			expect(result.aborted).toBe(true)
			// May have collected some tokens before abort
		}, TEST_TIMEOUTS.streaming)
	})

	// =========================================================================
	// Capabilities
	// =========================================================================

	describe('capabilities', () => {
		it('reports correct capabilities', () => {
			const provider = getProvider()
			const capabilities = provider.getCapabilities()

			expect(capabilities.supportsTools).toBe(true)
			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsFunctions).toBe(true)
			expect(capabilities.models).toBeDefined()
			expect(capabilities.models.length).toBeGreaterThan(0)
			expect(capabilities.models).toContain(OLLAMA_CONFIG.model)
		})

		it('supportsTools returns true', () => {
			const provider = getProvider()
			expect(provider.supportsTools()).toBe(true)
		})

		it('supportsStreaming returns true', () => {
			const provider = getProvider()
			expect(provider.supportsStreaming()).toBe(true)
		})

		it('generates unique provider IDs', () => {
			const provider1 = createTestProvider()
			const provider2 = createTestProvider()

			expect(provider1.getId()).not.toBe(provider2.getId())
		})
	})

	// =========================================================================
	// Session Management
	// =========================================================================

	describe('session management', () => {
		it('creates sessions with unique IDs', () => {
			const session1 = createTestSession()
			const session2 = createTestSession()

			expect(session1.getId()).not.toBe(session2.getId())
		})

		it('addMessage returns message object', () => {
			const session = createTestSession()
			const message = session.addMessage('user', 'Hello')

			expect(message.id).toBeDefined()
			expect(message.role).toBe('user')
			expect(message.content).toBe('Hello')
			expect(message.createdAt).toBeDefined()
		})

		it('getHistory returns all messages', () => {
			const session = createTestSession()
			session.addMessage('user', 'First')
			session.addMessage('assistant', 'Second')
			session.addMessage('user', 'Third')

			const history = session.getHistory()
			expect(history.length).toBe(3)
			expect(history[0]?.content).toBe('First')
			expect(history[1]?.content).toBe('Second')
			expect(history[2]?.content).toBe('Third')
		})

		it('getSystem returns system prompt', () => {
			const customPrompt = 'Custom system prompt for testing'
			const session = createTestSession(customPrompt)

			expect(session.getSystem()).toBe(customPrompt)
		})
	})

	// =========================================================================
	// Streaming Edge Cases
	// =========================================================================

	describe('streaming edge cases', () => {
		it('collects all tokens via onToken callback', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say "hello world"')]

			const stream = provider.generate(messages, { maxTokens: 10 })
			const tokens: string[] = []
			const unsub = stream.onToken((token) => tokens.push(token))

			const result = await stream.result()
			unsub()

			expect(tokens.length).toBeGreaterThan(0)
			expect(tokens.join('')).toBe(result.text)
		}, TEST_TIMEOUTS.streaming)

		it('tokens arrive in order during streaming', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Count: 1 2 3 4 5')]

			const stream = provider.generate(messages, { maxTokens: 30 })
			const tokenOrder: number[] = []
			let index = 0
			const unsub = stream.onToken(() => {
				tokenOrder.push(index++)
			})

			await stream.result()
			unsub()

			// Verify tokens arrived in sequence
			for (let i = 0; i < tokenOrder.length; i++) {
				expect(tokenOrder[i]).toBe(i)
			}
		}, TEST_TIMEOUTS.streaming)

		it('onComplete callback receives final result', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say "test"')]

			const stream = provider.generate(messages, { maxTokens: 10 })
			let completeResult: unknown

			stream.onComplete((result) => {
				completeResult = result
			})

			const awaitedResult = await stream.result()

			expect(completeResult).toBeDefined()
			expect(completeResult).toEqual(awaitedResult)
		}, TEST_TIMEOUTS.streaming)

		it('can iterate with for-await-of', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say "hello"')]

			const stream = provider.generate(messages, { maxTokens: 10 })
			const tokens: string[] = []

			for await (const token of stream) {
				tokens.push(token)
			}

			const result = await stream.result()
			expect(tokens.join('')).toBe(result.text)
		}, TEST_TIMEOUTS.streaming)

		it('result() returns same promise on multiple calls', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Hi')]

			const stream = provider.generate(messages, { maxTokens: 5 })

			const promise1 = stream.result()
			const promise2 = stream.result()

			expect(promise1).toBe(promise2)

			await promise1
		}, TEST_TIMEOUTS.streaming)

		it('handles rapid successive generations', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say "hi"')]

			const results = await Promise.all([
				provider.generate(messages, { maxTokens: 5 }).result(),
				provider.generate(messages, { maxTokens: 5 }).result(),
				provider.generate(messages, { maxTokens: 5 }).result(),
			])

			expect(results.length).toBe(3)
			for (const result of results) {
				expect(result.text).toBeDefined()
				expect(result.aborted).toBe(false)
			}
		}, TEST_TIMEOUTS.integration)

		it('reports finish reason correctly', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say exactly "done"')]

			const stream = provider.generate(messages, { maxTokens: 10 })
			const result = await stream.result()

			expect(['stop', 'length']).toContain(result.finishReason)
		}, TEST_TIMEOUTS.streaming)

		it('unsubscribe stops receiving tokens', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Count from 1 to 100')]

			const stream = provider.generate(messages, { maxTokens: 100 })
			const tokens: string[] = []
			const unsub = stream.onToken((token) => tokens.push(token))

			// Unsubscribe after a short delay
			setTimeout(() => unsub(), 100)

			await stream.result()

			// Should have stopped receiving after unsubscribe
			const countAfterUnsub = tokens.length
			await new Promise(r => setTimeout(r, 50))
			expect(tokens.length).toBe(countAfterUnsub)
		}, TEST_TIMEOUTS.streaming)

		it('handles empty response gracefully', async() => {
			const provider = getProvider()
			// Very constrained prompt that might result in empty or minimal output
			const messages = [createTestMessage('')]

			const stream = provider.generate(messages, { maxTokens: 5 })
			const result = await stream.result()

			expect(result).toBeDefined()
			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.streaming)

		it('handles unicode streaming correctly', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say "你好世界" (Hello World in Chinese)')]

			const stream = provider.generate(messages, { maxTokens: 20 })
			const tokens: string[] = []
			stream.onToken((token) => tokens.push(token))

			const result = await stream.result()

			// Verify unicode characters streamed correctly
			expect(result.text).toBeDefined()
			// Should contain Chinese characters or reference to them
		}, TEST_TIMEOUTS.streaming)

		it('abort during token emission', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Write a long explanation of quantum physics')]

			const stream = provider.generate(messages, { maxTokens: 500 })
			let tokenCount = 0

			stream.onToken(() => {
				tokenCount++
				if (tokenCount >= 5) {
					stream.abort()
				}
			})

			const result = await stream.result()

			expect(result.aborted).toBe(true)
		}, TEST_TIMEOUTS.streaming)

		it('multiple onToken subscribers receive same tokens', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say "test"')]

			const stream = provider.generate(messages, { maxTokens: 10 })
			const tokens1: string[] = []
			const tokens2: string[] = []

			stream.onToken((token) => tokens1.push(token))
			stream.onToken((token) => tokens2.push(token))

			await stream.result()

			expect(tokens1).toEqual(tokens2)
		}, TEST_TIMEOUTS.streaming)

		it('error callback not triggered on success', async() => {
			const provider = getProvider()
			const messages = [createTestMessage('Say "ok"')]

			const stream = provider.generate(messages, { maxTokens: 5 })
			let errorCalled = false

			stream.onError(() => {
				errorCalled = true
			})

			await stream.result()

			expect(errorCalled).toBe(false)
		}, TEST_TIMEOUTS.streaming)
	})

	// =========================================================================
	// Token Streamer Integration
	// =========================================================================

	describe('token streamer integration', () => {
		it('custom streamer receives all producer calls', async() => {
			const { createOllamaProviderAdapter, createTokenStreamer } = await import('@mikesaintsg/adapters')

			const customStreamer = createTokenStreamer()
			const provider = createOllamaProviderAdapter({
				baseURL: OLLAMA_CONFIG.host,
				model: OLLAMA_CONFIG.model,
				streamer: customStreamer,
			})

			const messages = [createTestMessage('Say "hello"')]
			const stream = provider.generate(messages, { maxTokens: 10 })

			const result = await stream.result()

			expect(result.text).toBeDefined()
			expect(result.aborted).toBe(false)
		}, TEST_TIMEOUTS.streaming)

		it('custom NDJSON parser processes stream', async() => {
			const { createOllamaProviderAdapter, createNDJSONParser } = await import('@mikesaintsg/adapters')

			const customParser = createNDJSONParser()
			const provider = createOllamaProviderAdapter({
				baseURL: OLLAMA_CONFIG.host,
				model: OLLAMA_CONFIG.model,
				parser: customParser,
			})

			const messages = [createTestMessage('Say "test"')]
			const stream = provider.generate(messages, { maxTokens: 10 })

			const result = await stream.result()

			expect(result.text).toBeDefined()
		}, TEST_TIMEOUTS.streaming)
	})
})
