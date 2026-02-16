# Feature Specification: Order History
 
 **Feature Branch**: `004-003-order-history`  
 **Created**: 2026-02-01
 **Status**: Draft  
 **Input**: User description: "顾客购买商品之后看不到order history,加入order history功能"
 
 ## 1. Context & Objectives *(The "Why")*
 
 - **Core Goal**: Implement a dedicated "Order History" section in the user account area where customers can view their past purchases.
 - **Business/User Value**: Increases customer trust and retention by providing transparency into their purchase history. Reduces support inquiries regarding order status.
 - **Non-Goals**: Returns or exchange processing (future scope), deep analytics for users.
 
 ## 2. Functional Scenarios *(Specific Journeys)*
 
 ### Scenario 1 - View Order List (Priority: P1)
 
 A logged-in user navigates to their account page and selects "Order History". They see a chronological list of their past orders with summary details (date, status, total).
 
 - **Independent Logic**: Fetches orders filtered by the current authenticated user ID.
 - **Acceptance Criteria**:
   1. **Given** a logged-in user, **When** they visit `/account/orders`, **Then** they see a list of their past orders sorted by date (newest first).
   2. **Given** a user with no orders, **When** they visit `/account/orders`, **Then** they see a friendly empty state.
 
 ---
 
 ### Scenario 2 - View Order Details (Priority: P1)
 
 A user clicks on a specific order from the list to view full details.
 
 - **Acceptance Criteria**:
   1. **Given** a user on the order list, **When** they click an order, **Then** they navigate to `/account/orders/[id]` and see full details (items, prices, shipping address, status).
 
 ---
 
 ## 3. System Boundaries & Constraints *(The "Rules")*
 
 ### System Boundaries
 - **In-Scope**: Frontend UI for list and detail views, Backend loaders to fetch data from PocketBase.
 - **Out-of-Scope/Integrations**: Modification of order status (handled by Stripe webhooks/admin), email notifications.
 
 ### Non-Functional Requirements
 - **Performance**: List load time < 200ms.
 - **Security & Privacy**: Users must strictly only see their OWN orders. Strict RLS (Row Level Security) or server-side filtering.
 - **Reliability/Error Handling**: Graceful error if PocketBase is unreachable.
 
 ### Logic Edge Cases
 - **Guest Checkout**: Orders made as guest (not linked to user ID) will NOT appear here unless manually linked (out of scope for now).
 - **Concurrency**: Minimal concern as this is a read-only view for the user.
 
 ## 4. Domain Entities *(Conceptual Model)*
 
 - **Order**: Represents a completed checkout session. Attributes: `id`, `user_id` (relation), `status` (paid, shipped, etc.), `total_amount`, `created_at`.
 - **OrderItem**: Individual products within an order. Attributes: `order_id` (relation), `product_id` (relation), `quantity`, `price_at_purchase`.
 
 ## 5. Success Criteria *(Measurable Outcomes)*
 
 - **SC-001**: Users can successfully view a list of all their historical orders.
 - **SC-002**: Users can view accurate details for any specific past order.
 - **SC-003**: ZERO data leaks (user A never sees user B's orders).

## Clarifications
### Session 2026-02-01
- Q: Product Data Persistence Strategy? → A: Option A - Snapshot Strategy (Copy Title, Price, Image to OrderItem to withstand product deletion).
