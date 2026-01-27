/**
 * Price Utilities
 * 统一的价格解析和格式化工具
 */

/**
 * 从价格字符串解析数值 (如 "$99.00" → 99)
 */
export function parsePrice(priceString: string): number {
    if (typeof priceString !== 'string') return 0;
    return parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0;
}

/**
 * 将价格字符串转换为分 (Stripe 所需格式)
 * "$99.00" → 9900
 */
export function priceToCents(priceString: string): number {
    return Math.round(parsePrice(priceString) * 100);
}

/**
 * 将分转换为美元
 * 9900 → 99.00
 */
export function centsToDollars(cents: number): number {
    return cents / 100;
}

/**
 * 格式化货币显示 (统一版本)
 * @param amount - 金额数值
 * @param options - 格式化选项
 * @param options.currency - 货币代码 (默认 'USD')
 * @param options.locale - 语言区域 (默认 'en-US')
 * @param options.isCents - 是否为分单位 (默认 false)
 */
export function formatCurrency(
    amount: number,
    options: {
        currency?: string;
        locale?: string;
        isCents?: boolean;
    } = {}
): string {
    const { currency = 'USD', locale = 'en-US', isCents = false } = options;
    const value = isCents ? amount / 100 : amount;

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(value);
    } catch {
        // Fallback to USD if currency code is invalid
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }
}

// formatPrice removed - use formatCurrency instead
