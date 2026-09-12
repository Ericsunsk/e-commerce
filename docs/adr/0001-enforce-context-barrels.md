# ADR-0001: Enforce context boundaries with a dependency gate

- **Status**: Accepted
- **Date**: 2026-09-12
- **Supersedes**: nothing. Amends Constitution Principle IX (new).

## Context

The repo was restructured into `src/lib/domains/<context>/` with
domain/application/infrastructure/ui layers and `index.ts` / `server.ts`
barrels. The shape was right, but the seam was only a convention:

- Nothing checked cross-context imports. Six real violations existed, including
  `order/` reaching into **two** other contexts' `infrastructure/` layers, and a
  genuine `catalog → cart → customer → catalog` cycle.
- `.dependency-cruiser.cjs` existed but had **never run** — no npm script, no
  hook, no reference. And its single `no-circular` rule was silently matching
  nothing: `$domains/*` and `$shared/*` aliases resolved to `couldNotResolve: true`,
  so the cross-context graph was invisible to it. It reported "no violations"
  for as long as it had existed.
- Three rule sources disagreed about cross-context imports: the constitution was
  silent, the dependency config was dormant, and `AGENTS.md` pointed at a
  `CONTEXT.md` and `docs/adr/` that did not exist.

## Decision

Cross-context imports **must target a barrel** (`$domains/<ctx>` or
`$domains/<ctx>/server`). No exceptions, including for pure helpers. This is
enforced mechanically by `npm run depcruise`, which fails on error.

Specifically:

1. **One rule per context** rather than one rule with a backreference.
   dependency-cruiser cannot compare capture groups between `from` and `to`, so a
   single rule flagged ~200 same-context edits and buried the 6 real ones.
2. **Aliases must resolve.** A dedicated `tsconfig.depcruise.json` re-declares
   the `kit.alias` aliases with a root-relative include. Without it every rule
   silently matches nothing — the failure mode that let the original config rot.
3. **Publish capabilities, don't widen barrels.** When `order/` needed to deduct
   stock it deep-imported catalog's allocator *and* its PocketBase adapter.
   Catalog now publishes `createInventoryAllocator(pb).allocate(...)`. Widening
   the barrel would have legalized the coupling without removing it.
4. **Inject cross-context behaviour into presentational components.**
   `ProductCard` (catalog) imported cart and wishlist state; `WishlistItemCard`
   (customer) imported catalog. Cart/wishlist are now injected props, composed by
   `ProductListGridConnected` at the seam.

Also tightened while here: `domain/` may not reach `$shared/infrastructure`
(except the pure generated `pocketbase-types`), and a client barrel must not
export a `.server.ts` module.

## Consequences

**Good.** The gate is green and meaningful — it was red with 19 real errors
before the fixes, so it demonstrably catches things. Four of the five cycles
turned out to be self-barrel imports (a component importing the barrel that
exports it), which are now swept. The domain layer is framework-free and
testable with no harness: three test files that imported the real server lock now
use an injected test double, and a Stripe-sync suite that lived inside a domain
test file moved beside the module it exercises.

**Costs.** Adding a context means its rule is generated automatically (the
context list is read from disk), so no config edit — but `tsconfig.depcruise.json`
must stay in sync with `kit.alias` if an alias is ever added.

**Deliberately allowed.** `kernel/` may read `$env/dynamic/public`. Public vars
are isomorphic by definition, so reading one does not make kernel impure, and
threading a config object through every call site would buy nothing. Private env
is forbidden.

## Alternatives rejected

- **Leave it as convention.** Six violations existed and were invisible. A rule
  nothing checks is documentation, and this one wasn't even written down.
- **ESLint `no-restricted-imports` with a path per context.** 72 context-pairs,
  and it cannot see resolution — it matches strings, so an alias change silently
  disables it.
- **One dependency-cruiser rule for all contexts.** Produced 213 violations, 207
  of them a context importing itself. Unusable as a gate.
