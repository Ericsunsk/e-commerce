/**
 * Mask identifier utilities (shared across domains).
 *
 * Masks sensitive strings (client IDs, API keys, secrets) for display
 * purposes. Empty, null, or undefined inputs remain falsy; short strings
 * are fully masked.
 */

export function maskIdentifier(value: string | null | undefined): string {
	if (!value) return '';
	if (value.length <= 12) return '...';
	return `${value.slice(0, 8)}...${value.slice(-4)}`;
}