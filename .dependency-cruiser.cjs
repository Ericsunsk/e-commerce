/**
 * Dependency-cruiser config — enforces Constitution Principle IX
 * (Bounded Contexts & Layering).
 *
 * The context's interface is its barrel: `index.ts` (client-safe) or
 * `server.ts` (server-only). Everything behind it is implementation detail.
 * These rules make that seam mechanical instead of aspirational.
 *
 * Run with: `npm run depcruise`.
 * Third-party `node_modules` cycles are ignored (not actionable).
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * The bounded contexts, read from disk rather than hard-coded so a new context
 * is covered by every rule below without editing this file. `admin`, `payment`
 * and `platform` are server-only and have no `index.ts` — that is by design
 * (Principle IX: a context has a client barrel only if it has a `ui/` layer).
 */
const contexts = fs
	.readdirSync(path.join(__dirname, 'src/lib/domains'), { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

/** Layer folders that are implementation detail, never a cross-context target. */
const CONTEXT_LAYERS = '(domain|application|infrastructure)';

/**
 * One rule per context, because dependency-cruiser cannot compare capture
 * groups between `from` and `to` — it has no backreference. A single rule
 * would therefore flag a context importing its *own* layers, producing ~200
 * false positives that bury the handful of real violations. The negative
 * lookahead excludes the source context explicitly.
 */
const noCrossContextDeepImport = contexts.map((context) => ({
	name: `no-cross-context-deep-import-from-${context}`,
	severity: 'error',
	comment:
		'Cross-context imports MUST target the owning context barrel ' +
		'($domains/<ctx> or $domains/<ctx>/server), never its domain/ application/ ' +
		'infrastructure/ layers. If what you need is not exported, widen the owning ' +
		'barrel. See Constitution Principle IX.',
	from: { path: `^src/lib/domains/${context}/` },
	to: { path: `^src/lib/domains/(?!${context}/)[^/]+/${CONTEXT_LAYERS}/` }
}));

module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'Circular imports between first-party modules break bundling and reasoning.',
			from: { pathNot: 'node_modules' },
			to: { circular: true, pathNot: 'node_modules' }
		},

		...noCrossContextDeepImport,

		{
			// Principle IX: "domain/ MUST NOT import ... another context's domain/."
			// The domain layer is the pure model; it may reach $shared/kernel only.
			name: 'domain-purity',
			severity: 'error',
			comment:
				'domain/ is the pure model: no PocketBase, no .server.ts, no Svelte, ' +
				'no shared infrastructure, no shared ui. It may import $shared/kernel only. ' +
				'See Constitution Principle IX.',
			from: { path: '^src/lib/domains/[^/]+/domain/' },
			to: {
				path: [
					'^node_modules/pocketbase',
					'^src/lib/.*\\.server\\.ts$',
					'^src/lib/.*\\.svelte\\.ts$',
					'^src/lib/.*\\.svelte$',
					'^src/lib/shared/infrastructure/',
					'^src/lib/shared/ui/'
				]
			}
		},

		{
			// Principle IX: "Kernel ... MUST be pure and framework-free."
			name: 'kernel-purity',
			severity: 'error',
			comment:
				'src/lib/shared/kernel is cross-context primitives and must stay pure: ' +
				'no $env, no $app, no PocketBase, no bounded context. ' +
				'See Constitution Principle IX.',
			from: { path: '^src/lib/shared/kernel/' },
			to: {
				path: [
					'^node_modules/pocketbase',
					'^src/lib/.*\\.server\\.ts$',
					'^src/lib/.*\\.svelte',
					'^src/lib/shared/infrastructure/',
					'^src/lib/shared/ui/',
					'^src/lib/domains/'
				]
			}
		},

		{
			// Principle IX: "`index.ts` MUST NOT export any `.server.ts` module."
			// A client barrel leaking server code breaks client bundling.
			name: 'no-server-leak-in-client-barrel',
			severity: 'error',
			comment:
				'A client barrel (domains/*/index.ts, shared/*/index.ts) must not reach a ' +
				'.server.ts module. See Constitution Principle IX.',
			from: { path: '^src/lib/(domains|shared)/[^/]+/index\\.ts$' },
			to: { path: '\\.server\\.ts$' }
		},

		{
			name: 'no-orphans',
			severity: 'warn',
			comment:
				'Unreachable first-party module. Either wire it up or delete it — dead ' +
				'infrastructure is indistinguishable from intended infrastructure.',
			from: {
				orphan: true,
				pathNot: [
					// Legitimately unreferenced: tests, entry points, barrels, UI
					// components (Svelte resolves those through the framework).
					'\\.test\\.ts$',
					'\\.spec\\.ts$',
					'/index\\.ts$',
					'/server\\.ts$',
					'^src/routes/',
					'^src/hooks\\.',
					'^src/app\\.',
					'\\.svelte$'
				]
			},
			to: {}
		}
	],

	options: {
		doNotFollow: { path: 'node_modules' },
		tsPreCompilationDeps: true,
		// The `$domains/*` and `$shared/*` aliases must resolve or every rule above
		// silently matches nothing: aliased imports land as `couldNotResolve: true`,
		// hiding the cross-context graph entirely. That is why the previous
		// `no-circular`-only config reported "no violations" while real bypasses
		// existed. `tsconfig.depcruise.json` re-declares the SvelteKit aliases with a
		// root-relative include — the generated `.svelte-kit/tsconfig.json` cannot be
		// used directly, since its include paths are relative to `.svelte-kit/`
		// (TS18003).
		tsConfig: { fileName: 'tsconfig.depcruise.json' }
	}
};
