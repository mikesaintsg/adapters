/**
 * Tests for NoOpTelemetry adapter.
 */

import { describe, it, expect } from 'vitest'

import {
	createNoOpTelemetryAdapter,
} from '@mikesaintsg/adapters'

describe('NoOpTelemetry', () => {
	describe('createNoOpTelemetryAdapter', () => {
		it('returns a TelemetryAdapterInterface', () => {
			const telemetry = createNoOpTelemetryAdapter()
			expect(telemetry).toBeDefined()
			expect(typeof telemetry.startSpan).toBe('function')
			expect(typeof telemetry.endSpan).toBe('function')
			expect(typeof telemetry.log).toBe('function')
			expect(typeof telemetry.recordMetric).toBe('function')
			expect(typeof telemetry.flush).toBe('function')
		})
	})

	describe('startSpan', () => {
		it('returns a TelemetrySpan', () => {
			const telemetry = createNoOpTelemetryAdapter()
			const span = telemetry.startSpan('test-span')

			expect(span).toHaveProperty('id')
			expect(span).toHaveProperty('traceId')
			expect(span).toHaveProperty('name')
			expect(span).toHaveProperty('startTime')
			expect(span).toHaveProperty('attributes')
			expect(span).toHaveProperty('status')
		})

		it('returns same span for all calls', () => {
			const telemetry = createNoOpTelemetryAdapter()
			const span1 = telemetry.startSpan('test1')
			const span2 = telemetry.startSpan('test2')
			expect(span1).toBe(span2)
		})

		it('ignores name parameter', () => {
			const telemetry = createNoOpTelemetryAdapter()
			const span = telemetry.startSpan('my-operation')
			expect(span.name).toBe('')
		})

		it('ignores attributes parameter', () => {
			const telemetry = createNoOpTelemetryAdapter()
			const span = telemetry.startSpan('test', { key: 'value' })
			expect(span.attributes).toEqual({})
		})
	})

	describe('endSpan', () => {
		it('does nothing and does not throw', () => {
			const telemetry = createNoOpTelemetryAdapter()
			const span = telemetry.startSpan('test')
			expect(() => telemetry.endSpan(span)).not.toThrow()
		})

		it('accepts status parameter without throwing', () => {
			const telemetry = createNoOpTelemetryAdapter()
			const span = telemetry.startSpan('test')
			expect(() => telemetry.endSpan(span, 'ok')).not.toThrow()
			expect(() => telemetry.endSpan(span, 'error')).not.toThrow()
		})
	})

	describe('log', () => {
		it('does nothing and does not throw', () => {
			const telemetry = createNoOpTelemetryAdapter()
			expect(() => telemetry.log('error', 'test message')).not.toThrow()
			expect(() => telemetry.log('warn', 'test message')).not.toThrow()
			expect(() => telemetry.log('info', 'test message')).not.toThrow()
			expect(() => telemetry.log('debug', 'test message')).not.toThrow()
		})

		it('accepts attributes without throwing', () => {
			const telemetry = createNoOpTelemetryAdapter()
			expect(() => telemetry.log('info', 'test', { key: 'value' })).not.toThrow()
		})
	})

	describe('recordMetric', () => {
		it('does nothing and does not throw', () => {
			const telemetry = createNoOpTelemetryAdapter()
			expect(() => telemetry.recordMetric('my_metric', 42)).not.toThrow()
		})

		it('accepts attributes without throwing', () => {
			const telemetry = createNoOpTelemetryAdapter()
			expect(() => telemetry.recordMetric('my_metric', 42, { label: 'test' })).not.toThrow()
		})
	})

	describe('flush', () => {
		it('returns a resolved promise', async() => {
			const telemetry = createNoOpTelemetryAdapter()
			await expect(telemetry.flush()).resolves.toBeUndefined()
		})
	})

	describe('options', () => {
		it('accepts options without throwing', () => {
			expect(() => createNoOpTelemetryAdapter({})).not.toThrow()
			expect(() => createNoOpTelemetryAdapter({ enabled: true })).not.toThrow()
			expect(() => createNoOpTelemetryAdapter({ enabled: false })).not.toThrow()
		})
	})
})
