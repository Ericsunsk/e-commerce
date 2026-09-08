import { describe, it, expect } from 'vitest';
import {
	CartItemSchema,
	mergeCartItemQuantity,
	removeCartItemByIdentity,
	setCartItemQuantityByIdentity,
	calculateCartSummary,
	type CartItem
} from './models';

describe('Cart Domain Models and Rules', () => {
	const item1: CartItem = {
		id: 'prod_1',
		variantId: 'var_a',
		quantity: 2,
		title: 'Silk Shirt',
		price: 150,
		cartItemId: 'prod_1-var_a'
	};

	const item2: CartItem = {
		id: 'prod_2',
		quantity: 1,
		title: 'Cotton T-Shirt',
		price: 50,
		cartItemId: 'prod_2-base'
	};

	it('validates a valid CartItem using CartItemSchema', () => {
		const parsed = CartItemSchema.parse(item1);
		expect(parsed.id).toBe('prod_1');
		expect(parsed.quantity).toBe(2);
	});

	it('merges quantities when adding existing cart item', () => {
		const added: CartItem = {
			id: 'prod_1',
			variantId: 'var_a',
			quantity: 3,
			price: 150
		};
		const merged = mergeCartItemQuantity([item1, item2], added);
		expect(merged).toHaveLength(2);
		expect(merged[0].quantity).toBe(5);
	});

	it('appends new item when adding distinct item or variant', () => {
		const distinct: CartItem = {
			id: 'prod_1',
			variantId: 'var_b',
			quantity: 1,
			price: 150
		};
		const merged = mergeCartItemQuantity([item1, item2], distinct);
		expect(merged).toHaveLength(3);
		expect(merged[2].variantId).toBe('var_b');
	});

	it('removes item by identity', () => {
		const filtered = removeCartItemByIdentity([item1, item2], { id: 'prod_1', variantId: 'var_a' });
		expect(filtered).toHaveLength(1);
		expect(filtered[0].id).toBe('prod_2');
	});

	it('updates quantity and removes if quantity <= 0', () => {
		const updated = setCartItemQuantityByIdentity(
			[item1, item2],
			{ id: 'prod_2' },
			5
		);
		expect(updated[1].quantity).toBe(5);

		const removed = setCartItemQuantityByIdentity(
			[item1, item2],
			{ id: 'prod_2' },
			0
		);
		expect(removed).toHaveLength(1);
	});

	it('calculates cart summary correctly', () => {
		const summary = calculateCartSummary([item1, item2]);
		expect(summary.itemCount).toBe(3); // 2 + 1
		expect(summary.subtotal).toBe(350); // 150*2 + 50*1
		expect(summary.total).toBe(350);
	});
});
