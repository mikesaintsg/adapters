/**
 * Tests for ConsoleTelemetry adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
	createConsoleTelemetryAdapter,
} from '@mikesaintsg/adapters'

describe('ConsoleTelemetry', () => {
	describe('createConsoleTelemetryAdapter', () => {
		it('returns a TelemetryAdapterInterface', () => {
			const telemetry = createConsoleTelemetryAdapter()
			expect(telemetry).toBeDefined()
			expect(typeof telemetry.startSpan).toBe('function')
			expect(typeof telemetry.endSpan).toBe('function')
			expect(typeof telemetry.log).toBe('function')
			expect(typeof telemetry.recordMetric).toBe('function')
			expect(typeof telemetry.flush).toBe('function')
		})
	})

	describe('startSpan', () => {
		it('returns a TelemetrySpan with all required fields', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span = telemetry.startSpan('test-span')

			expect(span).toHaveProperty('id')
			expect(span).toHaveProperty('traceId')
			expect(span).toHaveProperty('name')
			expect(span).toHaveProperty('startTime')
			expect(span).toHaveProperty('attributes')
			expect(span).toHaveProperty('status')
		})

		it('sets span name correctly', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span = telemetry.startSpan('my-operation')
			expect(span.name).toBe('my-operation')
		})

		it('sets span attributes', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span = telemetry.startSpan('test', { key: 'value', num: 42 })
			expect(span.attributes).toEqual({ key: 'value', num: 42 })
		})

		it('generates unique span IDs', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span1 = telemetry.startSpan('test1')
			const span2 = telemetry.startSpan('test2')
			expect(span1.id).not.toBe(span2.id)
		})

		it('generates unique trace IDs', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span1 = telemetry.startSpan('test1')
			const span2 = telemetry.startSpan('test2')
			expect(span1.traceId).not.toBe(span2.traceId)
		})

		it('sets startTime to current time', () => {
			const before = Date.now()
			const telemetry = createConsoleTelemetryAdapter()
			const span = telemetry.startSpan('test')
			const after = Date.now()

			expect(span.startTime).toBeGreaterThanOrEqual(before)
			expect(span.startTime).toBeLessThanOrEqual(after)
		})

		it('sets default status to ok', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span = telemetry.startSpan('test')
			expect(span.status).toBe('ok')
		})
	})

	describe('endSpan', () => {
		it('does not throw', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span = telemetry.startSpan('test')
			expect(() => telemetry.endSpan(span)).not.toThrow()
		})

		it('accepts status parameter', () => {
			const telemetry = createConsoleTelemetryAdapter()
			const span = telemetry.startSpan('test')
			expect(() => telemetry.endSpan(span, 'ok')).not.toThrow()
			expect(() => telemetry.endSpan(span, 'error')).not.toThrow()
		})
	})

	describe('log', () => {
		let consoleSpy: { error: ReturnType<typeof vi.spyOn>; warn: ReturnType<typeof vi.spyOn>; info: ReturnType<typeof vi.spyOn>; debug: ReturnType<typeof vi.spyOn> }

		beforeEach(() => {
			consoleSpy = {
				error: vi.spyOn(console, 'error').mockImplementation(() => {}),
				warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
				info: vi.spyOn(console, 'info').mockImplementation(() => {}),
				debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
			}
		})

		afterEach(() => {
			vi.restoreAllMocks()
		})

		it('logs error level to console.error', () => {
			const telemetry = createConsoleTelemetryAdapter({ level: 'error' })
			telemetry.log('error', 'test message')
			expect(consoleSpy.error).toHaveBeenCalled()
		})

		it('logs warn level to console.warn', () => {
			const telemetry = createConsoleTelemetryAdapter({ level: 'warn' })
			telemetry.log('warn', 'test message')
			expect(consoleSpy.warn).toHaveBeenCalled()
		})

		it('logs info level to console.info', () => {
			const telemetry = createConsoleTelemetryAdapter({ level: 'info' })
			telemetry.log('info', 'test message')
			expect(consoleSpy.info).toHaveBeenCalled()
		})

		it('logs debug level to console.debug', () => {
			const telemetry = createConsoleTelemetryAdapter({ level: 'debug' })
			telemetry.log('debug', 'test message')
			expect(consoleSpy.debug).toHaveBeenCalled()
		})

		it('filters logs below configured level', () => {
			const telemetry = createConsoleTelemetryAdapter({ level: 'warn' })
			telemetry.log('info', 'test message')
			expect(consoleSpy.info).not.toHaveBeenCalled()
		})

		it('includes prefix in log message', () => {
			const telemetry = createConsoleTelemetryAdapter({
				level: 'info',
				prefix: '[test-prefix]',
				includeTimestamp: false,
			})
			telemetry.log('info', 'test message')
			expect(consoleSpy.info).toHaveBeenCalled()
			const call = consoleSpy.info.mock.calls[0]
			if (call !== undefined) {
				expect(call[0]).toContain('[test-prefix]')
			}
		})

		it('includes timestamp when enabled', () => {
			const telemetry = createConsoleTelemetryAdapter({
				level: 'info',
				includeTimestamp: true,
			})
			telemetry.log('info', 'test message')
			expect(consoleSpy.info).toHaveBeenCalled()
			const call = consoleSpy.info.mock.calls[0]
			if (call !== undefined) {
				// Should contain ISO date format brackets
				expect(call[0]).toMatch(/\[\d{4}-\d{2}-\d{2}/)
			}
		})

		it('passes context as second argument', () => {
			const telemetry = createConsoleTelemetryAdapter({ level: 'info', includeTimestamp: false })
			telemetry.log('info', 'test message', { key: 'value' })
			expect(consoleSpy.info).toHaveBeenCalledWith(
				expect.any(String),
				{ key: 'value' },
			)
		})
	})

	describe('recordMetric', () => {
		it('does not throw', () => {
			const telemetry = createConsoleTelemetryAdapter()
			expect(() => telemetry.recordMetric('my_metric', 42)).not.toThrow()
		})

		it('accepts attributes', () => {
			const telemetry = createConsoleTelemetryAdapter()
			expect(() => telemetry.recordMetric('my_metric', 42, { label: 'test' })).not.toThrow()
		})
	})

	describe('flush', () => {
		it('returns a resolved promise', async() => {
			const telemetry = createConsoleTelemetryAdapter()
			await expect(telemetry.flush()).resolves.toBeUndefined()
		})
	})

	describe('options', () => {
		it('uses default level when not specified', () => {
			const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
			const telemetry = createConsoleTelemetryAdapter()
			telemetry.log('info', 'test')
			expect(spy).toHaveBeenCalled()
			spy.mockRestore()
		})

		it('uses default prefix when not specified', () => {
			const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
			const telemetry = createConsoleTelemetryAdapter({ includeTimestamp: false })
			telemetry.log('info', 'test')
			const call = spy.mock.calls[0]
			if (call !== undefined) {
				expect(call[0]).toContain('[adapters]')
			}
			spy.mockRestore()
		})
	})
})
