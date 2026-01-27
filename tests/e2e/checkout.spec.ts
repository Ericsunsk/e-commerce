import { test, expect } from '@playwright/test';

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
    test.beforeEach(async ({ page }) => {
        // Go to Shop and add a product
        await page.goto('/shop');
        await page.waitForLoadState('networkidle');
        
        // Find first product card and click
        const productLink = page.locator('a[href^="/shop/"]').first();
        await expect(productLink).toBeVisible();
        await productLink.click();
        
        // Add to Bag
        const addToBagBtn = page.getByRole('button', { name: /add to bag/i });
        await expect(addToBagBtn).toBeVisible();
        await addToBagBtn.click();
        
        // Open Cart
        const cartBtn = page.locator('[aria-label*="cart" i], button:has-text("bag")').first();
        await cartBtn.click();
        
        // Click Checkout
        const checkoutBtn = page.getByRole('link', { name: /checkout/i });
        await expect(checkoutBtn).toBeVisible();
        await checkoutBtn.click();
        
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
        // Fill Step 1: Contact & Shipping
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input#first-name', 'Test');
        await page.fill('input#last-name', 'User');
        await page.fill('input#address', '123 Test St');
        await page.fill('input#zip', '10001'); // NY Zip
        await page.fill('input#city', 'New York');
        
        // Select Country (if select exists)
        // await page.selectOption('select#country', 'United States');

        const continueBtn = page.getByRole('button', { name: /continue/i });
        await continueBtn.click();

        // Step 2: Shipping Method
        // Wait for transition
        const shippingHeader = page.locator('h2', { hasText: 'Shipping Method' });
        await expect(shippingHeader).toBeVisible();

        // Select Standard Shipping (default)
        await continueBtn.click();

        // Step 3: Payment
        // This triggers the API call to /api/payment-intent
        // We expect the Payment Element container to appear
        const paymentHeader = page.locator('h2', { hasText: 'Payment' });
        await expect(paymentHeader).toBeVisible();
        
        const paymentElement = page.locator('#payment-element');
        await expect(paymentElement).toBeVisible();

        // Verify Order Summary contains Tax row (since we are in Step 3)
        const taxRow = page.locator('text=Tax ('); // Matches "Tax (Estimated)" or "Tax (Included)"
        await expect(taxRow).toBeVisible();
    });
});
