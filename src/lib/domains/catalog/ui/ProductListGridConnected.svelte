<script lang="ts">
	/**
	 * ProductListGrid wired to the bag and the wishlist.
	 *
	 * This is the seam where Catalog meets Cart and Customer. `ProductCard` takes
	 * its add-to-bag and wishlist behaviour as props, so Catalog stays a pure
	 * presentation + pricing context. Importing cart/customer state *inside* the
	 * card instead created a catalog -> cart -> customer -> catalog cycle, and
	 * made a presentational component depend on two other contexts' stores.
	 *
	 * Routes that want a plain grid (no actions) use `ProductListGrid` directly.
	 * Routes that want the interactive storefront grid use this.
	 */
	import ProductListGrid from './ProductListGrid.svelte';
	import { useCart } from '$domains/cart';
	import { useWishlist } from '$domains/customer';
	import type { Product } from '../domain/models';

	interface Props {
		products: Product[];
		variant?: 'card' | 'image';
		gridClass?: string;
		cardWrapperClass?: string;
		hrefPrefix?: string;
		imageThumb?: string;
	}

	let {
		products,
		variant = 'card',
		gridClass,
		cardWrapperClass,
		hrefPrefix,
		imageThumb
	}: Props = $props();

	const cart = useCart();
	const wishlist = useWishlist();

	/**
	 * Mirrors the previous in-card behaviour: pick the first in-stock variant,
	 * else the first variant, else fall back to a generic line.
	 */
	function handleAddToBag(product: Product) {
		if (product.hasVariants && product.variants && product.variants.length > 0) {
			const preferred =
				product.variants.find((v) => (v.stockQuantity || 0) > 0) ?? product.variants[0];
			cart.addItem(product, preferred.color, preferred.size);
		} else {
			cart.addItem(product, 'Standard', 'Generic');
		}
	}

	const wishlistBridge = {
		has: (id: string) => wishlist.has(id),
		toggle: (product: Product) => wishlist.toggle(product)
	};

	// Only forward the layout props that were actually supplied, so
	// ProductListGrid's own defaults apply otherwise. Passing them as
	// `undefined` would override those defaults with nothing.
	const layout = $derived({
		...(gridClass === undefined ? {} : { gridClass }),
		...(cardWrapperClass === undefined ? {} : { cardWrapperClass }),
		...(hrefPrefix === undefined ? {} : { hrefPrefix }),
		...(imageThumb === undefined ? {} : { imageThumb })
	});
</script>

<ProductListGrid
	{products}
	{variant}
	onAddToBag={handleAddToBag}
	wishlist={wishlistBridge}
	currencyCode={cart.currencyCode}
	{...layout}
/>
