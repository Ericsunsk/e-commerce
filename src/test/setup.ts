import '@testing-library/jest-dom';

// Mock crypto for UUIDs in tests
Object.defineProperty(globalThis, 'crypto', {
	value: {
		randomUUID: () => 'test-uuid-0000-0000-0000-000000000000'
	}
});

// Mock Storage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		clear: () => {
			store = {};
		},
		removeItem: (key: string) => {
			delete store[key];
		}
	};
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
