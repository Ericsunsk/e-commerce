# ADR-0002: Presentational components receive cross-context behaviour as props

- **Status**: Accepted
- **Date**: 2026-09-12
- **Related**: ADR-0001

## Context

`catalog/ui/ProductCard.svelte` — a product tile — imported `useCart()` from
`$domains/cart` and `useWishlist()` from `$domains/customer` so its Quick Add and
heart buttons worked. Meanwhile `customer/ui/WishlistItemCard.svelte` imported
`$domains/catalog` for a shared image wrapper.

Together these formed a real cycle: `catalog → cart → customer → catalog`. Four
of the five cycles the new gate found had the same root cause — a component
importing its own context's barrel, which loops back through the barrel's other
exports.

The deeper problem was not the cycle. It was that a **presentational component
was depending on two other contexts' stores**. `ProductCard` decided how
add-to-bag resolves a variant, and it knew whether the visitor was logged in
(cart state differs by auth). A product tile had no business knowing the bag
exists.

## Decision

Cross-context behaviour is **injected as props**, not imported. `ProductCard`
now takes:

- `onAddToBag?: (product: Product) => void` — omit to hide Quick Add
- `wishlist?: { has; toggle }` — omit to hide the heart
- `currencyCode?: string` — for the compare-at price

The composition happens once, in `catalog/ui/ProductListGridConnected.svelte`,
which is the seam where catalog, cart, and customer already meet. Routes that
want a plain grid use `ProductListGrid`; routes that want the interactive
storefront grid use `ProductListGridConnected`.

Variant-resolution logic (pick first in-stock variant, else first, else generic)
moved from the card into the connected wrapper, because that is an *ordering*
decision and ordering belongs with the composition, not the presentation.

## Consequences

**Good.** Catalog no longer depends on cart or customer at all. Both buttons
degrade gracefully: omit the prop and the control is not rendered, which also
makes the card reusable outside a commerce context (an email preview, a wishlist
digest). The cycle is gone structurally rather than suppressed.

**Costs.** One more component in the chain, and layout props are forwarded via a
`$derived` spread so `ProductListGrid`'s own defaults still apply — passing them
as `undefined` would override the defaults with nothing.

**Neutral.** The three storefront routes (`/shop`, `/shop/[id]`, `/collection`)
import the connected wrapper aliased as `ProductListGrid`, so their templates are
unchanged.

## Alternatives rejected

- **Widen catalog's barrel to export `useCart`.** Legalizes the coupling and puts
  the bag inside catalog's interface. Also does not break the cycle.
- **A `$shared` cart-state singleton.** Makes cart shared vocabulary rather than a
  context, which contradicts the boundaries — cart owns the bag's invariants.
- **Svelte context (`setContext`/`getContext`).** Same coupling at runtime,
  hidden from static analysis, so the gate could not see it.
