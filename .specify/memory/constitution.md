# E-Commerce Project Constitution

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
- **Typography**: Use modern, clean typography (e.g., Inter, Outfit).
- **Color Palettes**: Use curated HSL tailored colors and smooth gradients. Ensure a consistent, premium dark/light mode experience.
- **Motion**: Prioritize native `transition:` and `animate:flip`. Use GPU-accelerated properties (`transform`, `opacity`) for all animations.

### III. Performance & Assets
- **Preloading**: All links must have `data-sveltekit-preload-data="hover"` enabled.
- **Image Optimization**: Mandatory use of `@sveltejs/enhanced-img` with `decoding="async"`, `loading="lazy"`.
- **Layout Stability**: Set `aspect-ratio` on images to prevent layout shifts.

### IV. Type Safety (Type Convergence)
- **Source of Truth**: Always extend from `src/lib/pocketbase-types.ts` (generated from DB).
- **Domain Types**: Define View Models in `src/lib/types.ts` by extending DB types.

### V. Backend & Architecture (Adaptive Edge)
- **Three-Tier Architecture**:
    - **Tier 1 (Display)**: Optimized queries for `products`, `pages`.
    - **Tier 2 (Ops)**: Precise tracking of `variants`, `SKUs`, and financial details.
    - **Tier 3 (Extension)**: JSON attributes for non-searchable metadata.
- **Stripe Hybrid Driver**: Stripe is the Source of Truth for Prices; SvelteKit Webhooks sync data to PocketBase (Marketing Source of Truth).
- **Optimistic Concurrency Control (OCC)**: Mandatory server-side stock verification before updates to prevent overselling.
- **Security**: Strict `$env` separation for server-side secrets. Use `withAdmin` for privileged operations.
- **Automation Policy**: Core business logic (Orders, Inventory) stays in SvelteKit; n8n handles side-effects (Email Notifications, Reporting).

### VI. Error Handling & Debugging
- **Compiler First**: Fix all compiler warnings immediately.
- **Context Awareness**: Maintain clear boundaries between SSR and CSR execution contexts.

### VII. Code Elegance & Efficiency (The "Essential Luxury" Code)
- **Conciseness**: Follow the "Essential Luxury" philosophy—strip away redundant logic. Use the shortest code possible that remains readable and expressive.
- **Stability & Performance**: Prioritize built-in platform features (Svelte native runes, fetch, etc.) over third-party bloat.
- **Maintainability**: Prefer declarative patterns over imperative ones. Every line must serve a purpose; if it's "nice to have," it's "too much."

## Governance
- This constitution supersedes all other coding practices in the project.
- Every new feature must be validated against these rules during the `Plan` and `Analyze` phases.

**Version**: 1.0.0 | **Ratified**: 2026-01-27 | **Last Amended**: 2026-01-27
