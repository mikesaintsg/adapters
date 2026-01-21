/**
 * Console telemetry adapter implementation.
 * Implements TelemetryAdapterInterface for logging to console.
 */

import type {
	TelemetryAdapterInterface,
	TelemetrySpan,
	LogLevel,
} from '@mikesaintsg/core'

import type { ConsoleTelemetryAdapterOptions } from '../../types.js'
import {
	DEFAULT_TELEMETRY_LOG_LEVEL,
	DEFAULT_TELEMETRY_PREFIX,
	LOG_LEVEL_PRIORITY,
} from '../../constants.js'

/**
 * Console telemetry adapter for logging to console.
 */
export class ConsoleTelemetry implements TelemetryAdapterInterface {
	readonly #level: LogLevel
	readonly #prefix: string
	readonly #includeTimestamp: boolean
	readonly #includeSpanId: boolean
	readonly #spans = new Map<string, { name: string; startTime: number; attributes: Record<string, unknown> }>()

	constructor(options: ConsoleTelemetryAdapterOptions = {}) {
		this.#level = options.level ?? DEFAULT_TELEMETRY_LOG_LEVEL as LogLevel
		this.#prefix = options.prefix ?? DEFAULT_TELEMETRY_PREFIX
		this.#includeTimestamp = options.includeTimestamp ?? true
		this.#includeSpanId = options.includeSpanId ?? true
	}

	startSpan(name: string, attributes?: Readonly<Record<string, unknown>>): TelemetrySpan {
		const spanId = crypto.randomUUID()
		const traceId = crypto.randomUUID()
		const startTime = Date.now()

		this.#spans.set(spanId, {
			name,
			startTime,
			attributes: attributes ? { ...attributes } : {},
		})

		if (this.#includeSpanId) {
			this.#log('debug', `Span started: ${name}`, { spanId, ...attributes })
		} else {
			this.#log('debug', `Span started: ${name}`, attributes)
		}

		return {
			id: spanId,
			traceId,
			name,
			startTime,
			attributes: attributes ?? {},
			status: 'ok',
		}
	}

	endSpan(span: TelemetrySpan, status?: 'ok' | 'error'): void {
		const storedSpan = this.#spans.get(span.id)
		if (storedSpan) {
			const duration = Date.now() - storedSpan.startTime
			this.#log('debug', `Span ended: ${storedSpan.name}`, {
				spanId: span.id,
				duration: `${duration}ms`,
				status: status ?? 'ok',
				attributes: storedSpan.attributes,
			})
			this.#spans.delete(span.id)
		}
	}

	log(level: LogLevel, message: string, attributes?: Readonly<Record<string, unknown>>): void {
		this.#log(level, message, attributes)
	}

	recordMetric(name: string, value: number, attributes?: Readonly<Record<string, unknown>>): void {
		this.#log('debug', `Metric: ${name} = ${value}`, attributes)
	}

	async flush(): Promise<void> {
		// Console telemetry has no buffer to flush
		// This is a no-op
	}

	#log(level: LogLevel, message: string, context?: Readonly<Record<string, unknown>>): void {
		// Check if level should be logged
		if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[this.#level]) {
			return
		}

		const parts: string[] = []

		if (this.#includeTimestamp) {
			parts.push(`[${new Date().toISOString()}]`)
		}

		parts.push(this.#prefix)
		parts.push(`[${level.toUpperCase()}]`)
		parts.push(message)

		const logMessage = parts.join(' ')

		switch (level) {
			case 'error':
				if (context) {
					// eslint-disable-next-line no-console
					console.error(logMessage, context)
				} else {
					// eslint-disable-next-line no-console
					console.error(logMessage)
				}
				break
			case 'warn':
				if (context) {
					// eslint-disable-next-line no-console
					console.warn(logMessage, context)
				} else {
					// eslint-disable-next-line no-console
					console.warn(logMessage)
				}
				break
			case 'info':
				if (context) {
					// eslint-disable-next-line no-console
					console.info(logMessage, context)
				} else {
					// eslint-disable-next-line no-console
					console.info(logMessage)
				}
				break
			case 'debug':
				if (context) {
					// eslint-disable-next-line no-console
					console.debug(logMessage, context)
				} else {
					// eslint-disable-next-line no-console
					console.debug(logMessage)
				}
				break
		}
	}
}
