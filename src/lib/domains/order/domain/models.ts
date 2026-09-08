export type OrderStatus =
	| 'pending'
	| 'paid'
	| 'processing'
	| 'shipped'
	| 'delivered'
	| 'cancelled'
	| 'refunded'
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
