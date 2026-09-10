import { describe, it, expect } from 'vitest';
import { normalizePageInput, normalizeNavInput, toPageRow, toNavRow } from './cms-admin';

describe('cms admin model', () => {
	it('validates page payloads', () => {
		expect(
			normalizePageInput({ slug: ' About-Us ', title: '关于我们', content: '<p>x</p>' })
		).toMatchObject({ slug: 'about-us', title: '关于我们' });
		for (const bad of [
			null,
			{ slug: 'BAD SLUG', title: 'x' },
			{ slug: 'ok', title: 'x' },
			{ slug: 'ok', title: '' }
		]) {
			try {
				normalizePageInput(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('validates nav payloads', () => {
		expect(
			normalizeNavInput({ label: '首页', url: '/', location: 'header', order: 1 })
		).toMatchObject({ label: '首页', url: '/', location: 'header', is_visible: true });
		for (const bad of [
			null,
			{ label: '', url: '/' },
			{ label: 'x', url: 'notaurl' },
			{ label: 'x', url: '/', location: 'sidebar' },
			{ label: 'x', url: '/', order: -1 }
		]) {
			try {
				normalizeNavInput(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('projects rows', () => {
		expect(toPageRow({ id: 'p1', slug: 'about', updated: '2026-01-01' })).toMatchObject({
			slug: 'about',
			title: ''
		});
		expect(toNavRow({ id: 'n1', label: '首页', url: '/', is_visible: false })).toMatchObject({
			isActive: false,
			location: 'header',
			order: 0
		});
	});
});
