import { apiHandler } from '$shared/infrastructure/server';
import { deductInventory } from '$domains/catalog/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = apiHandler(async ({ request }) => deductInventory(request));
