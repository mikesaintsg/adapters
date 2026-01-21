/**
 * No-op telemetry adapter implementation.
 * Implements TelemetryAdapterInterface with no actual logging.
 * Useful for production where telemetry should be disabled for performance.
 */

import type {
	TelemetryAdapterInterface,
	TelemetrySpan,
	LogLevel,
} from '@mikesaintsg/core'

import type { NoOpTelemetryAdapterOptions } from '../../types.js'

/** Shared no-op span instance */
const NO_OP_SPAN: TelemetrySpan = {
	id: '',
	traceId: '',
	name: '',
	startTime: 0,
	attributes: {},
	status: 'ok',
}

/**
 * No-op telemetry adapter that does nothing.
 * Used to disable telemetry in production for performance.
 */
export class NoOpTelemetry implements TelemetryAdapterInterface {
	constructor(_options: NoOpTelemetryAdapterOptions = {}) {
		// Options are ignored for no-op implementation
	}

	startSpan(_name: string, _attributes?: Readonly<Record<string, unknown>>): TelemetrySpan {
		return NO_OP_SPAN
	}

	endSpan(_span: TelemetrySpan, _status?: 'ok' | 'error'): void {
		// Intentionally empty - no-op
	}

	log(_level: LogLevel, _message: string, _attributes?: Readonly<Record<string, unknown>>): void {
		// Intentionally empty - no-op
	}

	recordMetric(_name: string, _value: number, _attributes?: Readonly<Record<string, unknown>>): void {
		// Intentionally empty - no-op
	}

	async flush(): Promise<void> {
		// Intentionally empty - no-op
	}
}
