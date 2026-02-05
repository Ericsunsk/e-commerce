import { env } from '$env/dynamic/public';

/**
 * Get the default PocketBase URL from public env
 */
export function getPublicPocketBaseUrl(): string {
	return env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
}

/**
 * Get full URL for a PocketBase file
 * Uses R2 CDN if PUBLIC_R2_CDN_URL is configured, otherwise falls back to PocketBase URL
 *
 * @param collectionId - Collection ID or Name
 * @param recordId - Record ID
 * @param filename - File name
 * @param options - Optional transform options (e.g. thumb) - mainly for direct PB usage, ignored by some CDNs usually
 * @returns Full URL to the file
 */
export function getFileUrl(
	collectionId: string,
	recordId: string,
	filename: string | string[],
	options?: { thumb?: string }
): string {
	const actualFilename = Array.isArray(filename) ? filename[0] : filename;
	if (!actualFilename || typeof actualFilename !== 'string') return '';

	// If filename is already a full URL, return as-is
	if (actualFilename.startsWith('http://') || actualFilename.startsWith('https://')) {
		return actualFilename;
	}

	// Standard PocketBase file path
	let pbFilePath = `/api/files/${collectionId}/${recordId}/${actualFilename}`;

	// Add query params for PB resizing if needed
	if (options?.thumb) {
		pbFilePath += `?thumb=${options.thumb}`;
	}

	// If R2 CDN is configured
	if (env.PUBLIC_R2_CDN_URL) {
		// Note: CDN usually maps directly to the file structure.
		// Ensure your CDN path logic matches your storage sync logic.
		// Assuming standard PB S3 sync: /[collection]/[record]/[filename]
		const baseUrl = env.PUBLIC_R2_CDN_URL.replace(/\/$/, '');
		// R2/S3 usually doesn't use /api/files prefix, just the path
		const r2FilePath = `/${collectionId}/${recordId}/${actualFilename}`;
		return `${baseUrl}${r2FilePath}`;
	}

	// Fallback to Public PocketBase URL with full API path
	const baseUrl = getPublicPocketBaseUrl().replace(/\/$/, '');
	return `${baseUrl}${pbFilePath}`;
}

/**
 * Appends thumb query param to a PocketBase file URL if not present
 */
export function appendThumbToUrl(url: string, thumb: string): string {
	if (!thumb) return url;
	// Check if it's a PB file URL
	if (url.includes('/api/files/') && !url.includes('thumb=')) {
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}thumb=${thumb}`;
	}
	return url;
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
 * Prioritizes the uploaded file field (e.g. 'image')
 * Fallbacks to a text URL field (e.g. 'image_url') if file is missing
 */
export function resolvePocketBaseImage<T extends PBRecordBase>(
	record: T,
	fileField: string = 'image',
	urlField: string = 'image_url',
	options?: { thumb?: string }
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
	options?: { thumb?: string }
): string[] {
	const files = record[fieldName] as string | string[] | undefined;
	if (!files) return [];
	const fileArray = Array.isArray(files) ? files : [files];
	return fileArray
		.filter((f) => f && typeof f === 'string')
		.map((filename) => getFileUrl(record.collectionId, record.id, filename, options));
}
