# Context

Single-context repository. This file is the glossary and boundary map for the
whole system; decisions live in `docs/adr/`.

Read this before exploring, and use its terms exactly — the "Avoid" column
exists because those synonyms have caused confusion in this codebase before.

## The system

A storefront and admin console on SvelteKit, backed by PocketBase, with Stripe
as the price source of truth.

- **SvelteKit 2 / Svelte 5 (runes)** — one app serving storefront, admin, and API.
- **PocketBase** — database, auth, file storage. Schema is the source of truth
  for persisted shapes; types are generated into
  `src/lib/shared/infrastructure/pocketbase-types.ts`.
- **Stripe** — owns prices. PocketBase holds synced copies for display.
  Stripe is authoritative when they disagree.
- **Cloudflare** — deploy target (`adapter-cloudflare`).

There is **no n8n and no workflow layer.** Side effects happen inside SvelteKit
request handlers. Some older docs describe an n8n integration; it is gone.

## Bounded contexts

Each is a business capability with its own language and invariants. A context is
defined by the words it owns, **not** by a table or a screen.

| Context | Owns | Barrels |
|---|---|---|
| `catalog` | Products, variants, categories, pricing display, stock visibility | `index.ts`, `server.ts` |
| `cart` | The bag: line items, quantities, guest→user merge | `index.ts`, `server.ts` |
| `checkout` | Turning a bag into a payment attempt; coupons; shipping address | `index.ts`, `server.ts` |
| `order` | Post-payment lifecycle: fulfillment, refunds, reconciliation | `index.ts`, `server.ts` |
| `payment` | Stripe configuration and settings | `server.ts` only |
| `customer` | Identity, wishlist, addresses | `index.ts`, `server.ts` |
| `content` | Pages, sections, navigation, site settings (the CMS) | `index.ts`, `server.ts` |
| `admin` | Admin authentication and route protection | `server.ts` only |
| `platform` | Infrastructure settings: S3, SMTP, backups, logs | `server.ts` only |

`index.ts` is the **client-safe** barrel (`domain/` + `ui/`). `server.ts` is the
**server-only** barrel (`domain/` + `application/` + `infrastructure/`). A
context has an `index.ts` only if it has a `ui/` layer — the three
server-only contexts are `admin`, `payment`, `platform`.

Everything behind a barrel is implementation detail. Cross-context imports
**must** target a barrel; `npm run depcruise` fails the build otherwise. See
ADR-0001.

## Shared (not a context)

`src/lib/shared/` holds what every context may use.

| Path | What it is |
|---|---|
| `kernel/` | Cross-context primitives: price, date, slug, errors, messages, image URLs. Pure — no PocketBase, no Svelte, no context. Public env allowed, private env not. |
| `ui/` | Design-system components and global UI state (toasts). |
| `infrastructure/` | PocketBase clients, request body parsing, sanitizing, locks, limiters, admin guard. |

`kernel` is deliberately **not** a bounded context: it has no invariants of its
own, only vocabulary everyone shares. Anything with a rule attached belongs in a
context instead.

## Glossary

Terms to use exactly. Each row's "Avoid" column lists synonyms that have caused
drift here.

| Term | Meaning | Avoid |
|---|---|---|
| **Context** | A bounded context: one of the nine above. | module, service, domain |
| **Barrel** | A context's `index.ts` or `server.ts` — its public interface. | export file, entry point |
| **Seam** | The place where one context's interface lives and another calls through. | boundary, integration point |
| **Adapter** | Concrete implementation behind a barrel (PocketBase repo, Stripe client). | driver, gateway, service |
| **Domain layer** | A context's `domain/` — pure model and rules. | model layer, entities |
| **Application layer** | A context's `application/` — use-case orchestration, `.server.ts`. | service layer, use cases |
| **Capability** | A named operation a context publishes for others (e.g. `createInventoryAllocator`). Prefer this over exposing raw adapters. | port, facade |

Domain vocabulary:

| Term | Meaning | Avoid |
|---|---|---|
| **Variant** | A concrete purchasable SKU of a product (colour + size). | option, SKU (when you mean the row) |
| **Bag** | The cart's contents in user-facing copy. The code and code identifiers say `cart`. | basket |
| **Intake** | Parsing and normalizing an inbound request into domain input (`checkout-intake`). | parser, validator |
| **Allocation** | Atomically deducting stock for an order (`inventory-allocation`). | deduction, decrement |
| **Reconciliation** | Bringing an order's stored state in line with Stripe after a webhook. | sync, repair |
| **Fulfillment** | The paid → fulfilled transition and its stock effects. | shipping, delivery |
| **Normalize** | Coercing an untyped/external payload into a typed domain value. | sanitize, clean, parse |
| **Mask** | Redacting a secret for display (`maskSecret`, `AdminCouponRow`-style projections). | hide, obfuscate |

## File suffix conventions

Two conventions coexist and are **not** interchangeable — the punctuation carries
the meaning:

| Suffix | Means | Examples |
|---|---|---|
| `*.server.ts` | Server-only. Never importable from a client barrel. | `pocketbase.server.ts`, `order-repository.server.ts` |
| `*.client.ts` | Browser-side **HTTP transport** — talks to our own API via `apiClient`. | `cart-api.client.ts`, `wishlist-api.client.ts` |
| `*-client.ts` | Browser-side **PocketBase SDK** wrapper (`pb.collection(...)`). | `auth-client.ts`, `address-client.ts` |
| `*.svelte.ts` | Rune-based reactive state module. | `cart-state.svelte.ts` |
| `*.svelte` | Component. | `ProductCard.svelte` |

A file with neither suffix is isomorphic: safe in both contexts. `domain/` files
are always isomorphic by rule (see Principle IX).

`_`-prefixed files under `src/routes/` are colocated helpers, not routes, and are
excluded from routing by SvelteKit — e.g. `admin/products/_parse-product-body.ts`.

## Where things live

```
src/
├── lib/
│   ├── domains/<context>/       ← the nine contexts
│   │   ├── domain/              pure model + rules (no framework)
│   │   ├── application/         use-case orchestration (.server.ts)
│   │   ├── infrastructure/      adapters (.server.ts)
│   │   ├── ui/                  components + rune state (.svelte, .svelte.ts)
│   │   ├── index.ts             client barrel
│   │   └── server.ts            server barrel
│   ├── shared/                  kernel, ui, infrastructure
│   └── assets/
├── routes/                      thin — handlers delegate to a context barrel
└── test/                        test setup + shared test helpers
```

`src/routes/` holds no business logic. A route parses its input and calls one
context barrel; anything more belongs in `application/`.
