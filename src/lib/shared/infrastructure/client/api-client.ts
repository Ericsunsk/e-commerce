type FetchOptions = RequestInit & {
	// Optional custom request options can be added here
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

	if (res.status === 204) {
		return {} as T;
	}

	return res.json();
}
