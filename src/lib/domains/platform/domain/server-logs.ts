/**
 * Server log viewer model (pure domain).
 *
 * PocketBase `/api/logs` keeps request logs (short retention). This module
 * builds list filters and projects rows for the admin viewer. Application
 * `errorId` tracing lives in server stdout; the keyword box matches it
 * wherever it surfaces (message / URL).
 */

export const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
export type LogLevelFilter = (typeof LOG_LEVELS)[number] | 'all';

export interface LogsQuery {
	level: LogLevelFilter;
	query: string;
	page: number;
}

export interface LogRow {
	id: string;
	created: string;
	level: string;
	message: string;
	method: string;
	url: string;
	status: number | null;
	execMs: number | null;
}

/** Normalize untrusted query params with safe bounds. */
export function normalizeLogsQuery(input: {
	level?: string;
	query?: string;
	page?: string | number;
}): LogsQuery {
	const level = String(input.level ?? 'all').toUpperCase();
	return {
		level: (LOG_LEVELS as readonly string[]).includes(level)
			? (level as LogLevelFilter)
			: 'all',
		query: String(input.query ?? '').trim().slice(0, 120),
		page: Math.min(Math.max(Number.parseInt(String(input.page ?? '1'), 10) || 1, 1), 1000)
	};
}

/** Build the PocketBase filter expression (undefined = no filter). */
export function buildLogsFilter(query: Pick<LogsQuery, 'level' | 'query'>): string | undefined {
	const parts: string[] = [];
	if (query.level !== 'all') {
		parts.push(`level = "${query.level}"`);
	}
	if (query.query) {
		const escaped = query.query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		parts.push(`(message ~ "${escaped}" || data.url ~ "${escaped}")`);
	}
	return parts.length > 0 ? parts.join(' && ') : undefined;
}

export function toLogRow(record: {
	id: string;
	created: string;
	level?: string;
	message?: string;
	data?: Record<string, unknown>;
}): LogRow {
	const data = record.data ?? {};
	const exec = Number(data.execTime);
	return {
		id: record.id,
		created: record.created,
		level: String(record.level ?? '').toUpperCase() || 'INFO',
		message: record.message || '',
		method: String(data.method ?? ''),
		url: String(data.url ?? ''),
		status: Number.isFinite(Number(data.status)) ? Number(data.status) : null,
		execMs: Number.isFinite(exec) ? Math.round(exec * 10) / 10 : null
	};
}
