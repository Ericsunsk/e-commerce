const ORDER_STATUS_COLOR_MAP = {
	paid: 'text-emerald-600 dark:text-emerald-400',
	delivered: 'text-emerald-600 dark:text-emerald-400',
	shipped: 'text-blue-600 dark:text-blue-400',
	processing: 'text-blue-600 dark:text-blue-400',
	cancelled: 'text-red-600 dark:text-red-400',
	refunded: 'text-red-600 dark:text-red-400'
} as const;

export function getOrderStatusColor(status: string, fallbackClass = 'text-neutral-500') {
	return ORDER_STATUS_COLOR_MAP[status as keyof typeof ORDER_STATUS_COLOR_MAP] ?? fallbackClass;
}
