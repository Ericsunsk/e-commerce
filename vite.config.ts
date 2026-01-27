import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		enhancedImages(), // 用于本地静态图片优化
		sveltekit()
	],
	ssr: {
		noExternal: ['sveltekit-superforms']
	},
	optimizeDeps: {
		exclude: ['@valibot/to-json-schema']
	}
});
