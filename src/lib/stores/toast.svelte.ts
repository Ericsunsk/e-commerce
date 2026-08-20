// Toast Store - 全局通知管理
// 使用方式: import { toastStore } from '$lib/stores/toast.svelte';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
}

function createToastStore() {
	let items = $state<ToastItem[]>([]);

	function add(message: string, type: ToastType = 'success', duration = 3000): string {
		const id = crypto.randomUUID();
		items.push({ id, message, type, duration });

		if (duration > 0) {
			setTimeout(() => remove(id), duration);
		}

		return id;
	}

	function remove(id: string) {
		const index = items.findIndex((t) => t.id === id);
		if (index !== -1) {
			items.splice(index, 1);
		}
	}

	return {
		get items() {
			return items;
		},
		// 通用方法
		show: (message: string, type: ToastType = 'success', duration = 3000) =>
			add(message, type, duration),
		dismiss: (id: string) => remove(id),
		clear: () => {
			items.length = 0;
		},

		// 快捷方法
		success: (message: string) => add(message, 'success', 3000),
		error: (message: string) => add(message, 'error', 5000),
		info: (message: string) => add(message, 'info', 3000),
		warning: (message: string) => add(message, 'warning', 4000)
	};
}

export const toastStore = createToastStore();
