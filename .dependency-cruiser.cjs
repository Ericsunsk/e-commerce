/**
 * Dependency-cruiser config: forbid circular dependencies in first-party code.
 * Third-party `node_modules` cycles are ignored (not actionable).
 */
module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'Circular imports between first-party modules break bundling and reasoning.',
			from: { pathNot: 'node_modules' },
			to: { circular: true, pathNot: 'node_modules' }
		}
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		tsPreCompilationDeps: true
	}
};
