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
		'border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-colors duration-300',
	solid:
		'bg-primary text-white dark:bg-white dark:text-primary hover:opacity-90 transition-opacity',
	base: 'font-bold uppercase tracking-widest cursor-pointer inline-flex items-center justify-center',
	sizeSm: 'h-10 px-4 text-[10px] tracking-[0.15em]',
	sizeMd: 'h-12 px-6 text-[10px] tracking-[0.2em]',
	sizeLg: 'h-14 px-10 text-xs tracking-widest'
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
	section: 'py-24 px-6 md:px-12'
} as const;

export const LAYOUT = {
	pageContainer:
		'min-h-screen bg-background-light dark:bg-background-dark pt-[var(--content-offset)]',
	contentWrapper: 'max-w-[1200px] mx-auto px-6 md:px-12 py-12',
	loadingCenter: 'flex items-center justify-center py-24',
	loadingText: 'animate-pulse text-primary/60 dark:text-white/60',
	emptyState: 'text-center py-24 border border-primary/10 dark:border-white/10'
} as const;
