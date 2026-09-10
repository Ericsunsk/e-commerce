import { env } from '$env/dynamic/public';

/**
 * Get the default PocketBase URL from public env
 */
export function getPublicPocketBaseUrl(): string {
	return env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
}

export type ImageFormat = 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
export type ImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

/** Responsive resize parameters understood by both PB (`thumb`) and CDN. */
export interface ImageTransform {
	width?: number;
	height?: number;
	/** 1-100. Defaults are left to the server/CDN when omitted. */
	quality?: number;
	format?: ImageFormat;
	fit?: ImageFit;
}

export interface FileUrlOptions {
	/** Legacy PocketBase thumb (e.g. `100x100`); kept for backward compatibility. */
	thumb?: string;
	transform?: ImageTransform;
}

/** Standardized widths for responsive thumbnails (px). */
export const STANDARD_IMAGE_SIZES = {
	thumbnail: 160,
	card: 480,
	grid: 800,
	hero: 1600
} as const;

export type StandardImageSize = keyof typeof STANDARD_IMAGE_SIZES;

/** Parse a `WxH` thumb (e.g. `100x100`) into a transform. */
export function parseThumbSize(thumb: string): ImageTransform | null {
	const match = /^(\d+)x(\d+)$/.exec(thumb.trim());
	if (!match) return null;
	return { width: Number(match[1]), height: Number(match[2]) };
}

/** Resolve the effective transform: explicit `transform` wins, else parsed `thumb`. */
function resolveTransform(options?: FileUrlOptions): ImageTransform | null {
	if (options?.transform) return options.transform;
	if (options?.thumb) return parseThumbSize(options.thumb);
	return null;
}

/** `?thumb=WxH` for native PocketBase resizing (missing axis becomes 0). */
function toPocketBaseThumb(transform: ImageTransform): string | null {
	const { width, height } = transform;
	if (width == null && height == null) return null;
	return `${width ?? 0}x${height ?? 0}`;
}

function appendQueryParams(url: string, params: Record<string, string | number>): string {
	const entries = Object.entries(params).filter(([, v]) => v !== '' && v != null);
	if (entries.length === 0) return url;
	try {
		const parsed = new URL(url);
		for (const [key, value] of entries) parsed.searchParams.set(key, String(value));
		return parsed.toString();
	} catch {
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}`;
	}
}

/** `?width=&height=&quality=&format=` (+`fit` when both axes set) for CDN/R2. */
export function applyCdnTransform(url: string, transform: ImageTransform): string {
	const params: Record<string, string | number> = {};
	if (transform.width != null) params.width = transform.width;
	if (transform.height != null) params.height = transform.height;
	if (transform.quality != null) params.quality = transform.quality;
	if (transform.format) params.format = transform.format;
	if (transform.fit && transform.width != null && transform.height != null) {
		params.fit = transform.fit;
	} else if (transform.width != null && transform.height != null) {
		params.fit = 'cover';
	}
	return appendQueryParams(url, params);
}

/**
 * Get full URL for a PocketBase file
 * Uses R2 CDN if PUBLIC_R2_CDN_URL is configured, otherwise falls back to PocketBase URL.
 *
 * Responsive options are honored on BOTH paths so CDN thumbnails never fall
 * back to full-resolution originals:
 * - PocketBase: `?thumb=WxH` (native PB resizing)
 * - CDN/R2: `?width=&height=&quality=&format=` query transform
 */
export function getFileUrl(
	collectionId: string,
	recordId: string,
	filename: string | string[],
	options?: FileUrlOptions
): string {
	const actualFilename = Array.isArray(filename) ? filename[0] : filename;
	if (!actualFilename || typeof actualFilename !== 'string') return '';

	// If filename is already a full URL, return as-is
	if (actualFilename.startsWith('http://') || actualFilename.startsWith('https://')) {
		return actualFilename;
	}

	// Standard PocketBase file path
	let pbFilePath = `/api/files/${collectionId}/${recordId}/${actualFilename}`;

	// Native PB resizing: explicit thumb wins, else derive WxH from transform.
	if (options?.thumb) {
		pbFilePath += `?thumb=${options.thumb}`;
	} else if (options?.transform) {
		const thumb = toPocketBaseThumb(options.transform);
		if (thumb) pbFilePath += `?thumb=${thumb}`;
	}

	// If R2 CDN is configured
	if (env.PUBLIC_R2_CDN_URL) {
		const baseUrl = env.PUBLIC_R2_CDN_URL.replace(/\/$/, '');
		const r2FilePath = `/${collectionId}/${recordId}/${actualFilename}`;
		const cdnUrl = `${baseUrl}${r2FilePath}`;
		const transform = resolveTransform(options);
		return transform ? applyCdnTransform(cdnUrl, transform) : cdnUrl;
	}

	// Fallback to Public PocketBase URL with full API path
	const baseUrl = getPublicPocketBaseUrl().replace(/\/$/, '');
	return `${baseUrl}${pbFilePath}`;
}

/**
 * Appends thumb query param to a PocketBase file URL if not present.
 * CDN/R2 URLs get the equivalent `?width=&height=` transform instead so
 * callers (e.g. RemoteImage) stay responsive on both backends.
 */
export function appendThumbToUrl(url: string, thumb: string): string {
	if (!thumb) return url;
	const transform = parseThumbSize(thumb);
	if (url.includes('/api/files/') && !url.includes('thumb=')) {
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}thumb=${thumb}`;
	}
	if (transform && isCdnUrl(url)) {
		return applyCdnTransform(url, transform);
	}
	return url;
}

