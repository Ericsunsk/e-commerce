// Domain models and rules
export * from './domain/models';

// UI state and stores (deep state module - authoritative client interface)
export * from './ui/cart-state.svelte';

// UI components
export { default as CartDrawer } from './ui/CartDrawer.svelte';
export { default as FreeShippingProgress } from './ui/FreeShippingProgress.svelte';
export { default as LineItemMeta } from './ui/LineItemMeta.svelte';
