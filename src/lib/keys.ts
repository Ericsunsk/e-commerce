export const queryKeys = {
    all: ['ecommerce'] as const,
    cart: () => [...queryKeys.all, 'cart'] as const,
    wishlist: () => [...queryKeys.all, 'wishlist'] as const,
    products: {
        all: () => [...queryKeys.all, 'products'] as const,
        detail: (id: string) => [...queryKeys.products.all(), id] as const,
        search: (term: string) => [...queryKeys.products.all(), 'search', term] as const,
    },
};
