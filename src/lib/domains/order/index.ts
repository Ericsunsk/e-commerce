// Domain models
export * from './domain/models';
export * from './domain/dashboard-metrics';

// UI components
export { default as OrderCard } from './ui/OrderCard.svelte';
export { default as OrderSummary } from './ui/OrderSummary.svelte';
export { default as OrderItemThumbnail } from './ui/OrderItemThumbnail.svelte';

// Status → Tailwind class mapping (presentation). Lives in ui/ because the
// domain layer must not know the design system; exported here because admin
// routes are consumers of the client barrel.
export { getOrderStatusBadgeClass, getOrderStatusColor } from './ui/order-status-style';
