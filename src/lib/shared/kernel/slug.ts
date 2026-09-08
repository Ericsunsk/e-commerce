/**
 * URL Slug Utilities
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string | undefined | null): boolean {
	return !!slug && SLUG_REGEX.test(slug);
}
