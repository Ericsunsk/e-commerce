import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// Svelte 5 Runes - 禁止旧版 API
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'svelte/store',
							message: '❌ Constitution I: 使用 Svelte 5 Runes ($state, $derived) 替代 stores'
						},
						{
							name: 'zod/v3',
							message: '❌ Constitution IV: 使用 zod v4，禁止 zod/v3 导入'
						}
					]
				}
			],
			// TypeScript 最佳实践
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			// Svelte 规则
			'svelte/no-at-html-tags': 'warn',
			'svelte/require-each-key': 'warn', // 降级为 warning，逐步修复
			// 关闭过于严格的导航规则（SvelteKit 动态路由场景复杂）
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/no-unused-svelte-ignore': 'warn'
		}
	},
	{
		ignores: [
			'.svelte-kit/',
			'build/',
			'node_modules/',
			'*.config.js',
			'*.config.ts',
			'src/lib/pocketbase-types.ts', // 自动生成的类型文件
			'src/lib/stores/*.svelte.ts', // Svelte 5 Runes 特殊语法文件
			'**/shop/\\[id\\]/**' // 复杂模板语法，ESLint 解析器无法处理
		]
	},
	{
		// 针对特定文件放宽规则
		files: ['**/*.ts', '**/*.svelte'],
		rules: {
			'no-case-declarations': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn'
		}
	}
);
