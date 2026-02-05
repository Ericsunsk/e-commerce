# Feature Specification: 002-Cart-Recovery (废弃购物车召回系统)

**Feature Branch**: `002-cart-recovery`  
**Created**: 2026-01-27  
**Status**: Draft  
**Input**: Integrated automation for customer retention.

## 1. Context & Objectives *(The "Why")*

- **Core Goal**: 自动识别并在适当时间通过邮件提醒那些进入结账环节但未完成支付的用户，以提高订单转化率。
- **Business/User Value**: 挽回潜在的销售损失，通过提供个性化关怀提升客户粘性。
- **Non-Goals**: 
    - 不在这个阶段重写购物车核心逻辑。
    - 不处理用户未进入 checkout 阶段的基础购物车残留。
    - 不涉及营销型群发邮件。

## 2. Functional Scenarios *(Specific Journeys)*

### Scenario 1 - 识别与触发 (The Detection Flow) (Priority: P1)

系统监听外部支付网关的结账会话过期事件。

- **Independent Logic**: 当 Stripe 产生 `checkout.session.expired` 事件时，系统必须判定该会话是否包含商品，且该用户是否有成功订单。
- **Acceptance Criteria**:
  1. **Given** 结账会话已过期，**When** 检查发现该会话状态为 `unpaid` 且包含有效商品，**Then** 将该事件推送至召回逻辑流。
  2. **Given** 会话已过期，**When** 发现该会话已通过其他路径支付成功，**Then** 终止召回动作。

---

### Scenario 2 - 延迟召回策略 (Delayed Outreach) (Priority: P2)

在结账失败后的特定时间窗口发送优惠券/提醒。

- **Acceptance Criteria**:
  1. **Given** 合法的废弃会话，**When** 距离过期已过 24 小时，**Then** 通过 Resend 发送一封带有 5% 优惠码的召回邮件。

---

## 3. System Boundaries & Constraints *(The "Rules")*

### System Boundaries
- **In-Scope**: Webhook 处理逻辑、邮件模版渲染、优惠券自动生成逻辑。
- **Out-of-Scope/Integrations**: 
    - **Stripe**: 提供原始 Session 过期事件。
    - **n8n**: 执行具体的邮件异步发送和模版拼接。
    - **PocketBase**: 存储生成的临时优惠券。

### Non-Functional Requirements
- **Performance**: Webhook 响应必须在 200ms 内完成（使用异步 Queue/Worker）。
- **Security & Privacy**: 召回邮件必须包含“退订”选项；优惠券必须是单次使用的。
- **Reliability/Error Handling**: 如果 n8n 挂了，系统必须记录日志并在恢复后重试（幂等性操作）。

### Logic Edge Cases
- 用户在收到召回邮件前已经手动回访并完成了后续支付。
- 同一用户在短时间内产生多个废弃 Session（需实现防骚扰间隔控制）。

## 4. Domain Entities *(Conceptual Model)*

- **AbandonedSession**: 记录被遗弃的购物车快照，包含用户 Email、商品清单、过期时间。
- **RecoveryAction**: 记录召回动作的状态（待发送、已发送、已转化、已失效）。
- **RewardToken**: 关联到召回邮件的单次使用折扣码。

## 5. Success Criteria *(Measurable Outcomes)*

- **SC-001**: 召回邮件的打开率预期不低于 25%。
- **SC-002**: 通过召回邮件引导的订单转化率（Recovery Rate）达到 5% 以上。
- **SC-003**: 召回流程的自动化执行成功率（Webhook 到 Email 送达）> 99%。
