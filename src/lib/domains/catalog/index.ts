/**
 * Catalog Domain (Client Contract)
 */

// Models & Schemas
export * from './domain/models';
export * from './domain/stock-status';
export * from './domain/pricing';
export * from './domain/filters';
export * from './domain/query-keys';
export * from './domain/admin-product-row';
export * from './domain/category-hierarchy';

// UI Components
export { default as ProductCard } from './ui/ProductCard.svelte';
export { default as ProductGrid } from './ui/ProductGrid.svelte';
export { default as ProductListGrid } from './ui/ProductListGrid.svelte';
// Grid wired to the bag + wishlist — the seam where Catalog meets Cart/Customer.
export { default as ProductListGridConnected } from './ui/ProductListGridConnected.svelte';
export { default as ProductCardSkeleton } from './ui/ProductCardSkeleton.svelte';
export { default as ProductGridSkeleton } from './ui/ProductGridSkeleton.svelte';
export { default as LinkedImage } from './ui/LinkedImage.svelte';
