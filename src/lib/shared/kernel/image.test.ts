import { describe, it, expect, beforeEach } from 'vitest';
import { env } from '$env/dynamic/public';
import {
	getFileUrl,
	appendThumbToUrl,
	getResponsiveSrcSet,
	getSizedImageUrl,
	parseThumbSize,
	applyCdnTransform
} from './image';

const CDN = 'https://img.example.com';

beforeEach(() => {
	env.PUBLIC_R2_CDN_URL = '';
	env.PUBLIC_POCKETBASE_URL = 'http://127.0.0.1:8090';
});

describe('getFileUrl (PocketBase backend)', () => {
	it('keeps legacy thumb behavior untouched', () => {
		expect(getFileUrl('c1', 'r1', 'a.jpg')).toBe('http://127.0.0.1:8090/api/files/c1/r1/a.jpg');
		expect(getFileUrl('c1', 'r1', 'a.jpg', { thumb: '100x100' })).toBe(
			'http://127.0.0.1:8090/api/files/c1/r1/a.jpg?thumb=100x100'
		);
	});

	it('derives ?thumb=WxH from transform', () => {
		expect(getFileUrl('c1', 'r1', 'a.jpg', { transform: { width: 480, height: 320 } })).toBe(
			'http://127.0.0.1:8090/api/files/c1/r1/a.jpg?thumb=480x320'
		);
		expect(getFileUrl('c1', 'r1', 'a.jpg', { transform: { width: 480 } })).toBe(
			'http://127.0.0.1:8090/api/files/c1/r1/a.jpg?thumb=480x0'
		);
	});

	it('returns full URLs as-is', () => {
		expect(getFileUrl('c1', 'r1', 'https://other.com/x.jpg')).toBe('https://other.com/x.jpg');
	});
});

describe('getFileUrl (CDN backend)', () => {
	beforeEach(() => {
		env.PUBLIC_R2_CDN_URL = CDN;
	});

	it('serves plain CDN URLs without transform (backward compatible)', () => {
		expect(getFileUrl('c1', 'r1', 'a.jpg')).toBe(`${CDN}/c1/r1/a.jpg`);
	});

	it('maps transform to width/height/quality/format params', () => {
		const url = getFileUrl('c1', 'r1', 'a.jpg', {
			transform: { width: 480, height: 320, quality: 70, format: 'webp' }
		});
		expect(url).toContain(`${CDN}/c1/r1/a.jpg?`);
		expect(url).toContain('width=480');
		expect(url).toContain('height=320');
		expect(url).toContain('quality=70');
		expect(url).toContain('format=webp');
		expect(url).toContain('fit=cover');
	});

	it('honors legacy thumb on CDN instead of dropping it', () => {
		const url = getFileUrl('c1', 'r1', 'a.jpg', { thumb: '100x100' });
		expect(url).toContain('width=100');
		expect(url).toContain('height=100');
		expect(url).not.toContain('thumb=');
	});
});

describe('helpers', () => {
	it('parses WxH thumbs and applies raw CDN transforms', () => {
		expect(parseThumbSize('100x100')).toEqual({ width: 100, height: 100 });
		expect(parseThumbSize('small')).toBeNull();
		expect(applyCdnTransform(`${CDN}/x.jpg`, { width: 200 })).toContain('width=200');
	});

	it('appends thumb on PB urls and transforms on CDN urls', () => {
		expect(appendThumbToUrl('http://pb/api/files/c/r/a.jpg', '100x100')).toBe(
			'http://pb/api/files/c/r/a.jpg?thumb=100x100'
		);
		env.PUBLIC_R2_CDN_URL = CDN;
		const cdn = appendThumbToUrl(`${CDN}/c/r/a.jpg`, '100x100');
		expect(cdn).toContain('width=100');
	});

	it('builds srcset descriptors per width', () => {
		env.PUBLIC_R2_CDN_URL = CDN;
		const srcset = getResponsiveSrcSet('c1', 'r1', 'a.jpg', [800, 480, 480], {
			transform: { quality: 70 }
		});
		const parts = srcset.split(', ');
		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatch(/width=480.*480w/);
		expect(parts[1]).toMatch(/width=800.*800w/);
		expect(srcset).toContain('quality=70');
	});

	it('resolves standard size presets', () => {
		env.PUBLIC_R2_CDN_URL = CDN;
		expect(getSizedImageUrl('c1', 'r1', 'a.jpg', 'card')).toContain('width=480');
		expect(getSizedImageUrl('c1', 'r1', 'a.jpg', 200)).toContain('width=200');
	});
});
