import { expect, type Page } from '@playwright/test';

export async function gotoPath(
	page: Page,
	path: string,
	opts?: { timeout?: number; retries?: number }
) {
	const timeout = opts?.timeout ?? 30000;
	const retries = opts?.retries ?? 3;
	const expectedPathname = path.split('?')[0] || '/';
	let lastError: unknown;

	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			await page.goto(path, { waitUntil: 'domcontentloaded', timeout });
			await page.waitForURL((url) => url.pathname === expectedPathname, { timeout: 15000 });
			return;
		} catch (e: unknown) {
			lastError = e;
			const msg = e instanceof Error ? e.message : String(e);
			// WebKit can occasionally interrupt navigations; retry.
			if (msg.includes('interrupted by another navigation')) {
				await page.waitForTimeout(250);
				continue;
			}
			// Retry once on generic timeouts as well.
			if (msg.toLowerCase().includes('timeout')) {
				await page.waitForTimeout(250);
				continue;
			}
			throw e;
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error(`Failed to navigate to ${path}: ${String(lastError)}`);
}

export async function clearClientState(page: Page) {
	await gotoPath(page, '/');
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
}

export async function dismissCookieBanner(page: Page) {
	const acceptAll = page.getByRole('button', { name: /^Accept All$/i });
	try {
		await acceptAll.click({ timeout: 3000 });
		return;
	} catch {
		// ignore
	}

	const essentialOnly = page.getByRole('button', { name: /^Essential Only$/i });
	try {
		await essentialOnly.click({ timeout: 3000 });
	} catch {
		// ignore
	}
}

export async function addFirstProductViaQuickAdd(page: Page) {
	await gotoPath(page, '/shop');
	await dismissCookieBanner(page);

	const firstCard = page.locator('.product-card').first();
	await expect(firstCard).toBeVisible({ timeout: 10000 });
	await dismissCookieBanner(page);
	await firstCard.hover();

	const quickAddBtn = firstCard.getByRole('button', { name: /quick add/i });
	await expect(quickAddBtn).toBeVisible({ timeout: 5000 });
	await quickAddBtn.click();

	// Toast is role=alert; wait briefly to ensure cart mutation settles.
	const addedToast = page
		.getByRole('alert')
		.filter({ hasText: /ADDED .* TO BAG/i })
		.first();
	try {
		await expect(addedToast).toBeVisible({ timeout: 5000 });
	} catch {
		// If toast timing/animation differs, still allow flow to continue.
		await page.waitForTimeout(500);
	}
}

export async function goToCheckout(page: Page) {
	await gotoPath(page, '/checkout');
	await dismissCookieBanner(page);
	const summaryHeading = page.getByRole('heading', { name: /order summary/i }).first();
	await expect(summaryHeading).toBeVisible({ timeout: 15000 });
	await dismissCookieBanner(page);
}

export async function openMobileMenu(page: Page) {
	const existing = page
		.locator('[role="dialog"]')
		.filter({ hasText: /wishlist/i })
		.first();
	try {
		if (await existing.isVisible({ timeout: 200 })) return existing;
	} catch {
		// ignore
	}

	const toggle = page.getByRole('button', { name: /toggle menu/i });
	try {
		if (await toggle.isVisible({ timeout: 500 })) {
			await toggle.click();
			await expect(existing).toBeVisible({ timeout: 5000 });
			return existing;
		}
	} catch {
		// ignore
	}

	return null;
}

export async function clickNavLink(page: Page, linkName: RegExp) {
	// Prefer desktop header nav if visible
	const desktopLink = page.locator('header').getByRole('link', { name: linkName }).first();
	try {
		if (await desktopLink.isVisible({ timeout: 500 })) {
			await desktopLink.click();
			return;
		}
	} catch {
		// ignore
	}

	// Fallback: mobile menu
	const menu = await openMobileMenu(page);
	if (!menu) throw new Error('Mobile menu not available');
	const mobileLink = menu.getByRole('link', { name: linkName }).first();
	await expect(mobileLink).toBeVisible({ timeout: 5000 });
	await mobileLink.click();
}

export async function openCartDrawer(page: Page) {
	// Ensure header is visible (desktop) before interacting.
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(200);

	const desktopBag = page.locator('header').getByRole('button', { name: /bag/i }).first();
	try {
		if (await desktopBag.isVisible({ timeout: 500 })) {
			await desktopBag.click();
			const heading = page.getByRole('heading', { name: /shopping bag/i }).first();
			await expect(heading).toBeVisible({ timeout: 5000 });
			return;
		}
	} catch {
		// ignore
	}

	const menu = await openMobileMenu(page);
	if (!menu) throw new Error('Cart trigger not found');
	const mobileBag = menu.getByRole('button', { name: /bag/i }).first();
	await expect(mobileBag).toBeVisible({ timeout: 5000 });
	await mobileBag.click();

	const heading = page.getByRole('heading', { name: /shopping bag/i }).first();
	await expect(heading).toBeVisible({ timeout: 5000 });
}
