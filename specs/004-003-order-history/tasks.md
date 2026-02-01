---
description: "Task list for Order History feature"
---

# Tasks: Order History

**Input**: Design documents from `/specs/004-003-order-history/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare types and shared components

- [x] T001 [P] [Setup] Create/Verify `OrderSummary` and `OrderDetail` types in `src/lib/types.ts` (extend PB types).
- [x] T002 [P] [Setup] Create `OrderCard.svelte` component in `src/lib/components/orders/` (UI for list item).
- [x] T003 [P] [Setup] Create `OrderSummary.svelte` component in `src/lib/components/orders/` (UI for detail header).

---

## Phase 2: Foundational (Backend Access)

**Purpose**: Secure data fetching logic

- [x] T004 [Backend] Implement `getOrdersWithItems` or update `getOrdersByUser` in `src/lib/server/orders.ts` to efficiently fetch/map items.
- [x] T005 [Backend] Implement `getOrderById` in `src/lib/server/orders.ts` with strict ownership check (`locals.user.id`).

---

## Phase 3: User Story 1 - View Order List (Priority: P1)

**Goal**: Users can see a list of past orders.

- [x] T006 [US1] Create `src/routes/account/orders/+page.server.ts` (Loader calling `getOrdersByUser`).
- [x] T007 [US1] Create `src/routes/account/orders/+page.svelte` (UI using `OrderCard`).
- [x] T008 [US1] Add "Order History" link to `src/routes/account/+page.svelte` or sidebar.

---

## Phase 4: User Story 2 - View Order Details (Priority: P1)

**Goal**: Users can see full details of a specific order.

- [x] T009 [US2] Create `src/routes/account/orders/[id]/+page.server.ts` (Loader calling `getOrderById`).
- [x] T010 [US2] Create `src/routes/account/orders/[id]/+page.svelte` (Detail UI with items list, shipping info).

---

## Phase 5: Polish & Integration

- [x] T011 [Polish] Verify Empty State in `+page.svelte` (Scenario 1b).
- [x] T012 [Polish] Run `npm run lint` and `npm run check`.
