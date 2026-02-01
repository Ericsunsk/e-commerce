# Stripe → PocketBase 订单创建 Workflow

## 概述
此 n8n workflow 处理 Stripe 支付成功后的订单创建逻辑，替代原有的 SvelteKit webhook 处理。

## Workflow 结构

```
┌─ Stripe Webhook Trigger ─────────────────────────────────────────────┐
│  Event: payment_intent.succeeded                                      │
│  URL: https://n8n.sunshikang.eu.org/webhook/stripe-order-webhook     │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Parse Order Data ───────────────────────────────────────────────────┐
│  Type: Code (JavaScript)                                              │
│  Extract order_data from PaymentIntent.metadata                       │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Create Order in PocketBase ─────────────────────────────────────────┐
│  Type: HTTP Request                                                   │
│  Method: POST                                                         │
│  URL: https://pb.elementhic.com/api/collections/orders/records       │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Clear User Cart ────────────────────────────────────────────────────┐
│  Type: HTTP Request (only if user_id exists)                          │
│  Step 1: GET user_lists where user=user_id && type="cart"            │
│  Step 2: DELETE the cart record                                       │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Send Notification (Optional) ───────────────────────────────────────┐
│  Type: Email / Slack                                                  │
│  Send order confirmation                                              │
└───────────────────────────────────────────────────────────────────────┘
```

## 配置步骤

### 1. 创建 Stripe Webhook Trigger
- **Node Type**: Webhook
- **HTTP Method**: POST
- **Path**: `stripe-order-webhook`
- **Response Mode**: Immediately respond with 200

### 2. 验证 Stripe Signature (可选但推荐)
在 Stripe Dashboard 中配置 Webhook 端点指向 n8n。

### 3. Parse Order Data 节点
```javascript
// Code Node - JavaScript
const event = $json.body;

// 验证事件类型
if (event.type !== 'payment_intent.succeeded') {
  return { skip: true };
}

const paymentIntent = event.data.object;
const metadata = paymentIntent.metadata || {};

// 解析订单数据
let orderData;
try {
  orderData = JSON.parse(metadata.order_data || '{}');
} catch (e) {
  orderData = {};
}

return {
  payment_intent_id: paymentIntent.id,
  customer_id: paymentIntent.customer,
  amount: paymentIntent.amount,
  currency: paymentIntent.currency,
  
  // 订单数据
  user_id: orderData.user_id || metadata.user_id || '',
  customer_email: orderData.customer_email || '',
  customer_name: orderData.customer_name || 'Guest',
  items: orderData.items || [],
  amount_subtotal: orderData.amount_subtotal || paymentIntent.amount,
  amount_shipping: orderData.amount_shipping || 0,
  amount_tax: orderData.amount_tax || 0,
  amount_total: orderData.amount_total || paymentIntent.amount,
  shipping_address: orderData.shipping_address || {},
  coupon_code: orderData.coupon_code || ''
};
```

### 4. Create Order 节点 (HTTP Request)
- **Method**: POST
- **URL**: `https://pb.elementhic.com/api/collections/orders/records`
- **Authentication**: Header Auth
  - **Header Name**: `Authorization`
  - **Header Value**: (需要先获取 admin token)
  
- **Body (JSON)**:
```json
{
  "user": "{{ $json.user_id || null }}",
  "stripe_payment_intent": "{{ $json.payment_intent_id }}",
  "customer_email": "{{ $json.customer_email }}",
  "customer_name": "{{ $json.customer_name }}",
  "items": {{ JSON.stringify($json.items) }},
  "amount_subtotal": {{ $json.amount_subtotal }},
  "amount_shipping": {{ $json.amount_shipping }},
  "amount_tax": {{ $json.amount_tax }},
  "amount_total": {{ $json.amount_total }},
  "currency": "{{ $json.currency }}",
  "status": "paid",
  "shipping_address": {{ JSON.stringify($json.shipping_address) }}
}
```

### 5. Clear Cart 节点 (IF + HTTP Request)

**IF Node**: Check if user_id exists
- Condition: `{{ $json.user_id }}` is not empty

**HTTP Request - Find Cart**:
- **Method**: GET
- **URL**: `https://pb.elementhic.com/api/collections/user_lists/records?filter=(user='{{ $json.user_id }}' %26%26 type='cart')`

**HTTP Request - Delete Cart**:
- **Method**: DELETE
- **URL**: `https://pb.elementhic.com/api/collections/user_lists/records/{{ $json.items[0].id }}`

## PocketBase Admin Token

需要在 n8n 中配置 PocketBase 管理员认证。

**方法 1: 使用 Header Auth Credential**
1. 在 n8n 中创建 HTTP Header Auth credential
2. Header Name: `Authorization`
3. Header Value: 需要先用 API 获取 admin token

**方法 2: 添加认证节点**
在 workflow 开头添加一个 HTTP Request 节点获取 token：
```
POST https://pb.elementhic.com/api/collections/_superusers/auth-with-password
Body: { "identity": "support@elementhic.com", "password": "..." }
```
然后在后续节点使用 `{{ $node["Auth"].json.token }}`

## Stripe Webhook 配置

1. 登录 Stripe Dashboard → Developers → Webhooks
2. 添加端点: `https://n8n.sunshikang.eu.org/webhook/stripe-order-webhook`
3. 选择事件: `payment_intent.succeeded`
4. 获取 Webhook Signing Secret (可选，用于验证)

## 测试

1. 在 Stripe Dashboard 发送测试 webhook
2. 或使用 Stripe CLI: `stripe trigger payment_intent.succeeded`
3. 检查 n8n 执行历史
4. 验证 PocketBase 中是否创建了订单

## 错误处理

建议添加 Error Trigger 节点：
- 当 workflow 失败时发送 Slack/Email 通知
- 记录失败的 payment_intent_id 以便后续处理
