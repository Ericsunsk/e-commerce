/**
 * Catalog Domain (Server Contract)
 */

export * from './application/get-catalog.server';
export * from './application/product-detail.server';
export * from './domain/filters';
// Pure domain modules the server surface also needs. index.ts exports these for
// clients; a server route is a consumer too, and was reaching past the barrel
// for them (product-visibility, through the admin toggle endpoint).
export * from './domain/product-visibility';
export * from './infrastructure/product-mapper.server';
export * from './infrastructure/stripe-pricing.server';
export * from './infrastructure/inventory-deduction.server';
export * from './application/admin-products.server';
export * from './application/category-admin.server';
// Published capability: other contexts deduct stock through this, not by
// assembling the domain allocator + PocketBase adapter themselves.
export * from './application/inventory-capability.server';
