# ELEMENTHIC 代码审查指南

基于项目的 **Spec-Driven Development** 规范与 **Constitution v1.5.1** 原则。

---

## 🤖 自动化审查流程 (Automation First)

在提交任何代码之前，必须通过以下本地检查。这些检查已集成到 **Git Hooks (Husky)** 中：

1.  **静态检查**: `npm run lint` (ESLint 静态分析确保代码符合宪法准则)
2.  **类型检查**: `npm run check` (Svelte-check 确保类型与模板安全)
3.  **格式化**: `npm run format` (Prettier 确保视觉一致性)

---

## 📋 审查清单

| 维度 | 核心检查点 | 严重级别 |
|------|-----------|---------|
| **I. SvelteKit + Svelte 5 Protocol** | `$state`, `$derived`, `$props` 使用规范 | 🔴 阻断 |
| **II. Apple UX** | 视觉美学、动画、色彩系统 | 🟡 关键 |
| **III. 性能** | 预加载、图片优化、布局稳定性 | 🟡 关键 |
| **IV. 类型安全** | Zod v4、类型扩展链 | 🔴 阻断 |
| **V. 架构** | 三层数据、OCC、$env 安全、Webhook 真实性/幂等、Side-Effect 幂等 | 🔴 阻断 |
| **VI. 错误处理** | 编译警告、SSR/CSR 边界 | 🟡 关键 |
| **VII. 代码优雅** | Essential Luxury 原则 | 🟢 建议 |
| **VIII. 规范驱动** | Spec → Plan → Task 追溯 | 🔴 阻断 |

---

## 🔍 详细审查规则

### I. SvelteKit + Svelte 5 Protocol

```diff
+ ✅ 必须使用 $state, $derived, $props (启用解构)
+ ✅ 异步数据必须通过 TanStack Query v6 管理
+ ✅ 主数据必须通过 +page.server.ts 进行 SSR
+ ✅ 使用 {#snippet} 处理本地 UI 逻辑
- ❌ 禁止使用旧版 store (writable, readable)
- ❌ 禁止在客户端直接 fetch 主数据
```

### II. Apple UX Style

| 元素 | 检查项 |
|------|--------|
| **字体** | Inter / Outfit，避免系统默认 |
| **颜色** | HSL 调色，遵循 `--color-*` CSS 变量 |
| **动画** | 仅 `transform` / `opacity`，使用 `--ease-apple-spring` |
| **过渡** | Svelte 原生 `transition:` 和 `animate:flip` |

### III. Performance

```diff
+ ✅ 链接包含 data-sveltekit-preload-data="hover"
+ ✅ 图片使用 @sveltejs/enhanced-img
+ ✅ 图片设置 decoding="async" loading="lazy" aspect-ratio
- ❌ 禁止使用原生 <img> 标签
- ❌ 禁止缺少 aspect-ratio 导致 CLS
```

### IV. Type Safety

**类型链**: `pocketbase-types.ts` → `types.ts` → `schemas.ts (Zod v4)`

```diff
+ ✅ 所有 schema 使用 zod (v4)
+ ✅ Superforms 使用 zod4 adapter
- ❌ 禁止使用 zod/v3 旧版导入
- ❌ 禁止硬编码类型
```

### V. Architecture

```diff
+ ✅ 敏感操作使用 withAdmin 包装
+ ✅ 服务端密钥使用 $env/dynamic/private
+ ✅ 库存更新实现 OCC 验证
+ ✅ Webhook 处理器校验来源（签名/共享密钥），并实现幂等性与执行日志
+ ✅ 禁止在代码/文档/工作流导出中硬编码密钥或包含 pinData/PII
- ❌ 禁止在客户端暴露私有环境变量
```

### VI. Error Handling

```diff
+ ✅ 编译警告立即修复 (Compiler First)
+ ✅ 明确区分 SSR / CSR 代码边界
+ ✅ API 路由使用 apiHandler 包装
```

### VII. Code Elegance

| 原则 | 描述 |
|------|------|
| **简洁** | 代码行数最小化，保持可读性 |
| **声明式** | 优先声明式，避免命令式 |
| **平台优先** | 优先原生功能，避免第三方库膨胀 |

### VIII. Spec-Driven Workflow

**追溯链**: `Constitution → Spec → Plan → Tasks → Code`

```diff
+ ✅ 每行代码必须追溯到已批准的 Task
+ ✅ 偏离 plan.md 必须有书面修正
- ❌ 禁止无规范的"感性编程"
```

---

## ⚠️ 审查原则

> **Pull Requests 违反 Constitution 原则必须被拒绝，无论功能是否正确。**

- 🔴 **阻断**: 必须修复后才能合并
- 🟡 **关键**: 强烈建议修复
- 🟢 **建议**: 不阻断合并

---

**版本**: 1.0.0 | **创建日期**: 2026-01-31
