export async function GET({ url }: { url: URL }) {
	const robots = `
User-agent: *
Allow: /

# Disallow sensitive pages
Disallow: /account/
Disallow: /checkout/
Disallow: /api/

# Sitemap
Sitemap: ${url.origin}/sitemap.xml
    `.trim();

	return new Response(robots, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
