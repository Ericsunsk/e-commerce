---
name: cms-builder
description: Guide for configuring, managing, and operating the Elementhic CMS (PocketBase) via AI Agents.
---

# Elementhic CMS Manager Skill

This skill provides a complete toolset for managing the Elementhic E-commerce backend. It follows a **Three-Tier Data Architecture** designed for high performance, data integrity, and AI automation.

## 1. Architecture Overview (Three-Tier Model)

### Tier 1: Core Display (Fast Checkouts)
 Optimized for frontend read performance and cached rendering.
- **`products`**: Contains generic info and high-frequency filter fields (`slug`, `title`, `price`, `material`, `gender`).
- **`orders`**: Stores **Immutable JSON Snapshots** of purchase history. Frontend reads ONLY from `orders.items` array.
- **`ui_sections`**: Page content blocks with direct media attachments or references.

### Tier 2: Analytics & Operations (Precision)
 Used for backend logic, inventory management, and financial reporting.
- **`order_items`**: Atomic line items derived from orders. Used for sales reports, returns, and refunds.
- **`product_variants`**: SKU-level tracking for inventory (`stock_quantity`) and specific pricing (`price_override`).
- **`user_addresses`**: Customer address book with labels.

### Tier 3: Flexible Extension (Agility)
 JSON-based storage for non-critical or evolving attributes.
- **`products.attributes`**: Stores specs like `{ "care": "...", "fit": "oversized" }`.
- **`user_lists`**: Consolidated Cart and Wishlist items (distinguished by `type`).

---

## 2. Core Collections Schema

### `products`
The central catalog entity.
- `title`, `slug`, `price` (Legacy display string), `is_featured` (bool)
- `has_variants` (bool): UI flag. If true, frontend requires variant selection.
- `attributes` (json): Structured specs (Material, Care, Fit).
- **Relations**: `category`, `product_variants(product)` (Reverse relation).

### `orders`
The transaction record.
- `items` (json): **SNAPSHOT**. Contains full copy of product data at time of purchase. **DO NOT EDIT** after creation.
- `status`: `pending`, `paid`, `shipped`, `cancelled`.
- `amount_tax`: Automatic tax calculation result from Stripe Tax.
- `shipping_address` (json): Snapshot of destination.

### `user_lists`
Unified list management.
- `type`: `cart` | `wishlist` | `save_for_later`
- `items` (json): Array of `{ productId, variantId, quantity }`. **Note**: Prices are NOT stored here; fetched real-time.

---

## 3. Operational Tools (Schema Admin)

### `manage.py` (Schema Admin)
Low-level schema migration tool.
- `apply`: Pushes local `schema_definitions.json` to remote DB.
- `dump`: Pulls remote DB schema to local JSON.

---

4. **Hybrid Driver Sync (Stripe ↔ PB)**
   - **Trigger**: Creating/Updating/Deleting products in Stripe Dashboard.
   - **Auto-Mirroring**: `product.created` in Stripe automatically creates a stub in PB and links IDs.
   - **Sync Rule**: Stripe governs `active` status (synced to PB `stock_status`). PB governs rich descriptions/galleries.
   - **Metadata**: Stripe product `metadata.pb_product_id` is the single source of truth for linking.

---

## 5. Operational Rules (CRITICAL)

1. **Snapshot Rule**: precise historical data is stored in `orders.items`. Never rely on `products` table for historical order details as product prices/titles change over time.
2. **Stock Logic**: Always deduct stock from `product_variants` if `variant_id` is present. Fallback to `products` only for simple items.
3. **Workflow Rule**: Create products in **Stripe first** for automatic mirroring, then enhance/decorate in **PocketBase**.
4. **Media**: Use `ui_sections.image` for one-off headers. Use `media_library` (conceptual) or shared URL references for reusable assets.
