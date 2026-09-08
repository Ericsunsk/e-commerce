export function buildFullName(firstName: unknown, lastName: unknown): string {
	const first = typeof firstName === 'string' ? firstName.trim() : '';
	const last = typeof lastName === 'string' ? lastName.trim() : '';
	return [first, last].filter(Boolean).join(' ');
}
