# Quickstart: Order History Feature

## Overview
This feature adds a "My Orders" section to the account area.

## Dependencies
- **PocketBase**: Requires `orders` and `order_items` collections (already exist).
- **Icons**: Uses `lucide-svelte` (Package, Truck, CheckCircle).

## Development Steps

1. **Verify Backend**: Ensure you have at least one order in your local PocketBase linked to your test user.
   - If not, go to `/shop`, add items, and complete a checkout (or use Stripe Test mode).
2. **Start Server**: `npm run dev`
3. **Navigate**: Go to `/account/orders`.

## Testing
- **List View**: Check that orders are sorted by date (newest first).
- **Detail View**: Click an order. Verify items, total, and status match.
- **Security**: Try accessing `/account/orders/SOME_OTHER_ID`. Should 404 or 403.
