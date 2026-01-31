type FetchOptions = RequestInit & {
	// You could add schema validation here later
};

export async function apiClient<T>(url: string, options: FetchOptions = {}): Promise<T> {
	const res = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			...options.headers
		},
		...options
	});

	if (!res.ok) {
		// Try to parse JSON error message, fallback to text or status
		let message = `API Error: ${res.status}`;
		try {
			const errBody = await res.json();
			if (errBody.message) message = errBody.message;
			else if (errBody.error) message = errBody.error;
		} catch {
			// ignore JSON parse error
		}
		throw new Error(message);
	}

	// Handle 204 No Content
	if (res.status === 204) {
		return {} as T;
	}

	return res.json();
}
