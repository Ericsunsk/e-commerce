// =============================================================================
// Library Index - Centralized Exports
// =============================================================================

// Constants & Design Tokens
export * from './constants';

// Types - Site Module
export type { GlobalSettings, NavItem } from './types';

// Types - Content Module
export type { Page, UISection, UIAsset, SectionType } from './types';

// Types - Commerce Module
export type { Product, Category, Order, OrderItem, ShippingAddress, OrderStatus } from './types';

// Types - System Module

// UI Components
export { default as Button } from './components/ui/Button.svelte';
export { default as Drawer } from './components/ui/Drawer.svelte';
export { default as RemoteImage } from './components/ui/RemoteImage.svelte';
export { default as FormInput } from './components/ui/FormInput.svelte';
export { default as FormSelect } from './components/ui/FormSelect.svelte';
export { default as Toast } from './components/ui/Toast.svelte';
export { default as Skeleton } from './components/ui/Skeleton.svelte';
export { default as ProductCardSkeleton } from './components/ui/ProductCardSkeleton.svelte';
export { default as ProductGridSkeleton } from './components/ui/ProductGridSkeleton.svelte';
export { default as Badge } from './components/ui/Badge.svelte';
export { default as Modal } from './components/ui/Modal.svelte';
export { default as EmptyState } from './components/ui/EmptyState.svelte';
export { default as PageHeader } from './components/ui/PageHeader.svelte';
export { default as LoadingState } from './components/ui/LoadingState.svelte';

// Feature Components
export { default as Header } from './components/Header.svelte';
export { default as Footer } from './components/Footer.svelte';
export { default as Hero } from './components/Hero.svelte';
export { default as ProductCard } from './components/ProductCard.svelte';
export { default as CartDrawer } from './components/CartDrawer.svelte';

// Stores
export { useCart } from './stores/cart.svelte';
export { useWishlist } from './stores/wishlist.svelte';
export { auth } from './stores/auth.svelte';
export { toastStore } from './stores/toast.svelte';
