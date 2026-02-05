# Research: Order History

**Feature**: Order History
**Date**: 2026-02-01

## 1. Technical Unknowns & Decisions

### 1.1 PocketBase Expansion Handling
- **Question**: How to efficiently fetch order items for the list view vs. detail view?
- **Decision**:
    - **Schema Analysis**: `orders` collection DOES NOT have an `items` relation field. It has `user` relation.
    - **Schema Discovery**: `src/lib/server/orders.ts` reveals a critical detail:
      ```typescript
      // It creates an Order
      const orderRecord = await pb.collection(Collections.Orders).create(orderPayload);
      
      // THEN it creates OrderItems in a batch
      itemBatch.collection('order_items').create({...});
      
      // BUT `mapRecordToOrder` looks for `record.items` which is NOT a standard field in `OrdersResponse`.
      ```
    - **Finding**: The current `getOrdersByUser` implementation in `src/lib/server/orders.ts` (lines 117-129) fetches orders but **DOES NOT** fetch the related items. The `mapRecordToOrder` function blindly attempts to map `record.items` which will be undefined for fetched records (it only works during creation because they manually attach it).
    - **Correction Required**: We need to update `getOrdersByUser` (or create `getOrderWithItems`) to also fetch related items. Since there is no direct relation from Order -> Items (it's Items -> Order), we must use `pb.collection('order_items').getFullList({ filter: 'order_id = ...' })` OR use a reverse expand if PocketBase supports it (usually `expand('order_items(order_id)')` but PB is strict).
    - **Strategy**:
        - **List View**: Fetch `orders` only. Show total amount and date. Do NOT show items in the list card to avoid N+1 queries.
        - **Detail View**: Fetch `orders` (single) + `order_items` (list filtered by order_id).
        - **Refactoring**: The existing `getOrdersByUser` maps `items` to `[]` if missing. We should keep it efficient.

### 1.2 Date Formatting
- **Question**: How to display dates consistent with "Apple UX"?
- **Decision**: Use `Intl.DateTimeFormat` with `dateStyle: 'medium'` (e.g., "Oct 24, 2025").

### 1.3 Empty States
- **Question**: What if the user has no orders?
- **Decision**: Display a "Shop Now" CTA button leading to `/shop`.

## 2. Best Practices

- **Security**: Always filter by `filter: 'user = "${locals.user.id}"'` in `getList` or `getFirstListItem`. Never trust client-side IDs without ownership check.
- **Performance**: Pagination for the order list? For MVP (Scenario 1), we can limit to top 50 or use infinite scroll. Decision: **Pagination** (standard PB `getList(1, 50)`).

## 3. Alternatives Considered

- **Client-side Fetching**: Rejected. Constitution requires "Mandatory SSR via `+page.server.ts` for primary data".
- **Reverse Expansion**: PocketBase allows expanding back-relations in some versions, but explicit fetching is safer and more typed.
