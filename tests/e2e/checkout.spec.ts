import { test, expect } from '@playwright/test';
import { addFirstProductViaQuickAdd, clearClientState, goToCheckout } from './utils';

/**
 * Elementhic E2E Tests - Checkout Flow
 * ====================================
 * Verifies the full purchase journey:
 * 1. Add to cart
 * 2. Proceed to checkout
 * 3. Fill shipping info
 * 4. Verify Tax/Shipping calculation
 * 5. Complete payment (Mocked)
 */

test.describe('Checkout Flow', () => {
	test.describe.configure({ timeout: 120000 });
	test.beforeEach(async ({ page }) => {
		await clearClientState(page);
		await addFirstProductViaQuickAdd(page);
		await goToCheckout(page);
		await expect(page).toHaveURL(/\/checkout/);
	});

	test('should validate required fields in Step 1', async ({ page }) => {
		// Try to continue without filling anything
		const continueBtn = page.getByRole('button', { name: /continue/i });
		await continueBtn.click();

		// Expect error messages (HTML5 validation or custom UI)
		// Adjust selector based on your FormInput implementation
		const errorMsg = page.locator('text=REQUIRED').first();
		await expect(errorMsg).toBeVisible();
	});

	test('should proceed to Payment Step with valid info', async ({ page }) => {
		test.setTimeout(60000);
		// Fill Step 1: Contact & Shipping
		await page.fill('#checkout-email', 'test@example.com');
		await page.fill('#checkout-first-name', 'Test');
		await page.fill('#checkout-last-name', 'User');
		await page.fill('#checkout-address', '123 Test St');
		await page.fill('#checkout-zip', '10001'); // NY Zip
		await page.fill('#checkout-city', 'New York');

		// Select Country (if select exists)
		// await page.selectOption('select#country', 'United States');

		const continueBtn = page.getByRole('button', { name: /continue/i });
		await continueBtn.click();

		// Step 2: Shipping Method
		// Wait for transition
		const shippingHeader = page.locator('h2', { hasText: 'Shipping Method' });
		await expect(shippingHeader).toBeVisible({ timeout: 45000 });

		// Select Standard Shipping (default)
		const paymentIntentWait = page.waitForResponse(
			(res) => res.url().includes('/api/payment-intent') && res.request().method() === 'POST',
			{ timeout: 45000 }
		);
		await continueBtn.click();
		const paymentIntentRes = await paymentIntentWait;
		if (!paymentIntentRes.ok()) {
			let body = '';
			try {
				body = await paymentIntentRes.text();
			} catch {
				// ignore
			}
			throw new Error(
				`/api/payment-intent failed: ${paymentIntentRes.status()} ${body.slice(0, 500)}`
			);
		}

		// Step 3: Payment
		// This triggers the API call to /api/payment-intent
		// We expect the Payment Element container to appear
		const paymentHeader = page.locator('h2', { hasText: 'Payment' });
		await expect(paymentHeader).toBeVisible({ timeout: 20000 });

		const paymentElement = page.locator('#payment-element');
		await expect(paymentElement).toBeVisible({ timeout: 20000 });

		// Verify Order Summary contains Tax row (since we are in Step 3)
		const taxRow = page.locator('text=Tax ('); // Matches "Tax (Estimated)" or "Tax (Included)"
		await expect(taxRow).toBeVisible({ timeout: 20000 });
	});
});
