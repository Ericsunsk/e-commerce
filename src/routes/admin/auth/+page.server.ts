import type { PageServerLoad } from './$types';
import { getAuthMethodsView, getEmailTemplates, EMAIL_TEMPLATES } from '$domains/platform/server';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async () => {
	const methods = await getAuthMethodsView();
	const templates = await getEmailTemplates();
	const pbUrl = (env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
	return { methods, templates, templateDefs: EMAIL_TEMPLATES, dashboardUrl: `${pbUrl}/_/` };
};
