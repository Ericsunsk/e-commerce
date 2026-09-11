/**
 * Design Tokens
 * Centralized design tokens for consistent styling across the application
 */

export const TYPOGRAPHY = {
	label: 'text-[10px] font-bold uppercase tracking-[0.2em]',
	labelSm: 'text-[10px] uppercase tracking-[0.15em]',
	labelLg: 'text-xs font-bold uppercase tracking-widest',
	labelAction: 'text-[10px] uppercase tracking-widest hover:underline cursor-pointer',
	body: 'text-sm tracking-wider leading-relaxed',
	bodySm: 'text-[10px] leading-relaxed tracking-[0.1em]',
	heading: 'font-display font-medium uppercase tracking-wide',
	headingLg: 'font-display font-medium uppercase tracking-[0.05em]',
	headingXl: 'text-3xl font-display uppercase tracking-widest',
	headingPage: 'text-3xl font-display font-bold uppercase tracking-widest',
	link: 'hover:underline underline-offset-4 decoration-1 transition-colors'
} as const;

export const COLORS = {
	text: 'text-primary dark:text-white',
	textMuted: 'text-primary/60 dark:text-white/60',
	textSubtle: 'text-primary/40 dark:text-white/40',
	bg: 'bg-background-light dark:bg-background-dark',
	bgAlt: 'bg-white dark:bg-zinc-900',
	border: 'border-primary dark:border-white',
	borderMuted: 'border-primary/10 dark:border-white/10'
} as const;

export const BUTTON_STYLES = {
	outline:
		'border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary rounded-card transition-colors duration-300',
	solid:
		'bg-primary text-white dark:bg-white dark:text-primary hover:opacity-90 rounded-card transition-opacity',
	base: 'font-bold uppercase tracking-widest cursor-pointer inline-flex items-center justify-center rounded-card',
	sizeSm: 'h-10 px-4 text-[10px] tracking-[0.15em] rounded-card',
	sizeMd: 'h-12 px-6 text-[10px] tracking-[0.2em] rounded-card',
	sizeLg: 'h-14 px-10 text-xs tracking-widest rounded-card'
} as const;

export const TRANSITIONS = {
	colors: 'transition-colors duration-300',
	colorsAndOpacity: 'transition-[color,background-color,border-color,opacity] duration-300',
	opacity: 'transition-opacity duration-300',
	transform: 'transition-transform duration-300',
	transformAndOpacity: 'transition-[transform,opacity] duration-300'
} as const;

export const Z_INDEX = {
	base: 'z-[var(--z-base)]',
	content: 'z-[var(--z-content)]',
	overlayContent: 'z-[var(--z-overlay-content)]',
	sticky: 'z-[var(--z-sticky)]',
	header: 'z-[var(--z-header)]',
	modalBackdrop: 'z-[var(--z-modal-backdrop)]',
	modal: 'z-[var(--z-modal)]',
	toast: 'z-[var(--z-toast)]',
	max: 'z-[var(--z-max)]'
} as const;

export const SPACING = {
	container: 'max-w-[1600px] mx-auto px-6 md:px-12',
	section: 'py-24 px-6 md:px-12',
	card: 'p-6',
	cardSm: 'p-4',
	cardGap: 'gap-6',
	cardGapSm: 'gap-4'
} as const;

export const LAYOUT = {
	pageContainer:
		'min-h-screen bg-background-light dark:bg-background-dark pt-[var(--content-offset)]',
	contentWrapper: 'max-w-[1200px] mx-auto px-6 md:px-12 py-12',
	loadingCenter: 'flex items-center justify-center py-24',
	loadingText: 'animate-pulse text-primary/60 dark:text-white/60',
	emptyState: 'text-center py-24 border border-primary/10 dark:border-white/10'
} as const;

export const ICONS = {
	sizeXs: 14,
	sizeSm: 16,
	sizeNav: 18,
	sizeMd: 20,
	sizeLg: 24,
	sizeXl: 32,
	strokeWidthThin: 1.0,
	strokeWidth: 1.25,
	strokeWidthBold: 1.75,
	navClass: 'text-zinc-900 opacity-80 shrink-0'
} as const;

export const RADIUS = {
	card: 'rounded-card',
	cardInner: 'rounded-card-inner',
	btn: 'rounded-card',
	button: 'rounded-card',
	pill: 'rounded-full'
} as const;

export const ADMIN_CARDS = {
	base: 'bg-white border border-zinc-200/80 rounded-card p-6',
	kpi: 'bg-white border border-zinc-200/80 rounded-card p-6 flex flex-col justify-between hover:border-zinc-300 transition-colors',
	section: 'bg-white border border-zinc-200/80 rounded-card p-6 flex flex-col justify-between',
	table: 'bg-white border border-zinc-200 rounded-card overflow-hidden',
	header: 'flex items-center justify-between border-b border-zinc-100 pb-4',
	body: 'p-6 space-y-6',
	padding: 'p-6',
	paddingSm: 'p-4',
	gap: 'gap-6',
	gapSm: 'gap-4',
	grid: 'grid gap-6',
	grid2: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
	grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
	grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
	title: 'text-xs font-bold uppercase tracking-wider text-zinc-900',
	subtitle: 'text-[11px] text-zinc-400',
	sectionHeader: 'flex items-center gap-2.5',
	sectionIconWrap: 'flex shrink-0 self-stretch items-center text-zinc-800'
} as const;

