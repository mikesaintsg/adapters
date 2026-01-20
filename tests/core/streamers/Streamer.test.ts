/**
 * Streamer Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import { createStreamerAdapter } from '@mikesaintsg/adapters'

describe('Streamer', () => {
	describe('createStreamerAdapter', () => {
		it('creates a streamer adapter', () => {
			const streamer = createStreamerAdapter()
			expect(streamer).toBeDefined()
			expect(typeof streamer.onToken).toBe('function')
			expect(typeof streamer.emit).toBe('function')
			expect(typeof streamer.end).toBe('function')
		})
	})

	describe('onToken', () => {
		it('subscribes to token events', () => {
			const streamer = createStreamerAdapter()
			const tokens: string[] = []

			streamer.onToken((token) => tokens.push(token))
			streamer.emit('Hello')
			streamer.emit(' world')

			expect(tokens).toEqual(['Hello', ' world'])
		})

		it('supports multiple subscribers', () => {
			const streamer = createStreamerAdapter()
			const tokens1: string[] = []
			const tokens2: string[] = []

			streamer.onToken((token) => tokens1.push(token))
			streamer.onToken((token) => tokens2.push(token))
			streamer.emit('test')

			expect(tokens1).toEqual(['test'])
			expect(tokens2).toEqual(['test'])
		})

		it('returns unsubscribe function', () => {
			const streamer = createStreamerAdapter()
			const tokens: string[] = []

			const unsub = streamer.onToken((token) => tokens.push(token))
			streamer.emit('Hello')
			unsub()
			streamer.emit(' world')

			expect(tokens).toEqual(['Hello'])
		})
	})

	describe('emit', () => {
		it('emits tokens to all subscribers', () => {
			const streamer = createStreamerAdapter()
			const results: string[] = []

			streamer.onToken((t) => results.push(`a:${t}`))
			streamer.onToken((t) => results.push(`b:${t}`))
			streamer.emit('x')

			expect(results).toContain('a:x')
			expect(results).toContain('b:x')
		})

		it('does not emit after end', () => {
			const streamer = createStreamerAdapter()
			const tokens: string[] = []

			streamer.onToken((token) => tokens.push(token))
			streamer.emit('before')
			streamer.end()
			streamer.emit('after')

			expect(tokens).toEqual(['before'])
		})
	})

	describe('end', () => {
		it('clears listeners', () => {
			const streamer = createStreamerAdapter()
			const tokens: string[] = []

			streamer.onToken((token) => tokens.push(token))
			streamer.emit('before')
			streamer.end()

			// Re-subscribe after end should still work but emit won't fire
			streamer.onToken((token) => tokens.push(`new:${token}`))
			streamer.emit('after')

			expect(tokens).toEqual(['before'])
		})
	})
})
