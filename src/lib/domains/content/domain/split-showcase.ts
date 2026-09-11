import type { UISection, SplitShowcasePanel } from './models';

export interface ResolvedSplitPanel {
	id: string;
	position: 'left' | 'right';
	title: string;
	link: string;
	image: string;
}

export interface ResolvedSplitShowcase {
	heading: string;
	subheading: string;
	panels: ResolvedSplitPanel[];
}

/**
 * Resolves split showcase configuration from a UISection.
 * Supports:
 * 1. section.settings.panels (custom configured panels)
 * 2. section.imageGallery / section.imageUrl (uploaded multi-files fallback)
 * 3. Default fallback heading and subheading when empty
 */
export function resolveSplitShowcase(section?: UISection | null): ResolvedSplitShowcase {
	const heading = section?.heading?.trim() || 'GLAMOURIA';
	const subheading = section?.subheading?.trim() || 'Shop Now';

	if (!section) {
		return {
			heading,
			subheading,
			panels: []
		};
	}

	// 1. Check settings.panels
	const settingsPanels: SplitShowcasePanel[] | undefined = section.settings?.panels;
	if (Array.isArray(settingsPanels) && settingsPanels.length > 0) {
		const panels: ResolvedSplitPanel[] = settingsPanels
			.map((panel, idx) => {
				const position = panel.position || (idx === 0 ? 'left' : 'right');
				const imageUrl = panel.imageUrl || section.imageGallery?.[idx] || '';
				return {
					id: `${position}-${idx}`,
					position,
					title: panel.title?.trim() || '',
					link: panel.link?.trim() || '',
					image: imageUrl.trim()
				};
			})
			.filter((p) => Boolean(p.image));

		if (panels.length > 0) {
			return {
				heading,
				subheading,
				panels
			};
		}
	}

	// 2. Fallback to imageGallery / uploaded files
	const gallery = section.imageGallery || [];
	if (gallery.length > 0) {
		const actions = section.settings?.actions || [];
		const leftAction = actions[0];
		const rightAction = actions[1] || actions[0];

		const panels: ResolvedSplitPanel[] = [
			{
				id: 'left-0',
				position: 'left',
				title: leftAction?.text || '',
				link: leftAction?.link || '',
				image: gallery[0]
			}
		];

		if (gallery[1]) {
			panels.push({
				id: 'right-1',
				position: 'right',
				title: rightAction?.text || '',
				link: rightAction?.link || '',
				image: gallery[1]
			});
		}

		return {
			heading,
			subheading,
			panels
		};
	}

	// 3. Fallback to single imageUrl
	if (section.imageUrl) {
		const action = section.settings?.actions?.[0];
		return {
			heading,
			subheading,
			panels: [
				{
					id: 'left-0',
					position: 'left',
					title: action?.text || '',
					link: action?.link || '',
					image: section.imageUrl
				}
			]
		};
	}

	return {
		heading,
		subheading,
		panels: []
	};
}
