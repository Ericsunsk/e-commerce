# Implementation Plan: 002-Cart-Recovery (废弃购物车召回系统)

**Branch**: `002-cart-recovery` | **Date**: 2026-01-27 | **Spec**: [./spec.md]
**Input**: Feature specification from `/specs/002-cart-recovery/spec.md`

## Summary
本计划旨在使用 SvelteKit 和 n8n 构建一个自动化的购物车召回引擎。系统将监听 Stripe 的会话过期事件，通过 SvelteKit 进行业务逻辑判定（如检查是否已通过其他方式支付），在 PocketBase 中持久化召回行为并生成单次使用的优惠券，最后通过 n8n 调度 Resend 发送个性化邮件。

## Technical Context

**Language/Version**: TypeScript 5.9, Svelte 5.45+
**Primary Dependencies**: SvelteKit 2, Stripe SDK, PocketBase SDK, n8n (External), Resend (External)
**Storage**: PocketBase (new collections: `recovery_actions`, `reward_tokens`)
**Testing**: Vitest (Logic testing), Playwright (Webhook simulation)
**Target Platform**: Edge Platforms (SvelteKit) + n8n Cloud/Self-hosted
**Project Type**: Mixed (Web Backend + Automation)

## Commerce Model Constraints (Updated 2026-02-24)

- 商品价格统一来源于 `products`（Stripe 映射），召回快照中的单价必须与该来源一致。
- `product_variants.price_override` 已移除，召回链路不得依赖变体覆盖价。
- `stock_status` 不再落库，若需要库存判断，必须基于 `stock_quantity` 在运行时计算。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Svelte 5 Runes**: N/A (后端 API 逻辑为主)
- **Apple UX Style**: 邮件模版需符合 Minimal Luxury 风格，采用 Manrope/Optima 字体，极简排版。
- **Performance**: Webhook 必须异步处理召回逻辑，主线程 200ms 内返回 200 OK 给 Stripe。
- **Security**: 严格使用 `$env/static/private` 存储 n8n Webhook Key 和 Stripe Secret。

## Project Structure

### Documentation (this feature)

```text
specs/002-cart-recovery/
├── plan.md              # This file
├── spec.md              # Specification
└── data-model.md        # PocketBase Collections definition
```

### Source Code

```text
src/
├── routes/
│   └── api/
│       └── webhooks/
│           └── stripe/
│               └── session-expired/
│                   └── +server.ts  # Webhook handler
├── lib/
│   ├── server/
│   │   ├── recovery.ts    # Recovery logic service
│   │   └── n8n.ts         # n8n dispatcher
│   └── types.ts           # Types for recovery sessions
```

## Implementation Strategy

### Phase 1: Data Modeling (PocketBase)
1.  **Collection: `recovery_actions`**:
    - `email`: string
    - `stripe_session_id`: string (unique)
    - `status`: select (pending, sent, converted, failed)
    - `cart_snapshot`: json（推荐结构：`items[]` 含 `productId`/`variantId`/`quantity`/`unitPriceCents`/`color`/`size`/`title`）
2.  **Collection: `reward_tokens`**:
    - `code`: string
    - `discount_type`: fixed/percentage
    - `used`: bool
    - `expiry`: datetime

### Phase 2: SvelteKit Webhook & Logic
1.  实现 `/api/webhooks/stripe/session-expired` 入口。
2.  集成 `stripe.webhooks.constructEvent` 确保请求真实性。
3.  在 `src/lib/server/recovery.ts` 中实现：
    - 检查该电子邮件在过去 24 小时内是否已有成功订单。
    - 检查该 Session 是否包含商品。
    - 如果满足条件，在 PocketBase 创建记录，并触发 `n8n.ts`。

### Phase 3: n8n Workflow (External)
1.  **Webhook Trigger**: 接收包含 Email 和优惠券的 JSON。
2.  **Template Engine**: 使用 HTML 代码块根据架构宪法渲染 Luxury 风格邮件。
3.  **Resend Node**: 发送邮件。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| External n8n dependency | 解耦邮件发送与核心业务逻辑 | 在 SvelteKit 内部写邮件模板太重且逻辑改动频繁 |
| Mixed logic in SvelteKit | 需要利用现有的 PB 和 Stripe 库进行快速状态判定 | 单独写个 Python 微服务会增加基础设施负担 |
