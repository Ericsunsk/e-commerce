/**
 * Order status → Tailwind class mapping (presentation).
 *
 * These lived in `order/domain/models.ts`, which meant the pure domain layer
 * was returning Tailwind class strings. A domain model that knows what
 * `bg-amber-50` is has stopped being a model — and it drags the design system
 * into a layer that is supposed to be framework-free (Constitution Principle IX).
 *
 * `getOrderStatusLabel` deliberately stayed in `domain/models.ts`: mapping a
 * status to human-readable text is domain vocabulary, not styling.
 */

const ORDER_STATUS_BADGE_MAP: Record<string, string> = {
	paid: 'bg-amber-50 text-amber-700 border-amber-200',
	processing: 'bg-amber-50 text-amber-700 border-amber-200',
	shipped: 'bg-sky-50 text-sky-700 border-sky-200',
	delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
	refunded: 'bg-rose-50 text-rose-700 border-rose-200',
	cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
};

const ORDER_STATUS_COLOR_MAP: Record<string, string> = {
	paid: 'text-emerald-600 dark:text-emerald-400',
	delivered: 'text-emerald-600 dark:text-emerald-400',
	shipped: 'text-blue-600 dark:text-blue-400',
	processing: 'text-blue-600 dark:text-blue-400',
	cancelled: 'text-red-600 dark:text-red-400',
	refunded: 'text-red-600 dark:text-red-400'
};

export function getOrderStatusBadgeClass(status: string): string {
	return (
		ORDER_STATUS_BADGE_MAP[status.toLowerCase()] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200'
	);
}

export function getOrderStatusColor(status: string, fallbackClass = 'text-neutral-500'): string {
	return ORDER_STATUS_COLOR_MAP[status.toLowerCase()] ?? fallbackClass;
}
