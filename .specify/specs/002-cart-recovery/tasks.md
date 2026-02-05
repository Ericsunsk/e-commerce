# Task List: 002-Cart-Recovery (废弃购物车召回系统)

**Branch**: `002-cart-recovery` | **Date**: 2026-01-27 | **Plan**: [./plan.md]
**Input**: Implementation plan from `/specs/002-cart-recovery/plan.md`

## Overview
本阶段将分 5 个原子任务实现废弃购物车召回的核心链路。所有逻辑将严格遵守 **Essential Luxury** 代码哲学，确保简洁且鲁棒。

---

## 🏗️ Phase 1: Data Foundation (PocketBase)

### Task 1: Initialize DB Schema
- [ ] **Action**: 在 PocketBase 建立 `recovery_actions` 和 `reward_tokens` 两个 Collection。
    - `recovery_actions`: 字段包含 `email`, `stripe_session_id`, `status` (pending/sent/converted/failed), `cart_snapshot` (json)。
    - `reward_tokens`: 字段包含 `code`, `discount_type`, `used` (bool), `expiry` (datetime)。
- [ ] **Validation**: 手动在 PB 管理面板添加一条测试数据，确保字段类型和权限配置（Admin-only）正确。

---

## ⚙️ Phase 2: Hook & Service Logic (SvelteKit)

### Task 2: Create Webhook Endpoint
- [ ] **Action**: 创建 `src/routes/api/webhooks/stripe/session-expired/+server.ts`。
    - 实现 Stripe 事件验证逻辑。
    - 解析 `checkout.session.expired` 载荷。
- [ ] **Validation**: 使用 `curl` 模拟一个模拟的 Stripe Webhook 请求，检查是否能正确识别事件类型。

### Task 3: Implement Recovery Service
- [ ] **Action**: 在 `src/lib/server/recovery.ts` 中编写核心过滤函数。
    - 函数 `shouldTriggerRecovery(email)`: 检查 24 小时内是否有成功订单（查询 PB `orders`）。
    - 函数 `createRecoveryEntry(sessionData)`: 在 PB 中持久化召回行为。
- [ ] **Validation**: 编写 Unit Test 模拟不同时间窗口的订单数据，确保过滤逻辑准确。

---

## 📧 Phase 3: External Integration (n8n & Resend)

### Task 4: Implement n8n Dispatcher
- [ ] **Action**: 在 `src/lib/server/n8n.ts` 中封装对 n8n Webhook 的调用。
    - 使用 `fetch` 发送包含 Email、商品快照和优惠券代码的 POST 请求。
    - 实现重试逻辑（简单的 3 次指数退避）。
- [ ] **Validation**: 确保 n8n 接收到请求后返回 200，并记录发送日志。

---

## 🚀 Phase 4: Integration & Polish

### Task 5: End-to-End Wiring
- [ ] **Action**: 将 Webhook、Recovery Service 和 n8n Dispatcher 串联。
    - 在 Webhook 处理器中调用 Service。
    - 确保主流程为异步执行，不阻塞 Stripe 回调。
    - 完善错误处理：如果召回失败，将 `recovery_actions` 状态标记为 `failed`。
- [ ] **Validation**: 全链路模拟测试：模拟过期事件 -> PB 生成记录 -> n8n 接收数据。

---

## 📋 Success Checklist
- [ ] Webhook 响应时间 < 200ms。
- [ ] 已支付用户绝对不会收到召回邮件。
- [ ] 优惠券代码在 PB 中被标记为单次使用。