export const ADMIN_PAGE = {
	container: 'space-y-6 pb-24',
	header: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
	title: 'text-2xl font-display font-bold uppercase tracking-widest text-zinc-900',
	subtitle: 'text-xs text-zinc-500 mt-1',
	sectionTitle: 'text-lg font-display font-bold uppercase tracking-wider text-zinc-900',
	sectionSubtitle: 'text-xs text-zinc-500',
	cardGap: 'gap-6',
	cardsGrid: 'grid gap-6'
} as const;

export const ADMIN_SEGMENTED = {
	wrapper: 'flex items-center bg-zinc-100 p-1 rounded-card border border-zinc-200/70 self-start sm:self-auto',
	itemActive: 'px-3 py-1.5 rounded-card-inner text-xs tracking-wider transition-all duration-150 cursor-pointer bg-white text-zinc-900 font-semibold',
	itemInactive: 'px-3 py-1.5 rounded-card-inner text-xs tracking-wider transition-all duration-150 cursor-pointer text-zinc-500 hover:text-zinc-900 font-normal'
} as const;

export const ADMIN_BADGES = {
	success: 'inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono',
	danger: 'inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 font-mono',
	warning: 'inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 font-mono',
	info: 'inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/60 font-mono',
	neutral: 'inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-200/60 font-mono'
} as const;

/** Shared base for compact matrix inputs (single height rhythm, clean white theme, flat without shadow). */
const MATRIX_INPUT_BASE =
	'bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg px-2.5 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors';

export const ADMIN_FORMS = {
	label: 'block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5',
	input: 'w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 transition-colors',
	inputSm: 'w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors',
	priceInput: 'w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors',
	currencySelect: 'w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors cursor-pointer',
	select: 'w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors',
	textarea: 'w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 text-xs text-zinc-900 font-mono outline-none focus:border-zinc-900 transition-colors',
	help: 'block text-[11px] text-zinc-400 mt-1',
	counter: 'text-[11px] text-zinc-400 font-mono',
	switchBase: 'relative inline-flex w-10 h-6 items-center rounded-full transition-colors',
	switchTrackActive: 'bg-emerald-500',
	switchTrackInactive: 'bg-zinc-300',
	switchThumb: 'inline-block w-4 h-4 rounded-full bg-white transition-transform',
	matrixLabel: 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1',
	matrixInput: `w-full ${MATRIX_INPUT_BASE}`,
	sizeInput: `${MATRIX_INPUT_BASE} font-bold w-24 shrink-0`
} as const;

export const ADMIN_MATRIX = {
	/** Color card wrapper (flat, clean, no shadow). */
	colorCard: 'bg-white border border-zinc-200 rounded-xl overflow-hidden transition-all hover:border-zinc-300',
	/** Generator card wrapper (flat, clean, no shadow). */
	generatorCard: 'p-4 rounded-xl bg-zinc-50/80 border border-zinc-200 space-y-3.5',
	/** Color name field in the matrix row / banner. */
	colorName: `${MATRIX_INPUT_BASE} font-bold w-28 shrink-0`,
	/** SKU prefix field in the matrix row / banner (clean white input, width content-driven). */
	skuPrefix: `${MATRIX_INPUT_BASE} font-mono shrink-0`,
	/** Size input field in the variant table row. */
	size: `${MATRIX_INPUT_BASE} font-bold w-24 shrink-0`,
	/** Alias for size input field. */
	sizeName: `${MATRIX_INPUT_BASE} font-bold w-24 shrink-0`,
	/** Stock number field in the size row or stepper. */
	stock: 'w-16 h-7 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg text-center font-mono font-bold text-xs text-zinc-900 outline-none focus:border-zinc-900 transition-colors shrink-0',
	/** Quick add size name input field. */
	newSize: `${MATRIX_INPUT_BASE} font-bold w-24 shrink-0`,
	/** Quick add size stock input field. */
	newStock: 'w-16 bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 rounded-lg px-2 py-1 text-xs font-mono font-bold text-zinc-900 text-center outline-none focus:border-zinc-900 transition-colors shrink-0',
	/** Generator default stock input field. */
	generatorStock: 'w-16 bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-zinc-900 outline-none focus:border-zinc-900 transition-colors text-center shrink-0',
	/** Variant selling & compare-at price input in table row. */
	variantPrice: 'w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 rounded-lg pl-5 pr-1.5 py-1 text-xs font-mono font-medium text-zinc-900 outline-none transition-colors'
} as const;

