import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		enhancedImages(), // 用于本地静态图片优化
		sveltekit()
	],
	ssr: {
		noExternal: ['sveltekit-superforms']
	},
	resolve: {
		alias: {
			'valibot': path.resolve(__dirname, './src/lib/noop.ts'),
			'@valibot/to-json-schema': path.resolve(__dirname, './src/lib/noop.ts')
		}
	}
});
