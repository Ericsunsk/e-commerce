export type OrderStatus =
	| 'pending'
	| 'paid'
	| 'processing'
	| 'shipped'
	| 'delivered'
	| 'cancelled'
	| 'refunded'
	| 'partially_refunded'
	| 'returned';

export interface OrderItem {
	id: string;
	productId: string;
	variantId?: string;
	title: string;
	price: number; // cents
	quantity: number;
	image?: string;
	skuSnap?: string;
	color?: string;
	size?: string;
}

export interface ShippingAddress {
	name: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode: string;
	country: string;
}

export interface Order {
	id: string;
	placed_at?: string;
	placed_at_override?: string;
	userId?: string;
	stripeSessionId?: string;
	stripePaymentIntent?: string;
	customerEmail: string;
	customerName?: string;
	items: OrderItem[];
	amountSubtotal: number;
	amountShipping: number;
	amountTax: number;
	amountTotal: number;
	currency: string;
	status: OrderStatus;
	shippingAddress: ShippingAddress;
	trackingNumber?: string;
	trackingCarrier?: string;
	notes?: string;
}

export interface OrderSummary {
	id: string;
	date: string; // ISO
	status: OrderStatus;
	total: number;
	currency: string;
	itemCount: number;
	firstItemTitle?: string;
}

export interface OrderDetail extends OrderSummary {
	items: {
		id: string;
		title: string;
		price: number;
		quantity: number;
		image?: string;
		variant?: string;
	}[];
	shippingAddress: ShippingAddress;
	tracking?: {
		number: string;
		carrier: string;
	};
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
	pending: '待付款',
	paid: '已付款',
	processing: '处理中',
	shipped: '已发货',
	delivered: '已送达',
	cancelled: '已取消',
	refunded: '已退款',
	partially_refunded: '部分退款',
	returned: '已退货'
};

export function getOrderStatusLabel(status: string): string {
	return ORDER_STATUS_LABELS[status.toLowerCase()] ?? status;
}

export function getOrderStatusBadgeClass(status: string): string {
	switch (status.toLowerCase()) {
		case 'paid':
		case 'processing':
			return 'bg-amber-50 text-amber-700 border-amber-200';
		case 'shipped':
			return 'bg-sky-50 text-sky-700 border-sky-200';
		case 'delivered':
			return 'bg-emerald-50 text-emerald-700 border-emerald-200';
		case 'refunded':
		case 'cancelled':
			return 'bg-rose-50 text-rose-700 border-rose-200';
		default:
			return 'bg-zinc-100 text-zinc-700 border-zinc-200';
	}
}

const ORDER_STATUS_COLOR_MAP = {
	paid: 'text-emerald-600 dark:text-emerald-400',
	delivered: 'text-emerald-600 dark:text-emerald-400',
	shipped: 'text-blue-600 dark:text-blue-400',
	processing: 'text-blue-600 dark:text-blue-400',
	cancelled: 'text-red-600 dark:text-red-400',
	refunded: 'text-red-600 dark:text-red-400'
} as const;

export function getOrderStatusColor(status: string, fallbackClass = 'text-neutral-500'): string {
	return ORDER_STATUS_COLOR_MAP[status as keyof typeof ORDER_STATUS_COLOR_MAP] ?? fallbackClass;
}
