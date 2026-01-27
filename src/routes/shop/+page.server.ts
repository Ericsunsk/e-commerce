import type { PageServerLoad } from './$types';
import { getProducts, getCategories } from '$lib/server/products';
import { getPage, getPageSections } from '$lib/server/content';

export const load: PageServerLoad = async ({ url, parent }) => {
    // 从 URL 查询参数获取筛选条件
    const categorySlug = url.searchParams.get('category') || undefined;
    const gender = url.searchParams.get('gender') || undefined;

    // Get parent data (layout data) to access navigation without re-fetching
    const { headerNav } = await parent();

    // Determine the primary slug to fetch metadata from the "pages" collection
    // If we have a gender or category, try to find a specific page for it, otherwise fallback to 'shop'
    const pageSlug = gender || categorySlug || 'shop';

    const [products, page, sections, categories] = await Promise.all([
        getProducts({ categorySlug, gender }),
        getPage(pageSlug).then(p => p || getPage('shop')), // Try specific page, fallback to general shop page
        getPageSections(pageSlug).then(s => s.length ? s : getPageSections('shop')), // Try specific sections, fallback to general shop sections
        getCategories()
    ]);

    // 动态提取导航栏中使用的 category 和 gender slugs（用于子选项智能过滤）
    // 例如 /shop?category=accessories → 提取 "accessories"
    // 例如 /shop?gender=womens → 提取 "womens"
    // Use headerNav from parent instead of fetching getNavigation() again
    const navigation = headerNav || []; 
    
    const navCategorySlugsFromCategory = navigation
        .filter((nav: any) => nav.url.includes('category='))
        .map((nav: any) => {
            const match = nav.url.match(/category=([^&]+)/);
            return match ? match[1] : null;
        })
        .filter((slug: any): slug is string => slug !== null);

    const navCategorySlugsFromGender = navigation
        .filter((nav: any) => nav.url.includes('gender='))
        .map((nav: any) => {
            const match = nav.url.match(/gender=([^&]+)/);
            return match ? match[1] : null;
        })
        .filter((slug: any): slug is string => slug !== null);

    // 合并两者：导航中出现的所有 category 和 gender 值都应该从子选项中排除
    const navCategorySlugs = [...new Set([...navCategorySlugsFromCategory, ...navCategorySlugsFromGender])];

    return {
        products,
        page,
        sections,
        categories,
        navCategorySlugs, // 传给前端用于过滤
        filters: {
            category: categorySlug,
            gender: gender
        }
    };
};
