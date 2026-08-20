<script lang="ts">
	import ShopProductDetailPage from '../../shop/[id]/+page.svelte';
	import type { PageData as ShopPageData } from '../../shop/[id]/$types';

	interface Props {
		data: ShopPageData;
	}

	let { data }: Props = $props();
</script>

<ShopProductDetailPage {data} />
