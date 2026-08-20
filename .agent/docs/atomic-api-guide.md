# Stripe 订单处理工作流指南

本文档说明 Stripe 订单处理工作流的架构设计和使用方式。

## 📐 架构概览

```
Stripe Webhook
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    n8n 工作流                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ 验证签名 │→│ 创建订单 │→│ 原子操作 │→│ 发送邮件 │    │
│  └─────────┘  └─────────┘  └────┬────┘  └─────────┘    │
└────────────────────────────────│────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   SvelteKit 原子 API   │
                    │  /api/inventory/deduct │
                    │  /api/coupons/increment│
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │      PocketBase        │
                    └────────────────────────┘
```

---

## 📁 文件结构

```
e-commerce/
├── src/routes/api/
│   ├── inventory/deduct/+server.ts       # 原子库存扣减 API
│   └── coupons/increment/+server.ts      # 原子优惠券递增 API
└── .agent/docs/atomic-api-guide.md       # 本文档
```

---

## 🔌 API 端点

### 1. 库存原子扣减 - `POST /api/inventory/deduct`

**请求**:
```bash
curl -X POST https://jevarie.com/api/inventory/deduct \
  -H "X-Webhook-Secret: <WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_id",
    "items": [
      {"productId": "xxx", "variantId": null, "quantity": 1}
    ]
  }'
```

**请求约束**:
- 当一个 `productId` 对应多个变体时，`variantId` 必填；否则接口会返回失败并要求显式传入变体。
- 接口执行的是“校验后扣减”语义：库存不足会返回失败，不会写入。

**响应**:
```json
{
  "success": true,
  "orderId": "order_id",
  "results": [
    {
      "productId": "xxx",
      "variantId": null,
      "success": true,
      "previousStock": 10,
      "newStock": 9
    }
  ],
  "processedAt": "2026-02-04T08:30:00.000Z"
}
```

**实现对齐（当前）**:
- 库存写入仅更新 `product_variants.stock_quantity`。
- `stock_status` 不再落库（运行时按 `stock_quantity` 计算）。

### 2. 优惠券原子递增 - `POST /api/coupons/increment`

**请求**:
```bash
curl -X POST https://jevarie.com/api/coupons/increment \
  -H "X-Webhook-Secret: <WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "SAVE10", "orderId": "order_id"}'
```

**响应**:
```json
{
  "success": true,
  "couponCode": "SAVE10",
  "previousUsage": 5,
  "newUsage": 6,
  "usageLimit": 100,
  "processedAt": "2026-02-04T08:30:00.000Z"
}
```

---

## ⚙️ n8n 工作流配置

### 导入步骤
1. 打开 n8n
2. 从项目文件导入工作流：`.agent/workflows/Jevarie Stripe Order.json`
3. 进入已导入的订单工作流（`Jevarie Stripe Order`）
4. 修改 **⚙️ Config** 节点中的配置值

### 配置项
| 变量 | 说明 |
|------|------|
| `POCKETBASE_URL` | PocketBase 地址 |
| `SVELTEKIT_URL` | SvelteKit 应用地址（原子 API） |
| `WEBHOOK_SECRET` | 内部认证密钥 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 密钥 |
| `RESEND_API_KEY` | Resend 邮件服务密钥 |
| `EMAIL_FROM` | 发件人地址 |
| `SITE_NAME` | 站点名称 |

---

## 🔄 状态追踪 (order_meta)

每个订单的 `notes` 字段存储 JSON 格式的处理状态：

```json
{
  "schema": "v2",
  "steps": {
    "stock": true,
    "coupon": true,
    "email": true
  },
  "ts": {
    "created": "2026-02-04T08:00:00.000Z",
    "stock": "2026-02-04T08:00:01.000Z",
    "coupon": "2026-02-04T08:00:02.000Z",
    "email": "2026-02-04T08:00:03.000Z"
  }
}
```

### 幂等性保证
- 工作流检查 `steps.stock/coupon/email` 状态
- 已完成的步骤会被跳过
- Stripe 重发 webhook 时自动补跑未完成步骤

---

## 🧩 数据模型对齐（2026-02-24）

- 商品价格来源统一为 `products`（Stripe 映射价格）。
- `product_variants.price_override` 已移除，工作流与 API 不应依赖变体覆盖价。
- `product_variants.gallery_images` 与 `products.attributes` 保留，用于商品展示与详情内容。

---

## 🛡️ 安全特性

1. **Stripe 签名验证**: HMAC-SHA256 + 5 分钟时间窗口
2. **内部 API 认证**: X-Webhook-Secret 请求头
3. **原子操作**: 库存检查后才扣减，防止超卖
4. **重试机制**: 所有 HTTP 请求支持自动重试

---

## 🚀 部署清单

- [ ] 部署 SvelteKit 应用（包含原子 API）
- [ ] 添加环境变量 `N8N_WEBHOOK_SECRET`
- [ ] 导入 n8n 工作流
- [ ] 配置 ⚙️ Config 节点
- [ ] 在 Stripe Dashboard 添加 Webhook 端点
- [ ] 激活工作流
- [ ] 测试订单流程
