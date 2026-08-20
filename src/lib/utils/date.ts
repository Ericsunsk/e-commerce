export function parsePocketBaseDate(input: unknown): Date | null {
	if (input == null) return null;
	if (input instanceof Date) {
		return Number.isNaN(input.getTime()) ? null : input;
	}

	const raw = String(input).trim();
	if (!raw) return null;

	// PocketBase commonly returns: "YYYY-MM-DD HH:mm:ss.SSSZ" (note the space).
	let normalized = raw.replace(' ', 'T');

	// If timezone is missing, assume UTC.
	if (!/(Z|[+-]\d{2}:?\d{2})$/.test(normalized)) {
		normalized += 'Z';
	}

	// Safari can be strict about fractional seconds length; keep max 3 digits.
	normalized = normalized.replace(/\.(\d{3})\d+(?=(Z|[+-]\d{2}:?\d{2})$)/, '.$1');

	const parsed = new Date(normalized);
	if (!Number.isNaN(parsed.getTime())) return parsed;

	// Last resort fallback.
	const fallback = new Date(raw);
	return Number.isNaN(fallback.getTime()) ? null : fallback;
}