export const ADMIN_BUTTONS = {
	primary:
		'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-card bg-zinc-900 border border-zinc-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 hover:border-zinc-800 disabled:opacity-50 transition-colors cursor-pointer',
	primarySm:
		'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-card bg-zinc-900 border border-zinc-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 hover:border-zinc-800 disabled:opacity-50 transition-colors cursor-pointer',
	secondary:
		'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-card bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer',
	secondarySm:
		'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-card bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer',
	ghost:
		'inline-flex items-center justify-center gap-2 h-9 px-3 rounded-card text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer',
	ghostSm:
		'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-card text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer',
	danger:
		'inline-flex items-center justify-center w-8 h-8 rounded-card text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer',
	dangerSolid:
		'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-card bg-rose-600 border border-rose-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-rose-700 hover:border-rose-700 disabled:opacity-50 transition-colors cursor-pointer',
	dangerSolidSm:
		'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-card bg-rose-600 border border-rose-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-rose-700 hover:border-rose-700 disabled:opacity-50 transition-colors cursor-pointer',
	dangerSecondary:
		'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-card text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer',
	icon:
		'inline-flex items-center justify-center w-8 h-8 rounded-card text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer',
	iconActive:
		'inline-flex items-center justify-center w-8 h-8 rounded-card border border-zinc-900 bg-zinc-900 text-white transition-colors cursor-pointer',
	iconInactive:
		'inline-flex items-center justify-center w-8 h-8 rounded-card border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer',
	iconToolbar:
		'h-9 w-9 inline-flex items-center justify-center rounded-card border transition-colors cursor-pointer shrink-0',
	iconToolbarActive:
		'h-9 w-9 inline-flex items-center justify-center rounded-card border border-zinc-900 bg-zinc-900 text-white transition-colors cursor-pointer shrink-0',
	iconToolbarInactive:
		'h-9 w-9 inline-flex items-center justify-center rounded-card border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shrink-0',
	iconBadge:
		'absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-zinc-900 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white leading-none',
	miniAction:
		'inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-[11px] font-mono font-semibold hover:border-zinc-900 hover:text-zinc-900 transition-colors cursor-pointer shrink-0',
	miniIconAction:
		'w-8 h-8 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer shrink-0',
	pill:
		'inline-flex items-center gap-1.5 h-8 px-3 rounded-card border text-xs font-medium transition-colors cursor-pointer',
	pillActive:
		'inline-flex items-center gap-1.5 h-8 px-3 rounded-card border border-zinc-900 bg-zinc-900 text-white text-xs font-semibold transition-colors cursor-pointer',
	pillInactive:
		'inline-flex items-center gap-1.5 h-8 px-3 rounded-card border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 text-xs transition-colors cursor-pointer',
	filterPillActive:
		'px-2.5 py-1 text-xs rounded-lg border border-zinc-900 bg-zinc-900 text-white font-medium transition-all flex items-center gap-1.5 cursor-pointer',
	filterPillInactive:
		'px-2.5 py-1 text-xs rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 transition-all flex items-center gap-1.5 cursor-pointer',
	filterPillCountActive: 'text-[10px] text-zinc-300',
	filterPillCountInactive: 'text-[10px] text-zinc-400'
} as const;

export const ADMIN_TABLE = {
	wrapper: 'overflow-x-auto',
	table: 'w-full text-left text-xs text-zinc-600 border-collapse',
	headerRow: 'border-b border-zinc-200 bg-zinc-50/80 font-semibold uppercase tracking-wider text-zinc-500 text-xs',
	headerCell: 'py-3 px-4',
	body: 'divide-y divide-zinc-100',
	row: 'hover:bg-zinc-50/60 transition-colors',
	cell: 'py-3.5 px-4'
} as const;

export const ADMIN_FLOATING_BAR = {
	container: 'fixed bottom-0 left-0 lg:left-52 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-zinc-200 px-6 py-3.5 shadow-lg flex items-center justify-between'
} as const;

export const ADMIN_DRAWER = {
	backdrop: 'fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end',
	panel: 'w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden',
	header: 'px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50',
	body: 'p-6 overflow-y-auto space-y-5 flex-1 text-xs text-zinc-700',
	footer: 'p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-3'
} as const;

export const ADMIN_POPOVER = {
	backdrop: 'fixed inset-0 z-40 cursor-default bg-transparent',
	panel: 'fixed z-50 block rounded-xl border border-zinc-200 bg-white p-3 shadow-lg space-y-2',
	title: 'text-xs font-bold text-zinc-900',
	input:
		'w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 placeholder:text-zinc-400',
	numberInput:
		'bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-900',
	row: 'flex items-center gap-2',
	confirmRound:
		'w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0 cursor-pointer',
	dangerLink: 'px-2 py-1 rounded-lg text-[11px] text-rose-600 hover:bg-rose-50 cursor-pointer',
	mutedLink: 'px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-900 cursor-pointer'
} as const;

export const ADMIN_TOKENS = {
	page: ADMIN_PAGE,
	segmented: ADMIN_SEGMENTED,
	cards: ADMIN_CARDS,
	badges: ADMIN_BADGES,
	forms: ADMIN_FORMS,
	buttons: ADMIN_BUTTONS,
	table: ADMIN_TABLE,
	floatingBar: ADMIN_FLOATING_BAR,
	drawer: ADMIN_DRAWER,
	popover: ADMIN_POPOVER,
	matrix: ADMIN_MATRIX
} as const;


