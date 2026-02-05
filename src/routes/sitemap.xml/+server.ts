import { getProducts } from '$lib/server/products';
import { getNavigation } from '$lib/server/site';

export async function GET({ url }: { url: URL }) {
	const origin = url.origin;

	// 1. Fetch data
	const [products, navItems] = await Promise.all([getProducts(), getNavigation()]);

	// 2. Define static pages
	const staticPages = ['', '/shop', '/collection', '/account', '/checkout'];

	// 3. Build XML
	const sitemap = `
        <?xml version="1.0" encoding="UTF-8" ?>
        <urlset
            xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:xhtml="https://www.w3.org/1999/xhtml"
            xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
            xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
            xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
            xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
        >
            <!-- Static Pages -->
            ${staticPages
							.map(
								(page) => `
                <url>
                    <loc>${origin}${page}</loc>
                    <changefreq>weekly</changefreq>
                    <priority>${page === '' ? '1.0' : '0.8'}</priority>
                </url>
            `
							)
							.join('')}

            <!-- Products -->
            ${products
							.map(
								(product) => `
                <url>
                    <loc>${origin}/shop/${product.id}</loc>
                    <lastmod>${new Date().toISOString()}</lastmod>
                    <changefreq>daily</changefreq>
                    <priority>0.9</priority>
                    ${
											product.image
												? `
                        <image:image>
                            <image:loc>${product.image}</image:loc>
                            <image:title>${product.title}</image:title>
                        </image:image>
                    `
												: ''
										}
                </url>
            `
							)
							.join('')}

            <!-- Categories (From Navigation) -->
            ${navItems
							.filter((nav) => nav.url.startsWith('/shop'))
							.map(
								(nav) => `
                <url>
                    <loc>${origin}${nav.url}</loc>
                    <changefreq>weekly</changefreq>
                    <priority>0.7</priority>
                </url>
            `
							)
							.join('')}
        </urlset>`.trim();

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
