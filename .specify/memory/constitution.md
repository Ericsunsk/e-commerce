<!--
SYNC IMPACT REPORT
Version: 1.5.4 -> 1.6.0
List of modified principles:
- IX. Bounded Contexts & Layering (NEW): Codifies the DDD structure that the codebase
  already implements but that no principle previously governed. Defines the four layers,
  the two barrels (the context's interface), the cross-context import rule, and layer
  purity requirements. Restores the "Constitution Article" numbering that eslint.config.js
  and the implementation legend already cite.
- IV. Type Safety: Corrected the file locations that drifted during the DDD restructure.
  `src/lib/pocketbase-types.ts` -> `src/lib/shared/infrastructure/pocketbase-types.ts`.
  Removed the `src/lib/types.ts` mandate (the file was never created; domain view models
  now live in each context's `domain/` layer, which is the stronger arrangement).
- V. Backend & Architecture: Removed the n8n Automation Policy and its four dependent
  rules (Side-Effect Idempotency's n8n trigger, Workflow Secrets, Documentation Secret
  Hygiene, Workflow Reference Policy, Workflow Export Hygiene). n8n is no longer part of
  the system: the Stripe webhook is a closed loop inside SvelteKit. Also corrected the
  Orders state machine path (`src/lib/server/orders.ts` -> `order/domain/orders`).
- III. Performance & Assets: Downgraded the `@sveltejs/enhanced-img` mandate to SHOULD.
  The package is not installed (removed ahead of the Cloudflare deploy) but the rule was
  still MUST, so the constitution was mandating an absent dependency.
Added sections:
- IX. Bounded Contexts & Layering
Removed sections:
- n8n dependent rules within V (see above)
Templates requiring updates:
- .specify/templates/plan-template.md (⚠ no Constitution Check gate for Principle IX)
- .specify/templates/spec-template.md (✅ verified — no change needed)
- .specify/templates/tasks.md (⚠ deleted from repo; not applicable)
Command files requiring updates:
- .opencode/command/*.md (⚠ .opencode/ removed from repo; not applicable)
Runtime docs requiring updates:
- README.md (⚠ still describes the Spec Kit chain + n8n; needs a follow-up pass)
- AGENTS.md (⚠ points at CONTEXT.md and docs/adr/, neither of which exists)
- .agent/docs/atomic-api-guide.md (⚠ documents /api/inventory/deduct and
  /api/coupons/increment endpoints that no longer exist)
Automation/scripts requiring updates:
- package.json (MUST add a `depcruise` script — the config exists but has never run)
- .dependency-cruiser.cjs (MUST gain the Principle IX cross-context rules)
Follow-up TODOs:
- TODO(CONTEXT): create CONTEXT.md and docs/adr/ as AGENTS.md promises
- TODO(DOCS): reconcile .agent/docs/atomic-api-guide.md with the live endpoint set
- TODO(ENHANCED-IMG): finish or revert the enhanced-img migration
-->

# JEVARIE Project Constitution

## Core Principles

### I. SvelteKit + Svelte 5 Protocol (The Runes)
- **Reactivity (MUST)**: Use `$state`, `$derived`, and `$props` for reactivity.
- **Props (SHOULD)**: Destructure `$props()` when it improves readability.
- **State Management (MUST)**:
    - **Server-synced**: Use **TanStack Query v6** for all server-synced state (cart, wishlist, products).
    - **Local UI**: Use Svelte 5 **Runes** for transient UI state.
    - **Shared Logic Location**: Shared rune-based state modules MUST live in
      `src/lib/domains/<context>/ui/*.svelte.ts` (a context's own state) or
      `src/lib/shared/ui/*.svelte.ts` (cross-context state). There is no `src/lib/stores/`.
- **Data Fetching (MUST)**: Primary page data MUST be fetched via SSR in `+page.server.ts`.
- **API Routes (MUST)**: SvelteKit API routes MUST wrap handlers with `apiHandler`.
    - *Note*: `apiHandler` currently guards on `locals.user`. Admin routes additionally
      require a `locals.admin` guard 见 Principle IX for the layering rule.
- **UI Composition (SHOULD)**: Prefer `{#snippet}` for local UI composition and reuse.
- **Rationale**: Consistent reactivity/state boundaries reduce bugs and keep SSR predictable.

### II. Apple UX Style & Aesthetics
- **Design Standard (MUST)**: Customer-facing UI MUST not ship with unstyled browser defaults.
- **Styling Engine (MUST)**: **Tailwind CSS v4** is mandatory. Define design tokens via `@theme`.
- **Typography (SHOULD)**: Use the project font tokens (e.g., Manrope, Optima) with clear hierarchy.
- **Icons (MUST)**: Use **Lucide Svelte** (stroke width 1.5px-2px) with consistent sizing.
- **Color System (MUST)**: Use curated HSL tokens and gradients; avoid ad-hoc component colors.
- **Motion (MUST)**: Animations MUST use GPU-safe properties (`transform`, `opacity`). Prefer
  Svelte `transition:` and `animate:flip` for UI motion.
- **Rationale**: Premium consistency is part of the product; inconsistency creates compounding UX debt.

### III. Performance & Assets
- **Preloading (MUST)**: Internal navigation links MUST set `data-sveltekit-preload-data="hover"`
  by default. Document any exceptions in code.
- **Image Optimization (SHOULD)**: Prefer `@sveltejs/enhanced-img`, or explicit
  `decoding="async"` / `loading="lazy"` with CDN transforms, unless above-the-fold content
  requires eager loading.
    - *Note*: `@sveltejs/enhanced-img` is not currently installed. Until it is, satisfy this
      principle with `$shared/kernel/image` CDN transforms plus explicit `width`/`height`.
- **Layout Stability (MUST)**: Images MUST set explicit `width`/`height` or `aspect-ratio` to prevent CLS.
- **Rationale**: These defaults protect LCP/CLS with minimal ongoing effort.

### IV. Type Safety (Type Convergence)
- **Source of Truth (MUST)**: Extend from `src/lib/shared/infrastructure/pocketbase-types.ts`
  (generated from DB).
- **Domain Types (MUST)**: Define view models and DTOs inside the owning bounded context's
  `domain/` layer (见 Principle IX). Do not create a global `src/lib/types.ts` — types belong
  to the context that owns the concept.
- **Validation (MUST)**: Use **Zod v4** (imported as `zod`) for all schemas.
  `sveltekit-superforms` MUST use the `zod4` adapter. `zod/v3` legacy imports are forbidden.
    - **Schema naming (MUST)**: Declare `const FooSchema = z.object({...})` and derive the type
      as `type Foo = z.infer<typeof FooSchema>`. The inferred type MUST be the bare entity name,
      NOT `FooSchema`.
    - **Deprecated APIs (MUST NOT)**: Do not use `.passthrough()` (deprecated in Zod 4 — use
      `z.looseObject()` / `.loose()`), nor `z.ZodIssueCode.*` (use the raw string literal, e.g.
      `code: 'custom'`).
    - *Exception*: For `zodClient` adapters requiring `superRefine`, `as any` casting is allowed
      only when strict types conflict with library internals.
- **Protocol (MUST)**:
    - **PocketBase**: Responses MUST use types from `pocketbase-types.ts`. Never use
      `RecordModel` or `any`. Handle expansions with explicit interfaces.
    - **API Handlers**: Use `catch (e: unknown)` and extract errors safely. Never return untyped JSON.
- **Rationale**: One type chain prevents drift and keeps runtime validation aligned with compile-time types.

### V. Backend & Architecture (Adaptive Edge)
- **Three-Tier Architecture (MUST)**:
    - **Tier 1 (Display)**: Optimized queries for `products`, `pages`.
    - **Tier 2 (Ops)**: Precise tracking of `variants`, `SKUs`, and financial details.
    - **Tier 3 (Extension)**: JSON attributes for non-searchable metadata.
- **Stripe Hybrid Driver (MUST)**: Stripe is the source of truth for prices; SvelteKit webhooks sync
  data to PocketBase (marketing source of truth).
- **Optimistic Concurrency Control (OCC) (MUST)**: Perform server-side stock verification before
  updates to prevent overselling.
- **Security (MUST)**: Enforce strict `$env` separation for server-side secrets. Use `withAdmin` for
  privileged operations.
- **Side-Effect Idempotency (MUST)**: Webhook handlers (Stripe, etc.) MUST be idempotent and MUST
  log execution status to PocketBase.
- **Webhook Authenticity (MUST)**: Inbound webhook endpoints MUST verify the sender.
  Preferred: provider signature verification. Acceptable: a shared secret in an HTTP header validated
  server-side.
- **Secret Transport (SHOULD)**: Shared secrets SHOULD be passed via headers, not query parameters.
- **Workflow Secrets (MUST)**: Secrets MUST NOT be hard-coded in code, docs, or tracked config
  exports. Use `$env` (server) only. Documentation examples MUST use placeholder values
  (for example `<WEBHOOK_SECRET>`), never real keys or tokens.
- **Core Modules Strategy (MUST)**:
    - **Cart**: Managed via `catalog`/`cart` context state. Supports raw-item insertion for wishlist integration.
    - **Orders**: Strict state machine (`pending` -> `paid` -> `processing`) in
      `src/lib/domains/order/domain/`.
    - **Payment**: Stripe Elements integration with strictly typed PaymentIntent handling.
- **Rationale**: Authenticated, idempotent side effects keep orders correct and protect customer data.

### VI. Error Handling & Debugging
- **Compiler/Linter First (MUST)**: Fix new compiler warnings and lint warnings as part of the change.
- **Automated Validation (MUST)**: `npm run lint` and `npm run check` MUST pass before code is
  committed or merged.
- **Context Awareness (MUST)**: Maintain clear boundaries between SSR and CSR execution contexts.
- **Rationale**: Fast feedback loops prevent shipping runtime-only failures.

### VII. Code Elegance & Efficiency (The "Essential Luxury" Code)
- **Conciseness (SHOULD)**: Prefer the smallest solution that stays readable and expressive.
- **Platform First (SHOULD)**: Prefer built-in platform features (Svelte runes, fetch, etc.) over
  third-party bloat.
- **Maintainability (SHOULD)**: Prefer declarative patterns over imperative ones; every line must
  earn its place.
- **Rationale**: Lower complexity increases velocity and reduces regression risk.

### VIII. Spec-Driven Workflow (The Law)
- **Traceability (MUST)**: Every code change MUST trace back to an approved task. Where a
  `specs/<feature>/` tree exists, cite its `tasks.md` task ID.
- **Plan Fidelity (MUST)**: Deviations from the approved plan during implementation require a
  documented amendment to the plan; silent drift is a violation.
- **Rationale**: Spec-driven constraints prevent scope creep and keep implementation deterministic.

### IX. Bounded Contexts & Layering (The Seam)

This principle codifies the folder structure the codebase already implements. It is the rule
that `dependency-cruiser` enforces and that `eslint.config.js` cites as "Constitution IV".
It exists because the previous restructure produced the right *shape* but left the *seam*
unenforced: modules that the seam says are private were being imported directly across
contexts, and the rule forbidding it was silent.

- **Bounded Contexts (MUST)**: Business capabilities live in `src/lib/domains/<context>/`.
  The current set is `admin`, `cart`, `catalog`, `checkout`, `content`, `customer`, `order`,
  `payment`, `platform`. A context is defined by the language and invariants it owns, not by
  a table or a screen. Adding a tenth context requires an ADR.
- **The Four Layers (MUST)**:
    - **`domain/`** — pure model and rules. MUST NOT import `$app/*`, `pocketbase`, any
      `.server.ts` module, any `.svelte`/`.svelte.ts` module, or another context's `domain/`.
      It MAY import `$shared/kernel` only. Framework-free by construction, so it is testable
      with no harness.
    - **`application/`** — use-case orchestration (`.server.ts`). MAY import its own context's
      `domain/` and `infrastructure/`, and other contexts' *barrels*.
    - **`infrastructure/`** — adapters to PocketBase, Stripe, S3, SMTP. MAY import its own
      context's `domain/`.
    - **`ui/`** — Svelte components and rune state. MAY import its own context's `domain/` and
      `$shared/ui`.
- **The Interface Is The Barrel (MUST)**: Each context exposes exactly two barrels —
  `index.ts` (client-safe: `domain/` + `ui/`) and `server.ts` (server-only: `domain/`,
  `application/`, `infrastructure/`). Everything else in the context is implementation detail.
    - **Cross-context imports MUST target a barrel.** Importing past a barrel into another
      context's `domain/`, `application/`, or `infrastructure/` is forbidden — without
      exception, including for "just a pure helper".
    - `index.ts` MUST NOT export any `.server.ts` module.
- **Contexts Are Server-Only By Default (MUST)**: A context has an `index.ts` only if it has a
  `ui/` layer. `admin`, `payment`, and `platform` are server-only and expose only `server.ts`.
- **Kernel Is Not A Context (MUST)**: `src/lib/shared/kernel/` holds cross-context primitives
  (price, date, slug, errors, messages). Kernel code MUST be pure and framework-free — it
  MUST NOT import `$env`, `$app/*`, `pocketbase`, or any context. Anything that is not
  genuinely universal belongs in a context instead.
- **Enforcement (MUST)**: These rules are enforced by `.dependency-cruiser.cjs` via
  `npm run depcruise`, which MUST be green before commit. Rule changes MUST be reviewed as
  seriously as code changes.
- **Rationale**: Depth comes from a small interface over a large implementation. A barrel that
  callers can bypass is not an interface — it is a convention, and conventions decay silently.
  Enforcing the seam mechanically is what keeps the layering true a year from now.

## Governance
- **Authority**: This constitution supersedes all other coding practices in the repository.
- **Amendments**:
    - Any change MUST be made via PR and MUST include an updated Sync Impact Report.
    - Ratification date MUST remain the original adoption date.
    - Last amended date MUST be updated to the amendment date.
- **Versioning**:
    - MAJOR: Backward-incompatible governance changes, removals, or redefinitions of principles.
    - MINOR: New principle/section added or materially expanded guidance.
    - PATCH: Clarifications, wording, typo fixes, and non-semantic refinements.
- **Compliance Reviews**:
    - Plans MUST include a "Constitution Check" gate before design and MUST re-check after design.
    - PRs MUST show traceability (links to the approved plan, plus task IDs where a spec tree exists).
    - PRs MUST NOT include secrets.
    - Reviewers MUST reject PRs violating MUST-level rules, regardless of functional correctness.

**Version**: 1.6.0 | **Ratified**: 2026-01-27 | **Last Amended**: 2026-09-12
