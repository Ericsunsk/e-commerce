import sanitizeHtml from 'sanitize-html';

const DEFAULT_ALLOWED_TAGS = [
	'a',
	'b',
	'blockquote',
	'br',
	'code',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'hr',
	'i',
	'li',
	'ol',
	'p',
	'pre',
	'strong',
	'ul',
	'img'
];

export function sanitizeCmsHtml(input: string | null | undefined): string {
	if (!input) return '';

	return sanitizeHtml(input, {
		allowedTags: DEFAULT_ALLOWED_TAGS,
		allowedAttributes: {
			a: ['href', 'name', 'target', 'rel'],
			img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding']
		},
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		allowProtocolRelative: false,
		transformTags: {
			a: (tagName: string, attribs: Record<string, string | undefined>) => {
				const href = attribs.href;
				const name = attribs.name;
				const target = attribs.target === '_blank' ? '_blank' : undefined;
				const rel = target ? 'noopener noreferrer' : attribs.rel;

				return {
					tagName,
					attribs: {
						...(href ? { href } : {}),
						...(name ? { name } : {}),
						...(target ? { target } : {}),
						...(rel ? { rel } : {})
					}
				};
			}
		}
	});
}