function isCdnUrl(url: string): boolean {
	const cdn = env.PUBLIC_R2_CDN_URL?.replace(/\/$/, '');
	return !!cdn && url.startsWith(cdn);
}

/**
 * Build a responsive `srcset` string for the given widths (e.g. `url-480 480w, ...`).
 * Extra transform fields (quality/format) are preserved per candidate.
 */
export function getResponsiveSrcSet(
	collectionId: string,
	recordId: string,
	filename: string | string[],
	widths: number[],
	options?: Omit<FileUrlOptions, 'transform'> & { transform?: Omit<ImageTransform, 'width'> }
): string {
	const seen = [...new Set(widths)]
		.filter((w) => Number.isFinite(w) && w > 0)
		.sort((a, b) => a - b);
	return seen
		.map((width) => {
			const url = getFileUrl(collectionId, recordId, filename, {
				...options,
				transform: { ...options?.transform, width }
			});
			return `${url} ${width}w`;
		})
		.join(', ');
}

/** Convenience: sized URL from a standard preset (or raw pixel width). */
export function getSizedImageUrl(
	collectionId: string,
	recordId: string,
	filename: string | string[],
	size: StandardImageSize | number,
	options?: Omit<FileUrlOptions, 'transform'> & {
		transform?: Omit<ImageTransform, 'width' | 'height'>;
	}
): string {
	const width = typeof size === 'number' ? size : STANDARD_IMAGE_SIZES[size];
	return getFileUrl(collectionId, recordId, filename, {
		...options,
		transform: { ...options?.transform, width }
	});
}

/**
 * Base interface for PocketBase records with required fields
 */
export interface PBRecordBase {
	id: string;
	collectionId: string;
	[key: string]: unknown;
}

/**
 * Helper to resolve image URL from a PocketBase record
 */
export function resolvePocketBaseImage<T extends PBRecordBase>(
	record: T,
	fileField: string = 'image',
	urlField: string = 'image_url',
	options?: FileUrlOptions
): string {
	const fileData = record[fileField] as string | undefined;
	if (fileData) {
		return getFileUrl(record.collectionId, record.id, fileData, options);
	}
	return (record[urlField] as string) || '';
}

/**
 * Helper to resolve multiple file URLs from a multi-select file field
 */
export function resolvePocketBaseGallery<T extends PBRecordBase>(
	record: T,
	fieldName: string,
	options?: FileUrlOptions
): string[] {
	const files = record[fieldName] as string | string[] | undefined;
	if (!files) return [];
	const fileArray = Array.isArray(files) ? files : [files];
	return fileArray
		.filter((f) => f && typeof f === 'string')
		.map((filename) => getFileUrl(record.collectionId, record.id, filename, options));
}
