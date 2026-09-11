import { describe, it, expect } from 'vitest';
import {
	ADMIN_TOKENS,
	ADMIN_PAGE,
	ADMIN_SEGMENTED,
	ADMIN_CARDS,
	ADMIN_BADGES,
	ADMIN_FORMS,
	ADMIN_BUTTONS,
	ADMIN_TABLE,
	ADMIN_FLOATING_BAR,
	ADMIN_DRAWER
} from './design-tokens';

describe('Admin Design Tokens', () => {
	it('exports all admin token categories in ADMIN_TOKENS bundle', () => {
		expect(ADMIN_TOKENS.page).toBe(ADMIN_PAGE);
		expect(ADMIN_TOKENS.segmented).toBe(ADMIN_SEGMENTED);
		expect(ADMIN_TOKENS.cards).toBe(ADMIN_CARDS);
		expect(ADMIN_TOKENS.badges).toBe(ADMIN_BADGES);
		expect(ADMIN_TOKENS.forms).toBe(ADMIN_FORMS);
		expect(ADMIN_TOKENS.buttons).toBe(ADMIN_BUTTONS);
		expect(ADMIN_TOKENS.table).toBe(ADMIN_TABLE);
		expect(ADMIN_TOKENS.floatingBar).toBe(ADMIN_FLOATING_BAR);
		expect(ADMIN_TOKENS.drawer).toBe(ADMIN_DRAWER);
	});

	it('ensures all token values are non-empty strings', () => {
		for (const [groupName, groupObj] of Object.entries(ADMIN_TOKENS)) {
			expect(typeof groupObj).toBe('object');
			for (const [tokenName, tokenValue] of Object.entries(groupObj)) {
				expect(typeof tokenValue, `${groupName}.${tokenName} should be a string`).toBe('string');
				expect(tokenValue.trim().length, `${groupName}.${tokenName} should not be empty`).toBeGreaterThan(0);
			}
		}
	});

	it('provides standard 5-role status badges', () => {
		expect(ADMIN_BADGES.success).toContain('text-emerald');
		expect(ADMIN_BADGES.danger).toContain('text-rose');
		expect(ADMIN_BADGES.warning).toContain('text-amber');
		expect(ADMIN_BADGES.info).toContain('text-sky');
		expect(ADMIN_BADGES.neutral).toContain('text-zinc');
	});
});
