import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';

function isWebkitSupported(): boolean {
	// Playwright does not support WebKit on macOS 13 (darwin 22.x).
	// macOS 14+ is darwin 23+.
	if (process.platform !== 'darwin') return true;
	const major = Number(os.release().split('.')[0]);
	return Number.isFinite(major) && major >= 23;
}

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		...(isWebkitSupported()
			? [
					{
						name: 'Mobile Safari',
						use: { ...devices['iPhone 13'] }
					}
				]
			: [])
	],

	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	}
});
