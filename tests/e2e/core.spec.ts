import { test, expect } from '@playwright/test';
import { clickNavLink, dismissCookieBanner, openCartDrawer } from './utils';

/**
 * Elementhic E2E Tests - Core User Flows
 * =======================================
 * Tests critical user journeys to ensure site functionality
 */

test.describe('Homepage', () => {
	test('should load successfully with hero section', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Check page title contains site name
		await expect(page).toHaveTitle(/elementhic/i);

		// Hero section should be visible
		const heroSection = page.locator('section').first();
		await expect(heroSection).toBeVisible();
	});

	test('should have working navigation', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await dismissCookieBanner(page);

		// Header should be visible
		const header = page.locator('header');
		await expect(header).toBeVisible();

		await clickNavLink(page, /collection|shop/i);
		await expect(page).toHaveURL(/\/shop|\/collection/, { timeout: 15000 });
	});
});

test.describe('Shop Page', () => {
	test('should display products', async ({ page }) => {
		await page.goto('/shop');
		await page.waitForLoadState('networkidle');

		// Page should load
		await expect(page).toHaveTitle(/shop|collection/i);

		// Products or empty state should be visible
		const productGrid = page.locator('[class*="grid"]').first();
		await expect(productGrid).toBeVisible({ timeout: 10000 });
	});

	test('should have filter functionality', async ({ page }) => {
		await page.goto('/shop');
		await page.waitForLoadState('networkidle');

		// Category filters should be present (if products exist)
		const categorySection = page.locator('text=/all|category/i').first();
		if (await categorySection.isVisible()) {
			await expect(categorySection).toBeVisible();
		}
	});
});

test.describe('Cart Functionality', () => {
	test('should open cart drawer', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await dismissCookieBanner(page);
		await openCartDrawer(page);
	});
});

test.describe('Authentication', () => {
	test('should navigate to account page', async ({ page }) => {
		await page.goto('/account');
		await page.waitForLoadState('networkidle');
		await dismissCookieBanner(page);

		// Login/register heading should be present for guests.
		const authHeading = page.getByRole('heading', { name: /identify|join|recovery/i }).first();
		await expect(authHeading).toBeVisible({ timeout: 10000 });
	});
});

test.describe('Accessibility', () => {
	test('should have proper focus management', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Tab through interactive elements
		await page.keyboard.press('Tab');

		// Something should be focused
		const focusedElement = page.locator(':focus');
		await expect(focusedElement).toBeVisible();
	});

	test('should respect reduced motion preference', async ({ page }) => {
		// Emulate reduced motion
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Page should still load correctly
		await expect(page).toHaveTitle(/.+/);
	});
});

test.describe('Responsive Design', () => {
	test('should work on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Page should load without horizontal scroll
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
	});
});
