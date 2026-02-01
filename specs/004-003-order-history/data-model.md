# Data Model: Order History

**Spec**: [004-003-order-history/spec.md](./spec.md)

## Entities

### Order (Existing)
*Managed in `orders` collection*

| Field | Type | Description |
|-------|------|-------------|
| `id` | RecordId | Unique identifier |
| `user` | Relation(users) | Owner of the order |
| `status` | Select | pending, paid, processing, shipped, delivered, cancelled |
| `amount_total` | Number | Final charge amount |
| `currency` | Text | e.g. 'usd' |
| `created` | Date | Purchase timestamp |
| `shipping_address` | JSON | Snapshot of address at time of purchase |
| `tracking_number` | Text | Optional tracking info |
| `tracking_carrier` | Text | Optional carrier info |

### OrderItem (Existing)
*Managed in `order_items` collection*

| Field | Type | Description |
|-------|------|-------------|
| `order_id` | Relation(orders) | Parent order |
| `product_id` | Relation(products) | Linked product (if still exists) |
| `product_title_snap` | Text | Snapshot of title (preserve history if product changes) |
| `price_snap` | Number | Snapshot of price paid |
| `quantity` | Number | Count purchased |
| `variant_snap_json` | JSON | { color: "Red", size: "M" } |
| `sku_snap` | Text | Stock Keeping Unit snapshot |

## View Models (Frontend)

### OrderSummary (List View)
```typescript
interface OrderSummary {
  id: string;
  date: string; // ISO
  status: OrderStatus;
  total: number;
  currency: string;
  itemCount: number; // Derived or fetched if cheap
  firstItemTitle?: string; // Optional context
}
```

### OrderDetail (Detail View)
```typescript
interface OrderDetail extends OrderSummary {
  items: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
    image?: string;
    variant?: string;
  }>;
  shippingAddress: ShippingAddress;
  tracking?: {
    number: string;
    carrier: string;
  };
}
```
