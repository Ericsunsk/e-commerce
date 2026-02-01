<!--
SYNC IMPACT REPORT
Version: 1.3.1 -> 1.3.2
List of modified principles:
- II. Apple UX Style & Aesthetics: Added Iconography and Styling Engine mandates.
Added sections: None
Removed sections: None
Templates requiring updates:
- .specify/templates/plan-template.md (✅ verified)
- .specify/templates/spec-template.md (✅ verified)
- .specify/templates/tasks-template.md (✅ verified)
Follow-up TODOs: None
-->

# ELEMENTHIC Project Constitution

## Core Principles

### I. SvelteKit + Svelte 5 Protocol (The Runes)
- **Reactivity**: Strictly use `$state`, `$derived`, `$props`. Destructuring is enabled and preferred.
- **State Management**:
    - **Async Data**: Use **TanStack Query v5** for all server-synced state (Cart, Wishlist, Products).
    - **Local UI State**: Use Svelte 5 **Runes** for transient UI state.
    - **Global Hooks**: Complex state logic reside in `src/lib/stores/*.svelte.ts`.
- **Data Fetching**: Mandatory SSR via `+page.server.ts` for primary data.
- **API Development**: Use `apiHandler` wrapper to standardize error handling and auth checks.
- **UI Logic**: Utilize `{#snippet}` for local UI; standard `{#if}`, `{#each}`, `{#await}` blocks.

### II. Apple UX Style & Aesthetics
- **Premium Design**: Prioritize high-quality, vibrant aesthetics. Avoid generic browser defaults.
- **Styling Engine**: **Tailwind CSS v4** is mandatory. Use `@theme` blocks for design tokens.
- **Typography**: Use modern, clean typography (e.g., Inter, Outfit).
- **Icons**: Use **Lucide Svelte** (stroke width 1.5px-2px). Consistency with typography is paramount.
- **Color Palettes**: Use curated HSL tailored colors and smooth gradients. Ensure a consistent, premium dark/light mode experience.
- **Motion**: Prioritize native `transition:` and `animate:flip`. Use GPU-accelerated properties (`transform`, `opacity`) for all animations.

### III. Performance & Assets
- **Preloading**: All links must have `data-sveltekit-preload-data="hover"` enabled.
- **Image Optimization**: Mandatory use of `@sveltejs/enhanced-img` with `decoding="async"`, `loading="lazy"`.
- **Layout Stability**: Set `aspect-ratio` on images to prevent layout shifts.

### IV. Type Safety (Type Convergence)
- **Source of Truth**: Always extend from `src/lib/pocketbase-types.ts` (generated from DB).
- **Domain Types**: Define View Models in `src/lib/types.ts` by extending DB types.
- **Validation**: Strict use of **Zod v4** (imported as `zod`) for all schemas. `sveltekit-superforms` must use the `zod4` adapter. No `zod/v3` legacy imports allowed.
    - *Exception*: For `zodClient` adapters requiring `superRefine`, `as any` casting is permitted if strict types conflict with library internals.
- **Protocol (Strict Mode)**:
    - **PocketBase**: All responses must use types from `src/lib/pocketbase-types.ts`. Never use `RecordModel` or `any`. Handle expansions with specific interfaces.
    - **API Handlers**: Always use `catch (e: unknown)` and extract errors safely. Never return untyped JSON.
    - **DTOs**: Define explicit Data Transfer Objects in `src/lib/types.ts`.

### V. Backend & Architecture (Adaptive Edge)
- **Three-Tier Architecture**:
    - **Tier 1 (Display)**: Optimized queries for `products`, `pages`.
    - **Tier 2 (Ops)**: Precise tracking of `variants`, `SKUs`, and financial details.
    - **Tier 3 (Extension)**: JSON attributes for non-searchable metadata.
- **Stripe Hybrid Driver**: Stripe is the Source of Truth for Prices; SvelteKit Webhooks sync data to PocketBase (Marketing Source of Truth).
- **Optimistic Concurrency Control (OCC)**: Mandatory server-side stock verification before updates to prevent overselling.
- **Security**: Strict `$env` separation for server-side secrets. Use `withAdmin` for privileged operations.
- **Automation Policy**: Core business logic (Orders, Inventory) stays in SvelteKit; n8n handles side-effects (Email Notifications, Reporting).
- **Side-Effect Idempotency**: All webhook handlers (Stripe, etc.) MUST be idempotent and log execution status to PocketBase before triggering n8n flows.
- **Core Modules Strategy**:
    - **Cart**: Managed via `cart.svelte.ts` (TanStack Query). Supports `addRawItem` for wishlist integration.
    - **Orders**: Strict state machine (`pending` -> `paid` -> `processing`) in `lib/server/orders.ts`.
    - **Payment**: Stripe Elements integration with strictly typed PaymentIntent handling.

### VI. Error Handling & Debugging
- **Compiler First**: Fix all compiler warnings and linting warnings immediately.
- **Automated Validation**: All code must pass `npm run lint` and `npm run check` before being committed or merged.
- **Context Awareness**: Maintain clear boundaries between SSR and CSR execution contexts.

### VII. Code Elegance & Efficiency (The "Essential Luxury" Code)
- **Conciseness**: Follow the "Essential Luxury" philosophy—strip away redundant logic. Use the shortest code possible that remains readable and expressive.
- **Stability & Performance**: Prioritize built-in platform features (Svelte native runes, fetch, etc.) over third-party bloat.
- **Maintainability**: Prefer declarative patterns over imperative ones. Every line must serve a purpose; if it's "nice to have," it's "too much."

### VIII. Spec-Driven Workflow (The Law)
- **No "Vibe Coding"**: Every line of code must trace back to a ratified Task from a `speckit` plan. "Feeling" the code is strictly prohibited.
- **Chain of Custody**: Features must progress strictly through: `Constitution` -> `Spec` -> `Plan` -> `Tasks` -> `Code`.
- **Plan Fidelity**: Deviations from `plan.md` during implementation require a documented amendment to the plan; silent drift is a violation.

## Governance
- This constitution supersedes all other coding practices in the project.
- Every new feature must be validated against these rules during the `Plan` and `Analyze` phases.
- **Compliance**: Pull Requests violating these principles must be rejected, regardless of functional correctness.

**Version**: 1.3.2 | **Ratified**: 2026-01-27 | **Last Amended**: 2026-02-01
