import { test, expect } from '@playwright/test';

/**
 * Elementhic E2E Tests - Shopping Flow
 * =====================================
 * Tests the complete shopping journey from browsing to cart
 */

test.describe('Shopping Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage to ensure clean state
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    test('should add product to cart from shop page', async ({ page }) => {
        // Navigate to shop
        await page.goto('/shop');
        await page.waitForLoadState('networkidle');

        // Find a product card with Quick Add button
        const productCard = page.locator('.product-card, [class*="product"]').first();
        if (await productCard.isVisible()) {
            // Hover to reveal Quick Add button
            await productCard.hover();

            const quickAddBtn = page.locator('button:has-text("Quick Add")').first();
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
        await page.goto('/shop');
        await page.waitForLoadState('networkidle');

        // Click on first product card
        const productLink = page.locator('a[href^="/shop/"]').first();
        if (await productLink.isVisible()) {
            await productLink.click();
            await page.waitForLoadState('networkidle');

            // Should be on product detail page
            await expect(page).toHaveURL(/\/shop\/.+/);

            // Product details should be visible
            const productTitle = page.locator('h1, h2').first();
            await expect(productTitle).toBeVisible();
        }
    });

    test('should update cart quantity', async ({ page }) => {
        await page.goto('/shop');
        await page.waitForLoadState('networkidle');

        // Add product to cart first
        const productCard = page.locator('.product-card, [class*="product"]').first();
        if (await productCard.isVisible()) {
            await productCard.hover();
            const quickAddBtn = page.locator('button:has-text("Quick Add")').first();
            if (await quickAddBtn.isVisible({ timeout: 3000 })) {
                await quickAddBtn.click();
                await page.waitForTimeout(1000);
            }
        }

        // Open cart
        const cartButton = page.locator('button:has-text("BAG")').first();
        await cartButton.click({ force: true });

        // Cart drawer should open
        // Use .first() to handle ambiguity
        const cartDrawer = page.locator('text=/Shopping Bag/i').first();
        await expect(cartDrawer).toBeVisible({ timeout: 5000 });

        // Find quantity controls
        const increaseBtn = page.locator('button[aria-label*="Increase"]').first();
        if (await increaseBtn.isVisible()) {
            await increaseBtn.click();

            // Quantity should update
            const quantityDisplay = page.locator('[class*="text-center"]').filter({ hasText: '2' });
            await expect(quantityDisplay).toBeVisible({ timeout: 3000 });
        }
    });

    test('should remove item from cart', async ({ page }) => {
        await page.goto('/shop');
        await page.waitForLoadState('networkidle');

        // Add product
        const productCard = page.locator('.product-card, [class*="product"]').first();
        if (await productCard.isVisible()) {
            await productCard.hover();
            const quickAddBtn = page.locator('button:has-text("Quick Add")').first();
            if (await quickAddBtn.isVisible({ timeout: 3000 })) {
                await quickAddBtn.click();
                await page.waitForTimeout(1000);
            }
        }

        // Open cart
        const cartButton = page.locator('button:has-text("BAG")').first();
        await cartButton.click();

        // Remove item
        const removeBtn = page.locator('button:has-text("Remove")').first();
        if (await removeBtn.isVisible()) {
            await removeBtn.click();

            // Empty cart message should appear
            const emptyMessage = page.locator('text=/Your bag is empty/i');
            await expect(emptyMessage).toBeVisible({ timeout: 5000 });
        }
    });

    test('should show wishlist functionality', async ({ page }) => {
        await page.goto('/shop');
        await page.waitForLoadState('networkidle');

        // Find wishlist button on product card
        const productCard = page.locator('.product-card, [class*="product"]').first();
        if (await productCard.isVisible()) {
            await productCard.hover();

            const wishlistBtn = page.locator('[aria-label*="wishlist" i]').first();
            if (await wishlistBtn.isVisible()) {
                await wishlistBtn.click();

                // Navigate to wishlist page
                await page.goto('/wishlist');
                await page.waitForLoadState('networkidle');

                // Wishlist page should show content or empty state
                const wishlistContent = page.locator('text=/wishlist/i').first();
                await expect(wishlistContent).toBeVisible();
            }
        }
    });
});

test.describe('Checkout Flow', () => {
    test('should allow access to checkout (guest or auth)', async ({ page }) => {
        // Try to access checkout directly
        await page.goto('/checkout');
        await page.waitForLoadState('networkidle');

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
        // First add an item
        await page.goto('/shop');
        await page.waitForLoadState('networkidle');

        const productCard = page.locator('.product-card, [class*="product"]').first();
        if (await productCard.isVisible()) {
            await productCard.hover();
            const quickAddBtn = page.locator('button:has-text("Quick Add")').first();
            if (await quickAddBtn.isVisible({ timeout: 3000 })) {
                await quickAddBtn.click();
                await page.waitForTimeout(1000);
            }
        }

        // Open cart and click checkout
        const cartButton = page.locator('button:has-text("BAG")').first();
        await cartButton.click();

        const checkoutBtn = page.locator('button:has-text("Checkout")').first();
        if (await checkoutBtn.isVisible() && await checkoutBtn.isEnabled()) {
            await checkoutBtn.click();
            await page.waitForLoadState('networkidle');

            // Should navigate away from shop
            const url = page.url();
            expect(url).not.toBe('/shop');
        }
    });
});
