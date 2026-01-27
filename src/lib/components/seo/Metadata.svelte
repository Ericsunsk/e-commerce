<script lang="ts">
    import { page } from "$app/stores";
    import { CONTENT_IMAGES } from "$lib/constants";

    interface Props {
        title: string;
        description?: string;
        image?: string;
        type?: 'website' | 'article' | 'product';
        url?: string;
        siteName?: string;
    }

    let {
        title,
        description = "Discover modern luxury essentials.",
        image = CONTENT_IMAGES.OG_DEFAULT,
        type = 'website',
        url = $page.url.href,
        siteName = "E-Commerce"
    }: Props = $props();

    // Avoid double pipe if title already contains it
    const fullTitle = title.includes('|') ? title : `${title} | ${siteName}`;
</script>

<svelte:head>
    <title>{fullTitle}</title>
    <meta name="description" content={description} />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content={type} />
    <meta property="og:url" content={url} />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={image} />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:title" content={fullTitle} />
    <meta property="twitter:description" content={description} />
    <meta property="twitter:image" content={image} />
</svelte:head>
