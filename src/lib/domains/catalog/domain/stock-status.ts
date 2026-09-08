export const STOCK_STATUS = {
	IN_STOCK: 'in_stock',
	OUT_OF_STOCK: 'out_of_stock',
	LOW_STOCK: 'low_stock'
} as const;

export type StockStatus = (typeof STOCK_STATUS)[keyof typeof STOCK_STATUS];

export const LOW_STOCK_THRESHOLD = 5;

export function computeStockStatus(stock: number): StockStatus {
	if (stock <= 0) return STOCK_STATUS.OUT_OF_STOCK;
	if (stock <= LOW_STOCK_THRESHOLD) return STOCK_STATUS.LOW_STOCK;
	return STOCK_STATUS.IN_STOCK;
}
