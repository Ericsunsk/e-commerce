import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pb, initAdmin } from '$lib/server/pocketbase';
import { COLLECTIONS } from '$lib/constants';
import type { UserListsResponse } from '$lib/pocketbase-types';
import { apiHandler } from '$lib/server/api-handler';
import { Collections } from '$lib/pocketbase-types';

// Wishlist items are simpler - usually just ProductID and VariantID
interface WishlistItem {
    id: string; // Product ID
    variantId?: string;
    // Snapshot data for UI
    title?: string;
    price?: number;
    image?: string;
    slug?: string;
    stripePriceId?: string;
}

async function getWishlistRecord(userId: string): Promise<UserListsResponse<WishlistItem[]> | null> {
    try {
        await initAdmin();
        const record = await pb.collection(Collections.UserLists).getFirstListItem<UserListsResponse<WishlistItem[]>>(
            `user="${userId}" && type="wishlist"`
        );
        return record;
    } catch (e: any) {
        if (e.status === 404) return null;
        throw e;
    }
}

export const GET: RequestHandler = apiHandler(async ({ locals }) => {
    if (!locals.user) return { items: [] };

    const wishlist = await getWishlistRecord(locals.user.id);
    return { items: wishlist?.items || [], updated: wishlist?.updated };
});

export const POST: RequestHandler = apiHandler(async ({ request, locals }) => {
    const newItem: WishlistItem = await request.json();
    const userId = locals.user!.id;
    
    await initAdmin();
    let wishlist = await getWishlistRecord(userId);
    let items: WishlistItem[] = wishlist?.items ? (wishlist.items as unknown as WishlistItem[]) : [];

    // Check duplicates
    const exists = items.some(i => i.id === newItem.id && i.variantId === newItem.variantId);
    if (!exists) {
        items.push(newItem);
        
        if (wishlist) {
            await pb.collection(Collections.UserLists).update(wishlist.id, { items });
        } else {
            await pb.collection(Collections.UserLists).create({
                user: userId,
                type: 'wishlist',
                items
            });
        }
    }

    return { success: true, items };
}, { auth: true });

export const DELETE: RequestHandler = apiHandler(async ({ request, locals }) => {
    const { id, variantId } = await request.json();
    const userId = locals.user!.id;

    await initAdmin();
    const wishlist = await getWishlistRecord(userId);
    if (!wishlist) return { success: true, items: [] };

    let items: WishlistItem[] = wishlist.items ? (wishlist.items as unknown as WishlistItem[]) : [];
    const newItems = items.filter(i => !(i.id === id && i.variantId === variantId));

    if (newItems.length !== items.length) {
        await pb.collection(Collections.UserLists).update(wishlist.id, { items: newItems });
    }

    return { success: true, items: newItems };
}, { auth: true });
