export const catalogQueryKeys = {
	all: ['ecommerce', 'products'] as const,
	detail: (id: string) => [...catalogQueryKeys.all, id] as const,
	search: (term: string) => [...catalogQueryKeys.all, 'search', term] as const
};
