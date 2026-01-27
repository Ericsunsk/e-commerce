# ELEMENTHIC | 高端 Headless 电商平台

ELEMENTHIC 是一个基于 **SvelteKit 5 + Svelte 5** 构建的现代化高性能电商平台，采用 **PocketBase** 作为全能后端的 "Vibe" 架构设计。本项目严格遵循 **Apple UX (Minimal Luxury)** 设计风格与 **Spec-Driven Development** 开发范式。

---

## 🏗️ 核心架构 (The "Luxury Vibe" Stack)

项目采用 **三层数据驱动架构 (Three-Tier Data Architecture)**，确保极致的性能与运营灵活性：

| 组件 | 职责 | 存储核心 |
|------|------|----------|
| **SvelteKit 5** | **缝合器 (The Gluer)** | SSR 渲染、服务端业务逻辑与 Webhook 调度。使用 Svelte 5 Runes。 |
| **PocketBase** | **全能后端 (CMS + DB)** | 三层存储：核心展示层、运营统计层、JSON 扩展层。 |
| **Stripe** | **财务大脑 (FinGate)** | 价格源头、支付状态机、库存同步引擎、自动税务计算。 |
| **Spec Kit** | **开发管理 (The Spec)** | 通过规范驱动开发，标准化需求、计划与任务流。 |

---

## 🛠️ 技术栈 (Technology Stack)

- **前端**: Svelte 5 (Runes) + Tailwind CSS v4 (CSS-first)
- **状态管理**: TanStack Query v5 (Server Sync) + Svelte 5 Runes
- **表单**: Superforms + Zod / Valibot (Type-safe Validation)
- **后端**: PocketBase (SQLite / Go) + Rate Limiting
- **支付**: Stripe Connect / Elements / Tax (Automatic VAT/Sales Tax)
- **开发工具**: OpenCode / Antigravity + GitHub Spec Kit

---

## 🧬 开发范式：规范驱动 (Spec-Driven Development)

本项目采用 GitHub **Spec Kit** 流程，拒绝“感性编程”（Vibe Coding），所有功能迭代（包括 UI、后端逻辑、自动化流）遵循以下链路：

1.  **Constitution (宪法)**: `.specify/memory/constitution.md` 定义了项目的核心原则（如 Svelte 5 强制规范、Apple UX 风格、OCC 库存锁）。
2.  **Specify (规范)**: 建立领域模型，定义系统边界与非功能性需求（安全性、并发性）。
3.  **Plan (计划)**: 确定技术实现方案并进行 AI 架构审计。
4.  **Implement (实现)**: 由 AI 代理（OpenCode）根据拆解的任务清单执行编码。

### 常用指令 (OpenCode Slash Commands)
在 OpenCode 聊天框输入以下指令开始协作：
- `/speckit.specify` - 创建功能规范 (架构&业务导向)
- `/speckit.plan` - 制定技术计划
- `/speckit.tasks` - 拆解具体任务
- `/speckit.implement` - 执行代码实现

---

## 📂 项目文档 (Documentation)

| 文档 | 说明 |
|------|------|
| [📜 项目宪法](.specify/memory/constitution.md) | **最高准则**: 包含核心规范、架构原则与代码准则 |
| [🎯 功能规范](.specify/specs/) | 包含 [001-UX进化](.specify/specs/001-ux-evolution/spec.md), [002-购物车召回](.specify/specs/002-cart-recovery/spec.md) 等 |
| [🤖 AI cms-skills](.agent/skills/cms-builder/SKILL.md) | PocketBase 集合架构定义与操作规程 |
| [🔐 .env.example](./.env.example) | 环境变量配置与安全准则 |

---

## 🚀 快速开始

### 1. 安装依赖与工具
```bash
# 克隆与安装
git clone <repo-url>
cd e-commerce
npm install

# 安装 Spec Kit 必需工具 uv (Python 环境管理)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 配置环境变量
```bash
cp .env.example .env
```

### 3. 启动开发服务器
```bash
# 启动 PocketBase
./pocketbase serve

# 启动前端
npm run dev
```

---

## 📊 项目进度 (Roadmap)

> 详细的任务分解见各 Feature 分支下的同步 Spec。

### ✅ Phase 12: 深度工程化重构 (Completed)
- [x] **State Management 2.0**: 引入 TanStack Query v5。
- [x] **Spec-Driven Integration**: 引入 Spec Kit 标准化工作流。

### 🔄 Phase 13: 体验与自动化进化 (In Progress)
- [x] **Universal Spec Template**: 升级规范模板，支持领域建模。
- [ ] **001-UX Evolution**: 深度对齐 Apple UX 细节动画与毛玻璃效果。
- [ ] **002-Cart Recovery**: 建立基于 Stripe Webhook + n8n 的废弃购物车召回系统。

---

## 🎨 设计系统 (Apple UX Style)

项目使用 Tailwind CSS v4，严格遵守 HSL 动态调色与现代排版：

```css
@theme {
    /* 核心原则：高对比度、清晰的层级、丝滑的动画 */
    --font-sans: "Inter", "Outfit", system-ui;
    --font-display: "Optima", "Georgia", serif;
    
    /* 动画：优先使用 GPU 加速属性 */
    --animation-apple-spring: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 📜 License

MIT

---

*Built with ❤️ using SvelteKit, Spec Kit, and OpenCode*
