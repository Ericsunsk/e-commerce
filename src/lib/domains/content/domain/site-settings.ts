/**
 * CMS site settings form model (pure domain).
 *
 * Describes the editable `global_settings` fields and validates admin
 * saves. The `icon` file field stays read-only here (managed in PB).
 */

export type SettingsFieldType = 'text' | 'number' | 'boolean';

export interface SettingsFieldDef {
	key:
		| 'site_name'
		| 'currency_code'
		| 'currency_symbol'
		| 'shipping_threshold'
		| 'maintenance_mode';
	label: string;
	type: SettingsFieldType;
	help: string;
}

export const GLOBAL_SETTINGS_FIELDS: SettingsFieldDef[] = [
	{ key: 'site_name', label: '站点名称', type: 'text', help: '显示在标题与页脚' },
	{ key: 'currency_code', label: '货币代码', type: 'text', help: '3 位大写，如 USD' },
	{ key: 'currency_symbol', label: '货币符号', type: 'text', help: '如 $' },
	{
		key: 'shipping_threshold',
		label: '免邮门槛',
		type: 'number',
		help: '订单金额满多少免邮（店面货币单位）'
	},
	{ key: 'maintenance_mode', label: '维护模式', type: 'boolean', help: '开启后前台只显示维护页' }
];

function throwSettingsIssue(message: string): never {
	throw { status: 400, message };
}

export interface NormalizedSiteSettings {
	site_name?: string;
	currency_code?: string;
	currency_symbol?: string;
	shipping_threshold?: number;
	maintenance_mode?: boolean;
}

/** Validate the admin save payload (all fields optional). */
export function normalizeSiteSettings(input: unknown): NormalizedSiteSettings {
	if (!input || typeof input !== 'object') throwSettingsIssue('站点配置格式错误');
	const data = input as Record<string, unknown>;
	const normalized: NormalizedSiteSettings = {};

	if (data.site_name !== undefined) {
		const name = String(data.site_name ?? '').trim();
		if (name.length < 2 || name.length > 60) throwSettingsIssue('站点名称需为 2–60 个字符');
		normalized.site_name = name;
	}
	if (data.currency_code !== undefined) {
		const code = String(data.currency_code ?? '')
			.trim()
			.toUpperCase();
		if (!/^[A-Z]{3}$/.test(code)) throwSettingsIssue('货币代码需为 3 位大写字母');
		normalized.currency_code = code;
	}
	if (data.currency_symbol !== undefined) {
		const symbol = String(data.currency_symbol ?? '').trim();
		if (!symbol || symbol.length > 3) throwSettingsIssue('货币符号需为 1–3 个字符');
		normalized.currency_symbol = symbol;
	}
	if (data.shipping_threshold !== undefined) {
		const threshold = Number(data.shipping_threshold);
		if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1_000_000) {
			throwSettingsIssue('免邮门槛必须是不小于 0 的数字');
		}
		normalized.shipping_threshold = threshold;
	}
	if (data.maintenance_mode !== undefined) {
		if (typeof data.maintenance_mode !== 'boolean') throwSettingsIssue('维护模式必须是布尔值');
		normalized.maintenance_mode = data.maintenance_mode;
	}
	return normalized;
}
