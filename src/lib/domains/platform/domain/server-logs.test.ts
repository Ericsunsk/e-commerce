import { describe, it, expect } from 'vitest';
import { normalizeLogsQuery, buildLogsFilter, toLogRow } from './server-logs';

describe('server logs model', () => {
	it('normalizes query params with bounds', () => {
		expect(normalizeLogsQuery({})).toEqual({ level: 'all', query: '', page: 1 });
		expect(normalizeLogsQuery({ level: 'error', query: '  pi_1  ', page: '3' })).toEqual({
			level: 'ERROR',
			query: 'pi_1',
			page: 3
		});
		expect(normalizeLogsQuery({ level: 'bogus', page: '-5' })).toMatchObject({
			level: 'all',
			page: 1
		});
	});

	it('builds pocketbase filters', () => {
		expect(buildLogsFilter({ level: 'all', query: '' })).toBeUndefined();
		expect(buildLogsFilter({ level: 'ERROR', query: '' })).toBe('level = "ERROR"');
		expect(buildLogsFilter({ level: 'all', query: 'pi_1' })).toBe(
			'(message ~ "pi_1" || data.url ~ "pi_1")'
		);
		expect(buildLogsFilter({ level: 'WARN', query: 'a"b' })).toContain('a\\"b');
	});

	it('projects rows with safe fallbacks', () => {
		expect(
			toLogRow({ id: 'l1', created: '2026-01-01', data: { method: 'GET', status: 200 } })
		).toMatchObject({ id: 'l1', level: 'INFO', method: 'GET', status: 200, execMs: null });
	});
});
