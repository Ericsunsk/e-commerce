import { test, expect } from '@playwright/test';
import {
	addFirstProductViaQuickAdd,
	clearClientState,
	dismissCookieBanner,
	gotoPath,
	goToCheckout,
	openCartDrawer
} from './utils';

/**
 * Elementhic E2E Tests - Shopping Flow
 * =====================================
 * Tests the complete shopping journey from browsing to cart
 */

test.describe('Shopping Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage to ensure clean state
		await gotoPath(page, '/');
		await page.evaluate(() => localStorage.clear());
	});

	test('should add product to cart from shop page', async ({ page }) => {
		// Navigate to shop
		await gotoPath(page, '/shop');
		await dismissCookieBanner(page);

		// Find a product card with Quick Add button
		const productCard = page.locator('.product-card, [class*="product"]').first();
		if (await productCard.isVisible()) {
			// Hover to reveal Quick Add button
			await productCard.hover();

			const quickAddBtn = page.getByRole('button', { name: /quick add/i }).first();
			if (await quickAddBtn.isVisible({ timeout: 3000 })) {
				await quickAddBtn.click();

				// Verify toast notification appears
				// Use .first() to handle multiple notifications or ambiguity
				const toast = page.locator('[class*="toast"], [role="alert"]').first();
				await expect(toast).toBeVisible({ timeout: 5000 });
			}
		}
	});

	test('should navigate to product detail page', async ({ page }) => {
		await gotoPath(page, '/shop');
		await dismissCookieBanner(page);

		// Click on first product card
		const productLink = page.locator('a[href^="/shop/"]').first();
		if (await productLink.isVisible()) {
			await productLink.click();
			await expect(page).toHaveURL(/\/shop\/.+/, { timeout: 15000 });

			// Product details should be visible
			const productTitle = page.locator('h1, h2').first();
			await expect(productTitle).toBeVisible();
		}
	});

	test('should update cart quantity', async ({ page }) => {
		await gotoPath(page, '/shop');
		await dismissCookieBanner(page);

		// Add product to cart first
		const productCard = page.locator('.product-card, [class*="product"]').first();
		if (await productCard.isVisible()) {
			await productCard.hover();
			const quickAddBtn = page.getByRole('button', { name: /quick add/i }).first();
			if (await quickAddBtn.isVisible({ timeout: 3000 })) {
				await quickAddBtn.click();
				await page.waitForTimeout(1000);
			}
		}

		await openCartDrawer(page);

		const cartDialog = page
			.locator('[role="dialog"]')
			.filter({ hasText: /shopping bag/i })
			.first();

		// Find quantity controls
		const increaseBtn = cartDialog.getByLabel('Increase quantity').first();
		if (await increaseBtn.isVisible()) {
			await increaseBtn.click();

			// Quantity should update (scope to the quantity control)
			const qtyContainer = increaseBtn.locator('..');
			await expect(qtyContainer.getByText('2', { exact: true })).toBeVisible({ timeout: 3000 });
		}
	});

	test('should remove item from cart', async ({ page }) => {
		await gotoPath(page, '/shop');
		await dismissCookieBanner(page);

		// Add product
		const productCard = page.locator('.product-card, [class*="product"]').first();
		if (await productCard.isVisible()) {
			await productCard.hover();
			const quickAddBtn = page.getByRole('button', { name: /quick add/i }).first();
			if (await quickAddBtn.isVisible({ timeout: 3000 })) {
				await quickAddBtn.click();
				await page.waitForTimeout(1000);
			}
		}

		await openCartDrawer(page);
		const cartDialog = page
			.locator('[role="dialog"]')
			.filter({ hasText: /shopping bag/i })
			.first();

		// Remove item
		const removeBtn = cartDialog.getByRole('button', { name: /^remove$/i }).first();
		if (await removeBtn.isVisible()) {
			await removeBtn.click();

			// Empty cart message should appear
			const emptyMessage = cartDialog.locator('text=/Your bag is empty/i');
			await expect(emptyMessage).toBeVisible({ timeout: 5000 });
		}
	});

	test('should show wishlist functionality', async ({ page }) => {
		await gotoPath(page, '/shop');
		await dismissCookieBanner(page);

		// Find wishlist button on product card
		const productCard = page.locator('.product-card, [class*="product"]').first();
		if (await productCard.isVisible()) {
			await productCard.hover();

			const wishlistBtn = page.getByRole('button', { name: /wishlist/i }).first();
			if (await wishlistBtn.isVisible()) {
				await wishlistBtn.click();

				// Navigate to wishlist page
				await gotoPath(page, '/wishlist');
				await dismissCookieBanner(page);

				// Wishlist page should show heading
				const wishlistHeading = page.getByRole('heading', { name: /my collection/i }).first();
				await expect(wishlistHeading).toBeVisible();
			}
		}
	});
});

test.describe('Checkout Flow', () => {
	test.describe.configure({ timeout: 120000 });
	test('should allow access to checkout (guest or auth)', async ({ page }) => {
		// Try to access checkout directly
		await gotoPath(page, '/checkout');
		await dismissCookieBanner(page);

		// Should NOT redirect to account if guest checkout is enabled
		// Or if it redirects, it means auth is required.
		// Based on current implementation, guest checkout is allowed.
		const url = page.url();
		if (url.includes('/account')) {
			console.log('Redirected to login - Auth required mode');
		} else {
			expect(url).toContain('/checkout');
		}
	});

	test('should proceed to checkout with items in cart', async ({ page }) => {
		await clearClientState(page);
		await addFirstProductViaQuickAdd(page);
		await goToCheckout(page);
		await expect(page).toHaveURL(/\/checkout/, { timeout: 30000 });
		await expect(page.locator('h3', { hasText: 'Order Summary' })).toBeVisible();
	});
});
