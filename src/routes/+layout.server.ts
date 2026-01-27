import type { LayoutServerLoad } from './$types';
import { getGlobalSettings, getNavigation } from '$lib/server/site';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ url }) => {
    // Fetch global settings and navigation in parallel
    const [settings, headerNav, footerNav] = await Promise.all([
        getGlobalSettings(),
        getNavigation('header'),
        getNavigation('footer')
    ]);

    // Maintenance Mode Check
    // Allows bypassing using ?bypass=true query parameter
    if (settings.maintenanceMode && url.searchParams.get('bypass') !== 'true') {
        throw error(503, 'Under Maintenance');
    }

    return {
        settings,
        headerNav,
        footerNav
    };
};
