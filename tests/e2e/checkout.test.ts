import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
	test('should add item to cart and reach payment step', async ({ page }) => {
		// 1. Go to Shop
		await page.goto('/shop');

		// Wait for products to load (skeleton gone)
		await page.waitForSelector('a[href^="/shop/"]');

		// Click the first product
		const firstProduct = page.locator('a[href^="/shop/"]').first();
		await firstProduct.click();

		// 2. Product Detail Page
		await expect(page).toHaveURL(/\/shop\/.+/);

		// Select a size (required to add to cart)
		const sizeButton = page.locator('button.border.text-\\[11px\\]:not([disabled])').first();
		if ((await sizeButton.count()) > 0) {
			await sizeButton.click();
		}

		// Click Add to Bag
		const addToBagBtn = page.getByRole('button', { name: 'ADD TO BAG' });
		await addToBagBtn.click();

		// Verify success toast
		// Matches "ADDED [PRODUCT] TO BAG"
		await expect(page.getByText(/ADDED.*TO BAG/)).toBeVisible();

		// Wait for mutation to settle
		await page.waitForTimeout(1000);

		// 3. Navigate to Checkout directly
		await page.goto('/checkout');

		// Check if Order Summary has items
		await expect(page.locator('h3', { hasText: 'Order Summary' })).toBeVisible();
		await expect(page.locator('.aspect-\\[3\\/4\\]')).toBeVisible(); // Image container

		// 4. Fill Checkout Form (Step 1: Information)
		await expect(page.locator('h2', { hasText: 'Contact Information' })).toBeVisible();

		await page.fill('#checkout-email', 'test@example.com');
		await page.fill('#checkout-first-name', 'Test');
		await page.fill('#checkout-last-name', 'User');
		await page.fill('#checkout-address', '123 Test St');
		await page.fill('#checkout-zip', '10001'); // US Zip
		await page.fill('#checkout-city', 'New York');

		// Click Continue
		await page.click('button:has-text("Continue")');

		// 5. Shipping Method (Step 2)
		await expect(page.locator('h2', { hasText: 'Shipping Method' })).toBeVisible();

		// Select standard shipping (default) and continue
		await page.click('button:has-text("Continue")');

		// 6. Payment (Step 3)
		// This is where we verify the fix.
		// We expect the Stripe Payment Element container to be present.
		await expect(page.locator('h2', { hasText: 'Payment' })).toBeVisible({ timeout: 15000 });

		// Check for the payment element container
		const paymentElement = page.locator('#payment-element');
		await expect(paymentElement).toBeVisible();
	});
});
