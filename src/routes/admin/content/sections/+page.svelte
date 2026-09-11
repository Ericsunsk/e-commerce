<script lang="ts">
	import {
		Plus,
		Pencil,
		Trash2,
		X,
		ExternalLink,
		Layers,
		ArrowUp,
		ArrowDown,
		ImageIcon,
		ShoppingBag
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ADMIN_BUTTONS, ADMIN_SEGMENTED } from '$shared/kernel';
	import {
		SECTION_TYPES,
		SECTION_TYPE_LABELS,
		swapSectionRank,
		type SectionType,
		type UISectionAction
	} from '$domains/content';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let sections = $state(data.sections.map((s) => ({ ...s })));
	let selectedPageId = $state<string>('all');

	interface SectionFormData {
		page: string;
		type: SectionType;
		heading: string;
		subheading: string;
		content: string;
		sort_order: number;
		is_active: boolean;
		actions: UISectionAction[];
	}

	let form = $state<SectionFormData>({
		page: '',
		type: 'hero',
		heading: '',
		subheading: '',
		content: '',
		sort_order: 10,
		is_active: true,
		actions: []
	});

	// Inline editing & creating state: null | 'new' | string (section id)
	let inlineId = $state<string | null>(null);
	let saving = $state(false);
	let formError = $state('');
	let error = $state('');
	let successMsg = $state('');
	let externalImageUrl = $state('');
	let settingsRest = $state<Record<string, unknown>>({});
	let externalRest = $state<Record<string, unknown>>({});

	// Page mapping for easy lookup
	let pageMap = $derived(
		new Map(data.pages.map((p) => [p.id, p]))
	);

	// Filtered sections (ordered by sortOrder)
	let filteredSections = $derived(
		(selectedPageId === 'all'
			? sections
			: sections.filter((s) => s.pageId === selectedPageId)
		).slice().sort((a, b) => a.sortOrder - b.sortOrder)
	);

	let previewUrl = $derived.by(() => {
		if (selectedPageId === 'all') return '/';
		const page = pageMap.get(selectedPageId);
		if (!page || page.slug === 'home' || page.slug === 'index') return '/';
		return `/${page.slug}`;
	});

	let previewLabel = $derived.by(() => {
		if (selectedPageId === 'all') return '前台首页';
		const page = pageMap.get(selectedPageId);
		if (!page || page.slug === 'home' || page.slug === 'index') return '前台首页';
		return page.title || page.slug;
	});

	function getPageName(pageId: string) {
		const p = pageMap.get(pageId);
		if (!p) return pageId ? '独立区块' : '全局区块';
		return p.title ? `${p.title} (${p.slug})` : p.slug;
	}

	function getTypeBadgeClass(type: SectionType) {
		switch (type) {
			case 'hero':
				return 'bg-zinc-900 text-white border-zinc-900';
			case 'split_showcase':
				return 'bg-zinc-800 text-white border-zinc-800';
			default:
				return 'bg-zinc-100 text-zinc-800 border-zinc-200/80';
		}
	}

	async function refresh() {
		try {
			const res = await fetch('/api/admin/content/sections');
			if (res.ok) {
				const body = await res.json();
				sections = body.sections;
			}
		} catch {
			// Silent fallback
		}
	}

	function openNew() {
		if (inlineId === 'new') {
			inlineId = null;
			return;
		}
		form = {
			page: selectedPageId !== 'all' ? selectedPageId : data.pages[0]?.id || '',
			type: 'hero',
			heading: '',
			subheading: '',
			content: '',
			sort_order: (sections.length + 1) * 10,
			is_active: true,
			actions: [{ text: '', link: '' }]
		};
		externalImageUrl = '';
		settingsRest = {};
		externalRest = {};
		formError = '';
		inlineId = 'new';
	}

	async function toggleInline(id: string) {
		if (inlineId === id) {
			inlineId = null;
			return;
		}
		formError = '';
		try {
			const res = await fetch(`/api/admin/content/sections/${id}`);
			if (!res.ok) throw new Error('加载区块失败');
			const body = await res.json();
			const sec = body.section;
			const actions: UISectionAction[] = sec.settings?.actions || [];
			const { actions: _dropActions, external: _dropExternal, ...rest } =
				(sec.settings && typeof sec.settings === 'object'
					? (sec.settings as Record<string, unknown>)
					: {}) as Record<string, unknown>;
			settingsRest = rest;
			const ext =
				sec.settings && typeof sec.settings === 'object'
					? ((sec.settings as Record<string, unknown>).external as
							| Record<string, unknown>
							| undefined)
					: undefined;
			const { image_url: _dropImageUrl, ...extRest } = ext ?? {};
			externalRest = extRest;
			externalImageUrl =
				typeof ext?.image_url === 'string' ? (ext.image_url as string) : '';
			form = {
				page: sec.page ?? '',
				type: sec.type ?? 'hero',
				heading: sec.heading ?? '',
				subheading: sec.subheading ?? '',
				content: sec.content ?? '',
				sort_order: Number(sec.sort_order) || 10,
				is_active: sec.is_active !== false,
				actions: actions.length > 0 ? actions.map((a) => ({ ...a })) : [{ text: '', link: '' }]
			};
			inlineId = id;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '加载失败';
		}
	}

	function addAction() {
		form.actions = [...form.actions, { text: '', link: '' }];
	}

	function removeAction(index: number) {
		form.actions = form.actions.filter((_, idx) => idx !== index);
	}

	function buildSettings() {
		const validActions = form.actions.filter((a) => a.text.trim() || a.link.trim());
		const imageUrl = externalImageUrl.trim();
		const external = { ...externalRest };
		if (imageUrl) external.image_url = imageUrl;
		else delete external.image_url;
		return {
			validActions,
			imageUrl,
			settings: {
				...settingsRest,
				actions: validActions,
				...(Object.keys(external).length > 0 ? { external } : {})
			}
		};
	}

	async function save() {
		if (!inlineId) return;
		saving = true;
		formError = '';
		try {
			const { validActions, imageUrl, settings } = buildSettings();
			const payload = {
				page: form.page,
				type: form.type,
				heading: form.heading,
				subheading: form.subheading,
				content: form.content,
				sort_order: Number(form.sort_order),
				is_active: form.is_active,
				settings
			};

			const isNew = inlineId === 'new';
			const url = isNew
				? '/api/admin/content/sections'
				: `/api/admin/content/sections/${inlineId}`;
			const res = await fetch(url, {
				method: isNew ? 'POST' : 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || (isNew ? '创建区块失败' : '保存区块失败'));

			if (isNew) {
				const createdId = body.section?.id || '';
				sections = [
					...sections,
					{
						id: createdId,
						pageId: form.page,
						type: form.type,
						heading: form.heading,
						subheading: form.subheading,
						content: form.content,
						sortOrder: Number(form.sort_order),
						isActive: form.is_active,
						imageCount: imageUrl ? 1 : 0,
						images: imageUrl ? [imageUrl] : [],
						imageUrl,
						settings: { actions: validActions },
						updated: new Date().toISOString()
					}
				];
				successMsg = '区块已创建';
			} else {
				const targetId = inlineId;
				sections = sections.map((s) =>
					s.id === targetId
						? {
								...s,
								pageId: form.page,
								type: form.type,
								heading: form.heading,
								subheading: form.subheading,
								content: form.content,
								sortOrder: Number(form.sort_order),
								isActive: form.is_active,
								settings: { ...(s.settings ?? {}), actions: validActions },
								...(imageUrl ? { imageUrl } : {})
							}
						: s
				);
				successMsg = '区块已更新';
			}
			inlineId = null;
			setTimeout(() => (successMsg = ''), 3000);
			await refresh();
		} catch (e: unknown) {
			formError = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}

	async function toggleActive(sectionId: string, current: boolean) {
		const next = !current;
		const prev = sections;
		sections = sections.map((s) => (s.id === sectionId ? { ...s, isActive: next } : s));

		try {
			const res = await fetch(`/api/admin/content/sections/${sectionId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: next })
			});
			if (!res.ok) throw new Error('切换状态失败');
		} catch {
			sections = prev;
		}
	}

	async function moveSection(sectionId: string, dir: -1 | 1) {
		const ordered = filteredSections.map((s) => ({ id: s.id, sortOrder: s.sortOrder }));
		const swapped = swapSectionRank(ordered, sectionId, dir);
		if (!swapped) return;
		const prev = sections;
		const rankMap = new Map(swapped.map((r) => [r.id, r.sortOrder]));
		sections = sections
			.map((s) => (rankMap.has(s.id) ? { ...s, sortOrder: rankMap.get(s.id) as number } : s))
			.sort((a, b) => a.sortOrder - b.sortOrder);

		try {
			const results = await Promise.all(
				swapped.map((r) =>
					fetch(`/api/admin/content/sections/${r.id}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ sort_order: r.sortOrder })
					})
				)
			);
			if (results.some((res) => !res.ok)) throw new Error('调整排序失败');
		} catch {
			sections = prev;
			error = '排序保存失败，已回滚';
		}
	}

	async function remove(id: string, heading: string) {
		const title = heading ? `「${heading}」` : '该区块';
		if (!confirm(`确定删除区块 ${title} 吗？`)) return;
		error = '';
		try {
			const res = await fetch(`/api/admin/content/sections/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('删除失败');
			sections = sections.filter((s) => s.id !== id);
			if (inlineId === id) inlineId = null;
			successMsg = '区块已删除';
			setTimeout(() => (successMsg = ''), 3000);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '删除失败';
		}
	}
</script>

{#snippet sectionFormFields()}
	<!-- Page & Type -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<label class="block">
			<span class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
				所属页面
			</span>
			<select
				bind:value={form.page}
				class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors"
			>
				<option value="">（全局 / 独立页面）</option>
				{#each data.pages as p (p.id)}
					<option value={p.id}>{p.title ? `${p.title} (${p.slug})` : p.slug}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
				区块类型
			</span>
			<select
				bind:value={form.type}
				class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors"
			>
				{#each SECTION_TYPES as t (t)}
					<option value={t}>{SECTION_TYPE_LABELS[t] || t}</option>
				{/each}
			</select>
		</label>
	</div>

	<!-- Sort & Active Status -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
		<label class="block">
			<span class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
				排序权重
			</span>
			<input
				bind:value={form.sort_order}
				type="number"
				min="0"
				step="1"
				onkeydown={(e) => {
					if (e.key === 'Enter') save();
				}}
				class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors"
			/>
		</label>

		<div class="block pt-1">
			<span class="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-700">
				启用状态
			</span>
			<button
				type="button"
				role="switch"
				aria-label="切换启用状态"
				aria-checked={form.is_active}
				onclick={() => (form.is_active = !form.is_active)}
				class="relative inline-flex w-10 h-6 items-center rounded-full transition-colors {form.is_active
					? 'bg-emerald-500'
					: 'bg-zinc-300'}"
			>
				<span
					class="inline-block w-4 h-4 rounded-full bg-white transition-transform {form.is_active
						? 'translate-x-5'
						: 'translate-x-1'}"
				></span>
			</button>
		</div>
	</div>

	<!-- Heading & Subheading -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<label class="block">
			<span class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
				主标题
			</span>
			<input
				bind:value={form.heading}
				type="text"
				placeholder="例如：SPRING 2027"
				onkeydown={(e) => {
					if (e.key === 'Enter') save();
				}}
				class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors"
			/>
		</label>

		<label class="block">
			<span class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
				副标题
			</span>
			<input
				bind:value={form.subheading}
				type="text"
				placeholder="例如：Shop Now"
				onkeydown={(e) => {
					if (e.key === 'Enter') save();
				}}
				class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors"
			/>
		</label>
	</div>

	<!-- Content -->
	<label class="block">
		<span class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
			说明内容
		</span>
		<textarea
			bind:value={form.content}
			rows="3"
			placeholder="HTML 或文字说明"
			class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 text-xs text-zinc-900 font-mono outline-none focus:border-zinc-900 transition-colors"
		></textarea>
	</label>

	<!-- Cover Image URL -->
	<label class="block">
		<span class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
			封面图片 URL
		</span>
		<input
			bind:value={externalImageUrl}
			type="url"
			inputmode="url"
			placeholder="https://…"
			onkeydown={(e) => {
				if (e.key === 'Enter') save();
			}}
			class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 font-mono outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400"
		/>
	</label>

	<!-- Actions / Buttons -->
	<div class="space-y-3 pt-2 border-t border-zinc-100">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold uppercase tracking-wider text-zinc-700">
				操作按钮
			</span>
			<button
				type="button"
				onclick={addAction}
				class="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline"
			>
				<UiIcon icon={Plus} size={12} /> 添加按钮
			</button>
		</div>

		{#each form.actions as action, idx (idx)}
			<div class="flex items-center gap-2">
				<input
					bind:value={action.text}
					type="text"
					placeholder="文字 (如 Shop)"
					onkeydown={(e) => {
						if (e.key === 'Enter') save();
					}}
					class="flex-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors"
				/>
				<input
					bind:value={action.link}
					type="text"
					placeholder="链接 (如 /shop)"
					onkeydown={(e) => {
						if (e.key === 'Enter') save();
					}}
					class="flex-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors"
				/>
				<button
					type="button"
					onclick={() => removeAction(idx)}
					class={ADMIN_BUTTONS.danger}
					title="移除"
				>
					<UiIcon icon={Trash2} size={13} />
				</button>
			</div>
		{/each}
	</div>
{/snippet}

{#snippet sectionPreview(
	type: SectionType,
	heading?: string | null,
	subheading?: string | null,
	content?: string | null,
	imageUrl?: string | null,
	actions: UISectionAction[] = []
)}
	<div class="p-4 sm:p-5 bg-zinc-50/40">
		{#if type === 'hero'}
			<div
				class="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center text-center p-6 select-none border border-zinc-900/10 shadow-inner"
			>
				{#if imageUrl}
					<img
						src={imageUrl}
						alt={heading}
						class="absolute inset-0 w-full h-full object-cover opacity-60"
					/>
				{:else}
					<div
						class="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800"
					>
						<div
							class="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
						></div>
					</div>
				{/if}
				<div class="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]"></div>

				<div class="relative z-10 max-w-lg mx-auto space-y-2 text-white">
					{#if subheading}
						<p class="text-[10px] uppercase font-mono tracking-[0.25em] text-zinc-300">
							{subheading}
						</p>
					{/if}
					<h4
						class="text-lg sm:text-2xl font-display font-bold uppercase tracking-widest text-white leading-tight"
					>
						{heading || 'HERO MAIN FOCUS'}
					</h4>
					<div class="pt-1.5 flex items-center justify-center gap-2">
						<span
							class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-white text-zinc-900 shadow-xs"
						>
							{actions[0]?.text || 'EXPLORE NOW'}
						</span>
					</div>
				</div>
			</div>
		{:else if type === 'split_showcase'}
			<div class="grid grid-cols-2 gap-3 h-40 sm:h-48 select-none">
				<div
					class="relative rounded-xl overflow-hidden bg-zinc-900 flex flex-col justify-end p-4 text-white border border-zinc-800"
				>
					{#if imageUrl}
						<img
							src={imageUrl}
							alt=""
							class="absolute inset-0 w-full h-full object-cover opacity-75"
						/>
					{:else}
						<div class="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950"></div>
					{/if}
					<div
						class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
					></div>
					<div class="relative z-10">
						<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400"
							>ATELIER 01</span
						>
						<p
							class="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-white"
						>
							{heading || 'WOMEN COLLECTION'}
						</p>
					</div>
				</div>

				<div
					class="relative rounded-xl overflow-hidden bg-zinc-950 flex flex-col justify-end p-4 text-white border border-zinc-800"
				>
					<div class="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black"></div>
					<div
						class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
					></div>
					<div class="relative z-10">
						<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400"
							>ATELIER 02</span
						>
						<p
							class="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-white"
						>
							{subheading || 'MEN SELECTION'}
						</p>
					</div>
				</div>
			</div>
		{:else if type === 'feature_split'}
			<div
				class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-zinc-200/80 items-center select-none"
			>
				<div
					class="relative rounded-lg overflow-hidden h-32 bg-zinc-100 flex items-center justify-center border border-zinc-200/50"
				>
					{#if imageUrl}
						<img src={imageUrl} alt="" class="w-full h-full object-cover" />
					{:else}
						<div class="text-zinc-400 flex flex-col items-center gap-1.5">
							<UiIcon icon={ImageIcon} size={22} />
							<span class="text-[10px] font-mono">EDITORIAL VISUAL</span>
						</div>
					{/if}
				</div>
				<div class="space-y-1.5 py-1 pr-2">
					<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400">
						{subheading || 'HERITAGE CRAFT'}
					</span>
					<h4
						class="text-sm sm:text-base font-display font-bold uppercase text-zinc-900 tracking-wider"
					>
						{heading || 'DESIGN PHILOSOPHY'}
					</h4>
					<p class="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
						{content ||
							'探索优雅与前卫工艺的融合，每一道剪裁皆经过手工雕琢，呈现历久弥新的高定风尚。'}
					</p>
					<div class="pt-0.5">
						<span
							class="text-[10px] font-bold uppercase tracking-wider text-zinc-900 underline underline-offset-4"
						>
							{actions[0]?.text || 'READ THE STORY'} →
						</span>
					</div>
				</div>
			</div>
		{:else if type === 'product_grid'}
			<div class="bg-white p-4 rounded-xl border border-zinc-200/80 space-y-3 select-none">
				<div class="flex items-center justify-between border-b border-zinc-100 pb-2">
					<div>
						<span class="text-[9px] font-mono uppercase tracking-widest text-zinc-400"
							>SHOWCASE</span
						>
						<h4 class="text-xs font-bold uppercase tracking-wider text-zinc-900">
							{heading || 'CURATED SELECTION'}
						</h4>
					</div>
					<span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider"
						>VIEW ALL</span
					>
				</div>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
					{#each [{ title: 'Wool Tailored Blazer', price: '¥ 3,490' }, { title: 'Silk Pleated Dress', price: '¥ 2,850' }, { title: 'Cashmere Knit Top', price: '¥ 1,980' }, { title: 'Leather Mini Bag', price: '¥ 4,200' }] as item (item.title)}
						<div
							class="bg-zinc-50/80 rounded-lg p-2 border border-zinc-200/40 text-center space-y-1.5"
						>
							<div
								class="aspect-3/4 rounded bg-zinc-200/60 flex items-center justify-center text-zinc-400"
							>
								<UiIcon icon={ShoppingBag} size={16} className="opacity-50" />
							</div>
							<div class="text-[10px] font-medium text-zinc-800 truncate">{item.title}</div>
							<div class="text-[9px] font-mono font-bold text-zinc-500">{item.price}</div>
						</div>
					{/each}
				</div>
			</div>
		{:else if type === 'category_grid'}
			<div class="bg-white p-4 rounded-xl border border-zinc-200/80 space-y-3 select-none">
				<div class="flex items-center justify-between border-b border-zinc-100 pb-2">
					<div>
						<span class="text-[9px] font-mono uppercase tracking-widest text-zinc-400"
							>CATEGORIES</span
						>
						<h4 class="text-xs font-bold uppercase tracking-wider text-zinc-900">
							{heading || 'EXPLORE BY CATEGORY'}
						</h4>
					</div>
					<span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider"
						>COLLECTIONS</span
					>
				</div>
				<div class="grid grid-cols-3 gap-2.5">
					{#each ['OUTERWEAR', 'LEATHER GOODS', 'ACCESSORIES'] as cat, idx (cat)}
						<div
							class="relative h-20 sm:h-24 rounded-lg overflow-hidden bg-zinc-900 flex items-end p-2.5 text-white border border-zinc-800"
						>
							<div
								class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/60 to-transparent"
							></div>
							<div class="relative z-10">
								<span class="text-[8px] font-mono text-zinc-400">0{idx + 1}</span>
								<div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
									{cat}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else if type === 'cta_banner'}
			<div
				class="bg-zinc-900 text-white p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-zinc-800 select-none shadow-xs"
			>
				<div class="space-y-1">
					<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400">
						{subheading || 'NEWSLETTER & EXCLUSIVES'}
					</span>
					<h4
						class="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-white"
					>
						{heading || 'JOIN THE PRIVILEGE CLUB'}
					</h4>
				</div>
				<span
					class="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-bold tracking-wider uppercase shrink-0 shadow-xs"
				>
					{actions[0]?.text || 'SUBSCRIBE NOW'}
				</span>
			</div>
		{:else}
			<div
				class="bg-white p-6 rounded-xl border border-zinc-200/80 text-center max-w-xl mx-auto space-y-2 select-none"
			>
				{#if subheading}
					<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400">
						{subheading}
					</span>
				{/if}
				<h4
					class="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-zinc-900"
				>
					{heading || 'EDITORIAL STORY'}
				</h4>
				<p
					class="text-xs text-zinc-600 line-clamp-3 leading-relaxed font-serif italic max-w-md mx-auto"
				>
					{content ||
						'“真正的奢华无需繁复的堆砌，而是经由纯粹线条与高级质感唤醒的内在从容。”'}
				</p>
			</div>
		{/if}
	</div>
{/snippet}

<svelte:head>
	<title>页面排版 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-6xl">
	<!-- Top Navigation Tabs -->
	<nav class={ADMIN_SEGMENTED.wrapper} aria-label="内容管理">
		{#each [
			{ href: '/admin/content', label: '站点配置' },
			{ href: '/admin/content/sections', label: '页面排版' },
			{ href: '/admin/content/pages', label: '页面管理' },
			{ href: '/admin/content/navigation', label: '导航管理' }
		] as tab (tab.href)}
			<a
				href={tab.href}
				aria-current={tab.href === '/admin/content/sections' ? 'page' : undefined}
				class={tab.href === '/admin/content/sections'
					? ADMIN_SEGMENTED.itemActive
					: ADMIN_SEGMENTED.itemInactive}
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	<!-- Title & Actions Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-xl font-display font-bold uppercase tracking-widest text-zinc-900">
				页面区块排版
			</h1>
		</div>

		<div class="flex items-center gap-2.5">
			<a
				href={previewUrl}
				target="_blank"
				rel="noopener noreferrer"
				class={ADMIN_BUTTONS.secondary}
				title={`在新标签页打开 ${previewLabel} 实时前台`}
			>
				<UiIcon icon={ExternalLink} size={13} />
				<span>预览前台</span>
			</a>
			<button
				type="button"
				onclick={openNew}
				class={ADMIN_BUTTONS.primary}
			>
				<UiIcon icon={Plus} size={14} />
				<span>新建区块</span>
			</button>
		</div>
	</div>

	<!-- Page Filter Tabs -->
	<div class="flex flex-wrap items-center gap-2 pt-0.5">
		<button
			type="button"
			onclick={() => (selectedPageId = 'all')}
			class={selectedPageId === 'all'
				? ADMIN_BUTTONS.pillActive
				: ADMIN_BUTTONS.pillInactive}
		>
			<span>全部</span>
			<span class="opacity-60 font-mono text-[10px]">({sections.length})</span>
		</button>
		{#each data.pages as page (page.id)}
			{@const count = sections.filter((s) => s.pageId === page.id).length}
			<button
				type="button"
				onclick={() => (selectedPageId = page.id)}
				class={selectedPageId === page.id
					? ADMIN_BUTTONS.pillActive
					: ADMIN_BUTTONS.pillInactive}
				title={page.title || page.slug}
			>
				<span class="max-w-[240px] truncate">{page.title || page.slug}</span>
				<span class="opacity-60 font-mono text-[10px]">({count})</span>
			</button>
		{/each}
	</div>

	{#if error}
		<p role="alert" class="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
			{error}
		</p>
	{/if}
	{#if successMsg}
		<p role="status" class="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
			{successMsg}
		</p>
	{/if}

	<!-- Visual Block Stream -->
	<div class="space-y-4">
		<!-- Inline Create Block Card -->
		{#if inlineId === 'new'}
			<article
				class="bg-white border-2 border-zinc-900 rounded-card overflow-hidden transition-all shadow-xs"
			>
				<div
					class="px-5 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70"
				>
					<div class="flex items-center gap-2 min-w-0">
						<span
							class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-900 text-white"
						>
							新建区块
						</span>
						<span class="font-medium text-sm text-zinc-900 truncate">
							{form.heading || '（输入主标题实时预览）'}
						</span>
					</div>
					<button
						type="button"
						onclick={() => (inlineId = null)}
						class={ADMIN_BUTTONS.icon}
						title="取消"
					>
						<UiIcon icon={X} size={16} />
					</button>
				</div>

				<!-- Live Preview of New Block -->
				{@render sectionPreview(
					form.type,
					form.heading,
					form.subheading,
					form.content,
					externalImageUrl.trim(),
					form.actions
				)}

				<!-- Form Fields -->
				<div class="border-t border-zinc-100 bg-white px-5 py-5 space-y-5 text-xs text-zinc-700">
					{#if formError}
						<p role="alert" class="p-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
							{formError}
						</p>
					{/if}

					{@render sectionFormFields()}

					<div class="flex items-center justify-end gap-3 pt-2">
						<button
							type="button"
							onclick={() => (inlineId = null)}
							class={ADMIN_BUTTONS.secondary}
						>
							取消
						</button>
						<button
							type="button"
							onclick={save}
							disabled={saving}
							class={ADMIN_BUTTONS.primary}
						>
							{saving ? '创建中…' : '创建区块'}
						</button>
					</div>
				</div>
			</article>
		{/if}

		{#if filteredSections.length === 0 && inlineId !== 'new'}
			<div class="bg-white border border-zinc-200 rounded-card p-12 text-center text-zinc-400">
				<UiIcon icon={Layers} size={36} className="mx-auto mb-3 opacity-30" />
				<p class="text-sm font-medium text-zinc-600">当前页面暂无已配置的区块</p>
				<button
					type="button"
					onclick={openNew}
					class="{ADMIN_BUTTONS.secondary} mt-4"
				>
					<UiIcon icon={Plus} size={14} />
					<span>新建区块</span>
				</button>
			</div>
		{:else}
			{#each filteredSections as row, idx (row.id)}
				{@const activeHeading =
					inlineId === row.id && form.heading ? form.heading : row.heading}
				{@const activeSubheading =
					inlineId === row.id && form.subheading ? form.subheading : row.subheading}
				{@const activeContent =
					inlineId === row.id && form.content ? form.content : row.content}
				{@const activeImageUrl =
					inlineId === row.id && externalImageUrl.trim()
						? externalImageUrl.trim()
						: row.imageUrl}
				{@const activeActions =
					inlineId === row.id && form.actions.some((a) => a.text.trim())
						? form.actions.filter((a) => a.text.trim())
						: row.settings?.actions || []}

				<article
					class="bg-white border border-zinc-200/90 rounded-card overflow-hidden transition-all duration-200 hover:border-zinc-300 hover:shadow-xs group {row.isActive
						? ''
						: 'opacity-70 bg-zinc-50/40'}"
				>
					<!-- Card Header: Metadata + Controls -->
					<div
						class="px-5 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50"
					>
						<div class="flex items-center gap-3 min-w-0">
							<!-- Sort Badge with Quick Micro-adjust -->
							<div
								class="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-zinc-200 text-xs font-mono font-medium text-zinc-700 shadow-2xs"
							>
								<span class="min-w-[1.5rem] text-center">#{row.sortOrder}</span>
								<div class="flex flex-col ml-0.5">
									<button
										type="button"
										onclick={() => moveSection(row.id, -1)}
										disabled={idx === 0}
										title="上移"
										aria-label="上移"
										class="p-0.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-800 transition-colors disabled:opacity-20 disabled:pointer-events-none"
									>
										<UiIcon icon={ArrowUp} size={10} />
									</button>
									<button
										type="button"
										onclick={() => moveSection(row.id, 1)}
										disabled={idx === filteredSections.length - 1}
										title="下移"
										aria-label="下移"
										class="p-0.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-800 transition-colors disabled:opacity-20 disabled:pointer-events-none"
									>
										<UiIcon icon={ArrowDown} size={10} />
									</button>
								</div>
							</div>

							<!-- Section Type Badge -->
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border {getTypeBadgeClass(
									row.type
								)}"
							>
								{SECTION_TYPE_LABELS[row.type] || row.type}
							</span>

							<!-- Heading & Page Scope -->
							<div class="flex items-baseline gap-2 min-w-0 truncate">
								<button
									type="button"
									class="font-medium text-sm text-zinc-900 truncate cursor-pointer hover:underline underline-offset-4 text-left min-w-0"
									title={row.heading || '（无主标题）'}
									onclick={() => toggleInline(row.id)}
								>
									{activeHeading || '（无主标题）'}
								</button>
								<span class="text-[11px] text-zinc-400 shrink-0 font-normal">
									· {getPageName(row.pageId)}
								</span>
							</div>
						</div>

						<!-- Right Controls -->
						<div class="flex items-center gap-2.5 shrink-0">
							<!-- Visibility Switch -->
							<button
								type="button"
								role="switch"
								aria-checked={row.isActive}
								aria-label="切换启用状态"
								onclick={() => toggleActive(row.id, row.isActive)}
								class="relative inline-flex w-8 h-4.5 items-center rounded-full transition-colors {row.isActive
									? 'bg-emerald-500'
									: 'bg-zinc-300'}"
							>
								<span
									class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {row.isActive
										? 'translate-x-4'
										: 'translate-x-0.5'}"
								></span>
							</button>

							<div class="h-3 w-px bg-zinc-200"></div>

							<!-- Edit & Delete -->
							<div class="inline-flex items-center gap-0.5">
								<button
									type="button"
									onclick={() => toggleInline(row.id)}
									class={ADMIN_BUTTONS.icon}
									title={inlineId === row.id ? '收起编辑' : '展开编辑'}
									aria-expanded={inlineId === row.id}
								>
									<UiIcon icon={Pencil} size={14} />
								</button>
								<button
									type="button"
									onclick={() => remove(row.id, row.heading)}
									class={ADMIN_BUTTONS.danger}
									title="删除区块"
								>
									<UiIcon icon={Trash2} size={14} />
								</button>
							</div>
						</div>
					</div>

					<!-- Card Body: Miniature Visual Preview -->
					{@render sectionPreview(
						row.type,
						activeHeading,
						activeSubheading,
						activeContent,
						activeImageUrl,
						activeActions
					)}

					{#if inlineId === row.id}
						<div class="border-t border-zinc-100 bg-white px-5 py-5">
							<div class="space-y-5 text-xs text-zinc-700">
								{#if formError}
									<p
										role="alert"
										class="p-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-200"
									>
										{formError}
									</p>
								{/if}

								{@render sectionFormFields()}

								<div class="flex items-center justify-end gap-3 pt-2">
									<button
										type="button"
										onclick={() => (inlineId = null)}
										class={ADMIN_BUTTONS.secondary}
									>
										取消
									</button>
									<button
										type="button"
										onclick={save}
										disabled={saving}
										class={ADMIN_BUTTONS.primary}
									>
										{saving ? '保存中…' : '保存修改'}
									</button>
								</div>
							</div>
						</div>
					{/if}
				</article>
			{/each}
		{/if}
	</div>
</div>
