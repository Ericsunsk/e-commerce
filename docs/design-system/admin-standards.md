# 管理后台页面设计标准与规范 (Admin Design Standards)

本文档定义 Elementhic / Jevarie 管理后台的设计标准、视觉语言与页面构建脚手架规范。所有后台新页面开发或旧页面重构均需遵循本标准。

---

## 1. 核心设计原则 (Design Principles)

1. **极简克制的现代高级感 (Minimalist Luxury)**
   - 采用冷色调锌灰（`zinc-50` ~ `zinc-900`）为主基底，避免高饱和色彩大面积铺陈。
   - 纯白内容卡片（`bg-white`）搭配超轻浅边框（`border-zinc-200/80`）与微投影（`shadow-xs`），营造柔和细腻的立体层次。
2. **5-Role 语义化状态色彩 (Semantic States)**
   - **Success (已发布 / 已完成 / 正常营业)**: `emerald-700 bg-emerald-50 border-emerald-200/60`
   - **Warning (待处理 / 维护中 / 库存紧张)**: `amber-700 bg-amber-50 border-amber-200/60`
   - **Danger (已取消 / 已退款 / 错误状态)**: `rose-700 bg-rose-50 border-rose-200/60`
   - **Info (进行中 / 运送中 / 提示)**: `sky-700 bg-sky-50 border-sky-200/60`
   - **Neutral (草稿 / 禁用 / 默认)**: `zinc-500 bg-zinc-50 border-zinc-200/60`
   - 所有徽标（Badge）统一使用等宽数字字体 `font-mono`，文字字号为 `10px`（`text-[10px]`）。
3. **明确的视觉节奏与间距律动**
   - 页面纵向间距一律采用 `space-y-8`，底部留白 `pb-24` 保证内容不被悬浮底栏遮挡。
   - 主标题一律大写加宽字间距（`font-display font-bold uppercase tracking-widest text-zinc-900`）。

---

## 2. Admin Design Tokens 速查目录

Tokens 统一定义于 `$shared/kernel`（`src/lib/shared/kernel/design-tokens.ts`）：

```ts
import {
  ADMIN_PAGE,
  ADMIN_SEGMENTED,
  ADMIN_CARDS,
  ADMIN_BADGES,
  ADMIN_FORMS,
  ADMIN_BUTTONS,
  ADMIN_TABLE,
  ADMIN_FLOATING_BAR,
  ADMIN_DRAWER,
  ADMIN_TOKENS
} from '$shared/kernel';
```

### 2.1 页面顶栏 (Page Header)
```svelte
<div class={ADMIN_PAGE.header}>
  <div>
    <h1 class={ADMIN_PAGE.title}>页面标题</h1>
    <p class={ADMIN_PAGE.subtitle}>一句话描述本页面的核心功能与运营范围</p>
  </div>
  <div class="flex items-center gap-3">
    <!-- 右侧快捷操作区 / 分段选择器 -->
  </div>
</div>
```

### 2.2 分段选择控制器 (Segmented Pills)
```svelte
<div class={ADMIN_SEGMENTED.wrapper}>
  {#each tabs as tab}
    <button
      type="button"
      class={activeTab === tab.key ? ADMIN_SEGMENTED.itemActive : ADMIN_SEGMENTED.itemInactive}
      onclick={() => (activeTab = tab.key)}
    >
      {tab.label}
    </button>
  {/each}
</div>
```

### 2.3 卡片体系 (Card Taxonomy)
- **`ADMIN_CARDS.kpi`**: 适用于数据看板、指标统计（含环比变动徽标与 Sparkline 趋势图）。
- **`ADMIN_CARDS.section`**: 适用于表单分区、品牌设置面板（包含 `header` 图标方盒、标题与分割线）。
- **`ADMIN_CARDS.table`**: 适用于容纳数据表格的外壳容器。
- **`ADMIN_CARDS.iconBox`**: 头部左侧 32x32 灰底图标容器（`w-8 h-8 rounded-lg bg-zinc-100`）。

### 2.4 状态徽标 (Badges)
```svelte
<span class={ADMIN_BADGES.success}>+18.4%</span>
<span class={ADMIN_BADGES.warning}>待发货</span>
<span class={ADMIN_BADGES.danger}>已退款</span>
<span class={ADMIN_BADGES.info}>运输中</span>
<span class={ADMIN_BADGES.neutral}>草稿</span>
```

### 2.5 表单与输入框 (Forms & Controls)
```svelte
<label class="block">
  <span class={ADMIN_FORMS.label}>字段名称</span>
  <input type="text" class={ADMIN_FORMS.input} bind:value={name} />
  <span class={ADMIN_FORMS.help}>辅助说明文本</span>
</label>
```

### 2.6 按钮标准 (Action Buttons)
- **主要操作 (`ADMIN_BUTTONS.primary`)**: 纯黑白字，大写追踪字距，高对比度。
- **次要操作 (`ADMIN_BUTTONS.secondary`)**: 白底灰字微细线，用于“查看前台”、“导出”等。
- **危险操作 (`ADMIN_BUTTONS.danger`)**: 浅红悬浮背景，用于单条记录删除。

---

## 3. 三大典型页面模板脚手架 (Page Archetypes)

### 模式 A：运营指标总览页 (Metrics Dashboard)
- **适用场景**：`/admin` 运营数据大盘、营销转化分析、报表中心。
- **核心组件**：
  1. 顶栏：标题 + 时间范围分段胶囊（今日 / 7天 / 30天 / 全部）。
  2. 首屏：4 列网格 KPI 卡片（`ADMIN_CARDS.kpi`），每卡内置主指标数值、同比增减标签与 SVG 微走势图（Sparkline）。
  3. 次屏：主趋势曲线图（AreaChart）+ 状态流转漏斗图。
  4. 底部：TOP 畅销榜 / 库存预警双栏联动表格。

### 模式 B：资源表格与管理台 (Resource Management Table)
- **适用场景**：`/admin/products` 商品管理、`/admin/orders` 订单列表、`/admin/content/sections` 页面排版。
- **核心组件**：
  1. 顶栏：标题 + 筛选标签栏（全部 / 分组A / 分组B）+「新建条目」主按钮。
  2. 主体：`ADMIN_CARDS.table` 内嵌数据表格。
  3. 行内交互：状态 Switch 开关即时响应、排序权重升降快速点击微调。
  4. 侧滑抽屉：点击编辑打开 `ADMIN_DRAWER`，半屏滑出抽屉表单，主内容区不重排。

### 模式 C：控制中心与配置看板 (Hub & Settings Board)
- **适用场景**：`/admin/content` 内容中心、`/admin/settings` 系统平台配置。
- **核心组件**：
  1. 模块入口网格：3 列大卡片直接展示各子模块数量指标与跃迁按钮。
  2. 垂直分块表单：使用 `ADMIN_CARDS.section` 将庞杂配置拆解为品牌、交易、运维等高内聚卡片。
  3. 吸底保存栏：使用 `ADMIN_FLOATING_BAR` 搭配脏数据侦测（`isDirty`），提供放弃修改与一键提交。

---

## 4. 质量门禁要求 (Quality Gates)

任何新页面或改动必须通过以下四重自动化门禁验证：
```bash
npm run check        # SvelteKit 类型与模板语法检查 (0 errors, 0 warnings)
npm run lint         # ESLint 代码风格检查 (0 warnings)
npm test -- --run    # Vitest 单元与集成测试 (100% 通过)
npm run build        # Cloudflare Pages 生产适配打包验证
```
