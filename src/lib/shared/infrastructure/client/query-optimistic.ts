import type { QueryClient, QueryKey } from '@tanstack/query-core';

interface OptimisticContext<TItem> {
	previousItems?: TItem[];
}

export function createOptimisticQueryHelpers<TItem>(client: QueryClient, queryKey: QueryKey) {
	const performOptimisticUpdate = async (updateFn: (old: TItem[]) => TItem[]) => {
		await client.cancelQueries({ queryKey });
		const previousItems = client.getQueryData<TItem[]>(queryKey);
		client.setQueryData<TItem[]>(queryKey, (old = []) => updateFn(old));
		return { previousItems };
	};

	const commonMutationOptions = {
		onError: (_err: unknown, _vars: unknown, context: OptimisticContext<TItem> | undefined) => {
			if (context?.previousItems) {
				client.setQueryData<TItem[]>(queryKey, context.previousItems);
			}
		},
		onSettled: () => client.invalidateQueries({ queryKey })
	};

	return {
		performOptimisticUpdate,
		commonMutationOptions
	};
}
