# SkillManager — Skills 管理与安装工具
## 产品规格文档 v1.0

> 文档状态：草稿  
> 创建日期：2026-07-07  
> 适用版本：SkillManager Desktop v1.0

---

## 目录

1. [产品概述](#1-产品概述)
2. [目标用户](#2-目标用户)
3. [设计规范](#3-设计规范)
4. [桌面端架构](#4-桌面端架构)
5. [界面与交互设计](#5-界面与交互设计)
6. [功能规格](#6-功能规格)
7. [数据模型](#7-数据模型)
8. [技术栈](#8-技术栈)
9. [开发计划与任务分解](#9-开发计划与任务分解)
10. [里程碑与进度追踪](#10-里程碑与进度追踪)
11. [验收标准](#11-验收标准)

---

## 1. 产品概述

### 1.1 产品定义

**SkillManager** 是一款桌面端 Skills 管理与安装工具，旨在解决 AI 编程工具（Claude Code、Agents、自动化任务工具等）在多业务场景下技能工具集繁杂、查找困难、切换成本高的问题。

### 1.2 核心价值

| 痛点 | 解决方案 |
|------|----------|
| 不同业务场景需要不同技能集 | 工作区(Workspace)系统，一键切换场景 |
| 技能过多难以快速查找 | 分类、标签、全文搜索三维定位 |
| 技能安装/更新管理混乱 | 统一安装面板，版本追踪 |
| 多工具技能分散管理 | 工具适配器，统一管理界面 |
| 无法记录技能使用说明 | 备注与注释系统 |
| 技能仓库来源混乱 | 多仓库管理，优先级配置 |

### 1.3 产品愿景

> 让每一个 AI 开发者都能像管理代码库一样，精准、高效地管理自己的技能武器库。

---

## 2. 目标用户

### 2.1 核心用户画像

**主要用户：AI 驱动开发者**
- 日常使用 Claude Code、Agents 等 AI 编程工具
- 安装了 10+ 个 Skills，管理混乱
- 在多个业务项目间频繁切换（如前端开发、数据分析、内容生成）
- 希望团队共享统一的技能配置

**次要用户：自动化工程师**
- 构建自动化工作流，依赖多种技能工具
- 需要场景化的技能配置文件导入/导出
- 注重工具稳定性和版本一致性

### 2.2 使用场景

1. **日常开发**：前端 ↔ 后端 ↔ 数据分析工作区快速切换
2. **团队协作**：导出工作区配置，团队成员一键同步
3. **技能探索**：浏览仓库，发现新技能，一键安装并分类
4. **项目交付**：为特定项目创建专属技能工作区，减少干扰

---

## 3. 设计规范

> 设计风格参考 cc-switch，延续其精致、高端的暗色系桌面工具风格。

### 3.1 视觉风格定义

**风格关键词**：精密感 · 沉浸暗色 · 玻璃质感 · 流体动效

**对标参考**：
- cc-switch（主要参考）：系统托盘集成、暗色主题、中文优先
- Linear：清晰的信息层级与快捷键驱动
- Raycast：极简搜索入口 + 快速命令面板

### 3.2 色彩系统

```
主背景      #0d0d0f    极深暗色，避免纯黑
次背景      #141416    卡片/面板背景
表面层      #1c1c1f    悬停态、选中态背景
边框        #2a2a2e    1px 边框线，hairline 风格
文字-主     #f0f0f2    主要文字
文字-次     #8a8a94    辅助文字、描述
文字-占位   #4a4a54    占位文字

强调色      #6366f1    Indigo（主动作：安装、确认）
强调次      #818cf8    浅 Indigo（hover 态）
成功        #22c55e    绿色（已启用、已安装）
警告        #f59e0b    琥珀（有更新、注意）
危险        #ef4444    红色（卸载、禁用）
```

**禁止使用**：
- AI 紫色渐变叠白底（`#a855f7 on #ffffff`）
- 纯黑背景（`#000000`）
- Inter 作为中文默认字体

### 3.3 字体规范

```
英文主字体    Geist / Outfit
中文字体      系统字体：-apple-system / 微软雅黑 / PingFang SC
代码字体      Geist Mono / JetBrains Mono
```

**字阶系统**：
```
标题大   24px / weight 700 / tracking -0.02em
标题中   18px / weight 600 / tracking -0.01em
标题小   14px / weight 600
正文     13px / weight 400 / line-height 1.6
辅助     12px / weight 400 / color 文字-次
标签     11px / weight 500 / uppercase / tracking 0.08em
```

### 3.4 间距系统

```
基础单位: 4px
xs: 4px    sm: 8px    md: 12px
lg: 16px   xl: 24px   2xl: 32px   3xl: 48px
```

### 3.5 圆角规范

```
元素小（Tag、Badge）   rounded-full（9999px）
元素中（Card、Input）  6px
元素大（Panel、Modal） 10px
应用窗口外框           12px
```

### 3.6 玻璃质感规范

```css
/* 浮层面板玻璃效果 */
.glass-panel {
  background: rgba(20, 20, 22, 0.85);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* 卡片玻璃效果 */
.glass-card {
  background: rgba(28, 28, 31, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

### 3.7 动效规范

```css
/* 标准缓动变量 */
--ease-standard:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-elastic:   cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* 时长变量 */
--duration-micro:  100ms;  /* 按钮按压 */
--duration-fast:   150ms;  /* hover 状态 */
--duration-normal: 200ms;  /* 下拉展开 */
--duration-slow:   300ms;  /* 面板进入 */
--duration-page:   400ms;  /* 页面切换 */
```

**动效规则**：
- 列表项目：`stagger` 进入，延迟 `i * 30ms`
- 侧边栏折叠：`width` + `opacity` 同步动画
- 卡片 hover：`translateY(-2px)` + `shadow` 加深
- 工作区切换：淡入淡出 + 列表重新 stagger

---

## 4. 桌面端架构

### 4.1 技术选型

**框架选择：Tauri 2.x**

选择理由：
- 原生系统托盘、开机自启、通知等 API
- 包体积远小于 Electron（< 10MB vs 100MB+）
- Rust 后端性能更佳，SQLite 原生绑定高效
- 内存占用低（cc-switch 为参考，保持低资源占用）
- Windows / macOS / Linux 跨平台

**技术组合**：
```
桌面框架    Tauri 2.x (Rust)
前端框架    React 19 + TypeScript
样式方案    Tailwind CSS v4 + CSS Variables
状态管理    Zustand（轻量，无 Redux 样板代码）
路由        React Router v7
数据查询    TanStack Query v5
数据库      SQLite（via tauri-plugin-sql）
动效库      Motion One / Framer Motion
图标        Lucide React + 自定义 SVG
打包        Vite 6
```

### 4.2 应用入口设计

```
应用启动 ──► 系统托盘图标
               │
               ├── 单击托盘  ──► 主窗口显示/隐藏
               ├── 右键托盘  ──► 快捷菜单（当前工作区/切换/退出）
               └── 主窗口
                     ├── 快捷键 Cmd/Ctrl+K  ──► 命令面板
                     └── 正常模式  ──► 主界面
```

### 4.3 窗口规格

```
主窗口
  默认尺寸：1100 x 720px
  最小尺寸：800 x 560px
  无原生标题栏（自定义拖拽区域）
  窗口圆角：12px（macOS 原生 / Windows 自定义）

命令面板（Spotlight 风格）
  宽度：640px
  最大高度：480px
  居中浮层，背景模糊遮罩

托盘快捷窗口
  宽度：320px
  高度：自适应（max 480px）
  从托盘图标弹出
```

### 4.4 目录结构

```
src/
├── main/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/        # IPC 命令
│   │   │   ├── skills.rs
│   │   │   ├── workspace.rs
│   │   │   └── repository.rs
│   │   ├── adapters/        # 工具适配器
│   │   │   ├── claude_code.rs
│   │   │   ├── agents.rs
│   │   │   └── trait.rs
│   │   └── db/              # 数据库操作
│   └── Cargo.toml
│
├── renderer/                # React 前端
│   ├── src/
│   │   ├── app/             # 路由与布局
│   │   ├── pages/           # 页面组件
│   │   │   ├── Skills/      # 技能列表页
│   │   │   ├── Workspace/   # 工作区管理
│   │   │   ├── Discover/    # 技能发现/安装
│   │   │   ├── Repository/  # 仓库管理
│   │   │   └── Settings/    # 设置
│   │   ├── components/      # 共享组件
│   │   │   ├── SkillCard/
│   │   │   ├── CommandPalette/
│   │   │   ├── CategoryTree/
│   │   │   └── ...
│   │   ├── stores/          # Zustand stores
│   │   ├── hooks/           # 自定义 hooks
│   │   └── lib/             # 工具函数
│   └── index.html
│
└── tauri.conf.json
```

---

## 5. 界面与交互设计

### 5.1 主界面布局

```
┌─────────────────────────────────────────────────────────────────┐
│ ← 自定义标题栏（拖拽区）        [搜索 ⌘K]    [─] [□] [✕]      │
├───────────┬─────────────────────────────────────────────────────┤
│           │                                                     │
│  侧边栏   │                    主内容区                          │
│  160px    │                    flex-1                           │
│           │                                                     │
│  [图标]   │  ┌──── 顶部工具栏 ────────────────────────────────┐ │
│  技能库   │  │ 分类筛选 / 工具筛选 / 排序 / [+ 安装技能]      │ │
│           │  └─────────────────────────────────────────────────┘ │
│  [图标]   │                                                     │
│  工作区   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                 │
│           │  │Card │ │Card │ │Card │ │Card │  ...             │
│  [图标]   │  └─────┘ └─────┘ └─────┘ └─────┘                 │
│  发现     │                                                     │
│           │  ┌─────┐ ┌─────┐ ┌─────┐                         │
│  [图标]   │  │Card │ │Card │ │Card │                          │
│  仓库     │  └─────┘ └─────┘ └─────┘                         │
│           │                                                     │
│  ────     │                                                     │
│  [图标]   │                                                     │
│  设置     │                                                     │
│           │                                                     │
└───────────┴─────────────────────────────────────────────────────┘
```

### 5.2 侧边栏规格

**宽度**：160px（图标 + 文字模式）/ 48px（折叠图标模式）

**导航项目**：
```
🗂 技能库      /skills      主功能
🔲 工作区      /workspaces  场景管理
🔍 发现        /discover    浏览安装
📦 仓库        /repos       仓库配置
───────────────────────────
⚙️ 设置        /settings
```

**当前工作区气泡**（侧边栏底部）：
```
┌─────────────────────────┐
│ ◉ 前端开发              │
│   8 个技能已激活         │
│   [切换工作区 ▾]        │
└─────────────────────────┘
```

### 5.3 技能卡片规格

**卡片尺寸**：240px × 140px（默认），支持列表视图切换

```
┌────────────────────────────────────┐
│ [图标] brandkit            [●启用] │  ← 图标 32px，状态 Badge
│                                    │
│ 品牌设计工具，生成品牌视觉规范      │  ← 描述截断 2 行
│ 方案，支持暗色/明色主题...         │
│                                    │
│ 📁 图像生成  🏷 design  brand     │  ← 分类 + 标签
│                                    │
│ [agents]           [⋯ 操作菜单]   │  ← 工具标识 + 菜单
└────────────────────────────────────┘
```

**卡片状态变体**：
- `enabled`：边框 `rgba(99,102,241,0.3)`，状态绿点
- `disabled`：整体透明度 50%，灰色状态点
- `update-available`：右上角橙色更新角标
- `hover`：`translateY(-2px)`，边框 Indigo 高亮，阴影加深
- `selected`：边框 Indigo 实色，背景略亮

### 5.4 技能详情侧滑面板

点击卡片弹出右侧抽屉（宽 360px），动画从右侧滑入：

```
┌──────────────────────────────────────┐
│ ✕          brandkit                  │
│                                      │
│ [大图标 64px]                        │
│ brandkit                             │
│ v2.1.0 · agents · ◉ 已启用           │
│                                      │
│ ─ 基本信息 ──────────────────────    │
│ 来源    vercel-labs/skills@brandkit  │
│ 安装于  2025-12-01                   │
│ 最后使用 3天前                        │
│ 使用次数 47次                         │
│                                      │
│ ─ 分类与标签 ────────────────────    │
│ [图像生成 ✕] [+ 添加分类]            │
│ #design  #brand  #visual  [+ 标签]   │
│                                      │
│ ─ 备注 ──────────────────────────    │
│ ┌────────────────────────────────┐   │
│ │ 用于品牌全套视觉设计，适合...   │   │
│ │ [点击编辑]                     │   │
│ └────────────────────────────────┘   │
│                                      │
│ ─ 别名 ──────────────────────────    │
│ bk  brand  [+ 添加别名]             │
│                                      │
│ [禁用]  [更新]  [卸载]               │
└──────────────────────────────────────┘
```

### 5.5 命令面板（⌘K）

Spotlight 风格快速命令入口：

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  🔍  搜索技能、工作区、命令...               [Esc]   │
│                                                      │
│  ─────────────────────────────────────────────────   │
│  ⚡ 快速操作                                         │
│  → 切换工作区：前端开发                              │
│  → 安装技能                                          │
│  → 创建工作区                                        │
│  ─────────────────────────────────────────────────   │
│  📦 最近安装                                         │
│  → brandkit                                          │
│  → csv-processor                                     │
│  → test-generator                                    │
└──────────────────────────────────────────────────────┘
```

支持命令语法：
- `install <name>` — 安装技能
- `switch <workspace>` — 切换工作区
- `enable/disable <name>` — 启用/禁用
- `> <category>` — 过滤分类

### 5.6 工作区管理页面

```
┌──────────────────────────────────────────────────────────────┐
│  工作区                               [+ 新建工作区]         │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ ◉ 前端开发  (当前)   │  │   数据分析            │         │
│  │                      │  │                      │         │
│  │ 8 个技能 · Claude     │  │ 5 个技能 · Claude     │         │
│  │                      │  │                      │         │
│  │ brandkit  ui-ux  ... │  │ csv-proc  chart  ... │         │
│  │                      │  │                      │         │
│  │ [进入] [编辑] [导出] │  │ [切换] [编辑] [导出] │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │   后端API开发         │  │ + 创建新工作区        │         │
│  │                      │  │                      │         │
│  │ 6 个技能 · Agents    │  │   从模板或空白创建    │         │
│  └──────────────────────┘  └──────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### 5.7 发现/安装页面

```
┌──────────────────────────────────────────────────────────────┐
│  发现技能                                                     │
│  ┌──────────────────────────────────────────┐               │
│  │ 🔍 搜索技能仓库...                        │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
│  分类：[全部] [开发] [设计] [数据] [自动化] [写作]           │
│                                                              │
│  ─ 热门推荐 ──────────────────────────────────────────       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │brandkit  │ │deep-res..│ │pdf-proc  │ │csv-tools │       │
│  │⭐ 4.8k   │ │⭐ 3.2k   │ │⭐ 2.8k   │ │⭐ 1.9k   │       │
│  │[已安装✓] │ │[+ 安装]  │ │[+ 安装]  │ │[已安装✓] │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ─ 来自 github.com/company/skills ────────────────────       │
│  [内部仓库标识] 3 个新技能可用                                │
└──────────────────────────────────────────────────────────────┘
```

### 5.8 系统托盘快捷窗口

右键 / 点击托盘图标弹出：

```
┌─────────────────────────────┐
│ SkillManager                    │
│ ─────────────────────────── │
│ 当前工作区                   │
│ ◉ 前端开发  8个技能          │
│ ─────────────────────────── │
│ 切换工作区                   │
│   数据分析                   │
│   后端API开发                │
│   + 更多...                  │
│ ─────────────────────────── │
│ 打开 SkillManager               │
│ 设置                         │
│ 退出                         │
└─────────────────────────────┘
```


---

## 6. 功能规格（续）

### 6.5 搜索与发现

**全文搜索引擎**：
- 搜索范围：技能名称、描述、标签、备注、别名
- 响应时间：< 100ms（本地 SQLite FTS5）
- 模糊匹配：支持拼音首字母、容错匹配
- 搜索结果高亮

**智能推荐**：
- 基于使用频率推荐（最常用）
- 基于工作区关联推荐（同工作区技能）
- 基于分类推荐（同分类技能）

---

## 7. 数据模型

### 7.1 核心实体关系图

```
[Skill] ━━ 多对多 ━━ [Category]
   ↑
   ├── 一对一 ─→ [SkillNote]
   ├── 一对多 ─→ [SkillTag]
   ├── 一对多 ─→ [SkillAlias]
   └── 多对多 ─→ [Workspace]

[Repository] (独立)
[ActivityLog] (审计日志)
```

### 7.2 SQLite 表结构（第1部分 - 核心表）

```sql
-- 技能主表
CREATE TABLE skills (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  description   TEXT,
  source        TEXT,
  version       TEXT,
  install_path  TEXT NOT NULL,
  tool_id       TEXT NOT NULL,
  enabled       INTEGER DEFAULT 1,
  installed_at  INTEGER,
  last_used_at  INTEGER,
  usage_count   INTEGER DEFAULT 0,
  created_at    INTEGER DEFAULT (strftime('%s','now')),
  updated_at    INTEGER DEFAULT (strftime('%s','now'))
);

-- 分类表（支持3层层级）
CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  TEXT REFERENCES categories(id),
  color      TEXT DEFAULT '#6366f1',
  icon       TEXT DEFAULT '📁',
  sort_order INTEGER DEFAULT 0,
  is_system  INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- 技能-分类 多对多
CREATE TABLE skill_categories (
  skill_id    TEXT REFERENCES skills(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, category_id)
);

-- 技能标签
CREATE TABLE skill_tags (
  skill_id TEXT REFERENCES skills(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,
  PRIMARY KEY (skill_id, tag)
);

-- 技能备注
CREATE TABLE skill_notes (
  skill_id   TEXT PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  content    TEXT,
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- 技能别名
CREATE TABLE skill_aliases (
  skill_id TEXT REFERENCES skills(id) ON DELETE CASCADE,
  alias    TEXT NOT NULL,
  UNIQUE(alias),
  PRIMARY KEY (skill_id, alias)
);
```

### 7.3 SQLite 表结构（第2部分 - 工作区与仓库）

```sql
-- 工作区
CREATE TABLE workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  tool_id     TEXT,
  color       TEXT DEFAULT '#6366f1',
  icon        TEXT DEFAULT '🔲',
  is_active   INTEGER DEFAULT 0,
  created_at  INTEGER DEFAULT (strftime('%s','now')),
  updated_at  INTEGER DEFAULT (strftime('%s','now'))
);

-- 工作区-技能关联
CREATE TABLE workspace_skills (
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  skill_id     TEXT REFERENCES skills(id) ON DELETE CASCADE,
  enabled      INTEGER DEFAULT 1,
  note         TEXT,
  sort_order   INTEGER DEFAULT 0,
  PRIMARY KEY (workspace_id, skill_id)
);

-- 技能仓库
CREATE TABLE repositories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL,
  branch     TEXT DEFAULT 'main',
  skills_dir TEXT DEFAULT 'skills/',
  auth_type  TEXT,
  auth_key   TEXT,
  priority   INTEGER DEFAULT 10,
  enabled    INTEGER DEFAULT 1,
  last_sync  INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- 操作日志
CREATE TABLE activity_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  action       TEXT NOT NULL,
  skill_id     TEXT,
  workspace_id TEXT,
  detail       TEXT,
  created_at   INTEGER DEFAULT (strftime('%s','now'))
);

-- FTS5 全文搜索虚拟表
CREATE VIRTUAL TABLE skills_fts USING fts5(
  name, description, content=skills, content_rowid=rowid
);

-- 默认系统分类种子数据
INSERT INTO categories (id, name, icon, color, is_system) VALUES
  ('all',           '全部',   '📋', '#6366f1', 1),
  ('uncategorized', '未分类', '📁', '#8a8a94', 1);
```


---

## 8. 技术栈

### 8.1 完整技术清单

| 层次 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面框架 | Tauri | 2.x | 原生窗口、系统托盘、文件系统 |
| 后端语言 | Rust | 1.80+ | 核心命令处理、数据库、适配器 |
| 前端框架 | React | 19.x | UI 渲染 |
| 语言 | TypeScript | 5.x | 前后端类型安全 |
| 样式 | Tailwind CSS | 4.x | 原子化样式 |
| 动效 | Motion One | 10.x | 流体动画 |
| 状态管理 | Zustand | 5.x | 全局状态 |
| 数据查询 | TanStack Query | 5.x | 异步数据缓存 |
| 路由 | React Router | 7.x | 页面路由 |
| 数据库 | SQLite | 3.x | 本地元数据存储 |
| DB驱动 | tauri-plugin-sql | 2.x | Rust↔SQLite 绑定 |
| 全文搜索 | SQLite FTS5 | 内置 | 技能全文搜索 |
| 构建工具 | Vite | 6.x | 前端打包 |
| 图标库 | Lucide React | latest | UI 图标 |
| 日期处理 | date-fns | 4.x | 时间格式化 |
| YAML解析 | js-yaml | 4.x | 工作区配置解析 |
| 测试框架 | Vitest | 2.x | 单元测试 |
| E2E测试 | Playwright | 1.x | 集成测试 |

### 8.2 Tauri 系统权限

```json
{
  "permissions": [
    "core:default",
    "fs:read-all",
    "fs:write-all",
    "shell:execute",
    "notification:default",
    "system-tray:default",
    "autostart:default",
    "updater:default",
    "clipboard-manager:default"
  ]
}
```

### 8.3 IPC 命令设计（Rust ↔ React）

```rust
// Rust 侧 commands
#[tauri::command] async fn list_skills(filter: SkillFilter) -> Vec<Skill>
#[tauri::command] async fn get_skill(id: String) -> Option<Skill>
#[tauri::command] async fn install_skill(source: String, tool_id: String) -> Result<Skill>
#[tauri::command] async fn uninstall_skill(id: String, purge: bool) -> Result<()>
#[tauri::command] async fn toggle_skill(id: String, enabled: bool) -> Result<()>
#[tauri::command] async fn update_skill_meta(id: String, meta: SkillMeta) -> Result<()>
#[tauri::command] async fn search_skills(query: String) -> Vec<Skill>

#[tauri::command] async fn list_workspaces() -> Vec<Workspace>
#[tauri::command] async fn create_workspace(data: WorkspaceInput) -> Result<Workspace>
#[tauri::command] async fn switch_workspace(id: String) -> Result<()>
#[tauri::command] async fn export_workspace(id: String) -> Result<String>
#[tauri::command] async fn import_workspace(yaml: String) -> Result<Workspace>

#[tauri::command] async fn list_repositories() -> Vec<Repository>
#[tauri::command] async fn add_repository(data: RepositoryInput) -> Result<Repository>
#[tauri::command] async fn sync_repository(id: String) -> Result<SyncResult>
#[tauri::command] async fn search_registry(query: String) -> Vec<RemoteSkill>

#[tauri::command] async fn detect_tools() -> Vec<ToolInfo>
#[tauri::command] async fn scan_installed_skills() -> Result<SyncStats>
```


---

## 9. 开发计划与任务分解

> 基于 1 名全栈开发者（熟悉 TypeScript + Rust/Tauri），按 2 周 Sprint 规划。
> 工期合计：**12 周（约 3 个月）**

---

### Sprint 0 — 工程基础（第 1 周）

**目标**：搭建可运行的项目骨架

| # | 任务 | 类型 | 估时 |
|---|------|------|------|
| S0-1 | 初始化 Tauri 2 + React + TypeScript + Tailwind 项目 | 工程 | 0.5d |
| S0-2 | 配置 Vite、ESLint、Prettier、TypeScript 严格模式 | 工程 | 0.5d |
| S0-3 | 搭建设计系统：色彩变量、字体、间距 Token | 设计 | 1d |
| S0-4 | 实现自定义标题栏（拖拽区 + 窗口控制按钮） | UI | 0.5d |
| S0-5 | 创建主布局：侧边栏 + 内容区 | UI | 0.5d |
| S0-6 | SQLite 初始化，执行 migrations，种子数据 | 后端 | 0.5d |
| S0-7 | 配置系统托盘图标与基础菜单 | 系统 | 0.5d |
| S0-8 | CI/CD 配置（GitHub Actions，build + test） | 工程 | 0.5d |

**完成标准**：应用可启动，托盘可见，侧边栏路由可切换，数据库文件生成。

---

### Sprint 1 — 技能扫描与展示（第 2-3 周）

**目标**：展示本地已安装技能，实现基础操作

| # | 任务 | 类型 | 估时 |
|---|------|------|------|
| S1-1 | 实现工具适配器接口 trait（Rust） | 后端 | 1d |
| S1-2 | Claude Code 适配器（扫描 ~/.claude/skills/） | 后端 | 1d |
| S1-3 | Agents 适配器（扫描 ~/.agents/skills/） | 后端 | 0.5d |
| S1-4 | cc-switch 适配器（扫描 ~/.cc-switch/skills/） | 后端 | 0.5d |
| S1-5 | 扫描 SKILL.md 解析元数据（name/description） | 后端 | 1d |
| S1-6 | 扫描结果写入 SQLite skills 表 | 后端 | 0.5d |
| S1-7 | 技能列表页 - 网格视图（SkillCard 组件） | UI | 1.5d |
| S1-8 | 技能列表页 - 列表视图切换 | UI | 0.5d |
| S1-9 | 顶部工具栏（筛选、排序、视图切换） | UI | 1d |
| S1-10 | 技能详情侧滑面板（SlidePanel 组件） | UI | 1.5d |
| S1-11 | 技能启用/禁用（软禁用实现） | 后端+UI | 1d |
| S1-12 | 技能卸载（带确认对话框） | 后端+UI | 0.5d |
| S1-13 | 初次启动引导（扫描提示 + 初始化向导） | UI | 1d |

**完成标准**：能看到本地已安装技能，能启用/禁用/卸载。

---

### Sprint 2 — 分类、标签、备注（第 4-5 周）

**目标**：实现技能元数据管理核心功能

| # | 任务 | 类型 | 估时 |
|---|------|------|------|
| S2-1 | 分类树组件（侧边栏 CategoryTree） | UI | 1.5d |
| S2-2 | 创建/编辑/删除分类（含颜色和图标选择） | UI+后端 | 1.5d |
| S2-3 | 拖拽技能到分类（@dnd-kit 实现） | UI | 1d |
| S2-4 | 批量选择 + 批量分类操作 | UI+后端 | 1d |
| S2-5 | 标签管理（Add/Remove Tag，自动补全） | UI+后端 | 1d |
| S2-6 | 备注编辑器（内联 Markdown 编辑，Monaco 轻量版） | UI | 1.5d |
| S2-7 | 别名管理（添加/删除别名） | UI+后端 | 0.5d |
| S2-8 | 技能重命名（不改底层目录） | UI+后端 | 0.5d |
| S2-9 | 按分类筛选（侧边栏点击过滤列表） | UI | 0.5d |
| S2-10 | 全文搜索（FTS5，100ms 内响应） | 后端+UI | 1d |
| S2-11 | 搜索结果高亮显示 | UI | 0.5d |
| S2-12 | 命令面板（Cmd/Ctrl+K，Spotlight 风格） | UI | 2d |

**完成标准**：可对技能分类、打标签、写备注、别名、重命名、全文搜索。

---

### Sprint 3 — 工作区系统（第 6-7 周）

**目标**：实现工作区创建、切换、管理核心功能

| # | 任务 | 类型 | 估时 |
|---|------|------|------|
| S3-1 | 工作区管理页面（列表卡片布局） | UI | 1d |
| S3-2 | 创建工作区（表单 + 技能选择） | UI+后端 | 1.5d |
| S3-3 | 从现有工作区复制创建 | 后端+UI | 0.5d |
| S3-4 | 工作区切换逻辑（差量同步实现） | 后端 | 2d |
| S3-5 | 托盘菜单工作区快速切换 | 后端+UI | 1d |
| S3-6 | 工作区编辑（添加/移除技能，调整顺序） | UI+后端 | 1d |
| S3-7 | 工作区导出为 YAML 配置文件 | 后端 | 0.5d |
| S3-8 | 工作区 YAML 导入（自动安装缺失技能提示） | 后端+UI | 1.5d |
| S3-9 | 当前工作区状态组件（侧边栏底部气泡） | UI | 0.5d |
| S3-10 | 托盘快捷窗口（工作区状态展示） | UI | 1d |
| S3-11 | 工作区切换动效（stagger 列表重载） | UI | 0.5d |

**完成标准**：可创建工作区并一键切换，导入导出 YAML 配置正常。

---

### Sprint 4 — 仓库管理与技能安装（第 8-9 周）

**目标**：实现从多仓库发现和安装技能

| # | 任务 | 类型 | 估时 |
|---|------|------|------|
| S4-1 | 仓库管理页面（列表 + CRUD） | UI+后端 | 1.5d |
| S4-2 | 内置仓库：skills.sh Registry 接入 | 后端 | 1.5d |
| S4-3 | Git 仓库类型支持（clone + 解析） | 后端 | 2d |
| S4-4 | 本地路径仓库支持 | 后端 | 0.5d |
| S4-5 | 仓库索引缓存与定期同步 | 后端 | 1d |
| S4-6 | 发现/安装页面（搜索 + 分类浏览） | UI | 2d |
| S4-7 | 技能安装进度（流式进度展示） | UI+后端 | 1d |
| S4-8 | 技能版本管理（安装指定版本） | 后端 | 1d |
| S4-9 | 检查更新并批量更新 | 后端+UI | 1d |
| S4-10 | 私有仓库认证（Token 配置，不明文存储） | 后端+UI | 1d |

**完成标准**：可从 skills.sh 搜索并安装技能，Git 仓库可配置并同步。

---

### Sprint 5 — 打磨与发布（第 10-12 周）

**目标**：完善体验，准备发布

| # | 任务 | 类型 | 估时 |
|---|------|------|------|
| S5-1 | 设置页面（语言/主题/工具路径/开机启动） | UI+后端 | 2d |
| S5-2 | 使用统计视图（使用频率、最近使用） | UI+后端 | 1d |
| S5-3 | 操作历史日志查看 | UI | 1d |
| S5-4 | 应用自动更新（Tauri updater） | 工程 | 1d |
| S5-5 | 全局快捷键配置（可自定义） | 后端+UI | 1d |
| S5-6 | 通知系统（安装完成/工作区切换提示） | 系统 | 0.5d |
| S5-7 | 键盘导航优化（全键盘可操作） | UI | 1d |
| S5-8 | 性能优化（虚拟滚动，大量技能场景） | 前端 | 1d |
| S5-9 | 错误处理与用户友好错误提示 | 全栈 | 1d |
| S5-10 | 单元测试覆盖（Vitest，核心逻辑 > 80%） | 测试 | 2d |
| S5-11 | E2E 测试关键路径（安装/切换工作区/搜索） | 测试 | 1.5d |
| S5-12 | Windows 安装包（NSIS .exe） | 工程 | 0.5d |
| S5-13 | macOS 安装包（.dmg） | 工程 | 0.5d |
| S5-14 | 应用图标设计与替换 | 设计 | 0.5d |
| S5-15 | README 与文档 | 文档 | 1d |

**完成标准**：通过验收测试清单，可安装的 Release 包发布。


---

## 10. 里程碑与进度追踪

### 10.1 里程碑概览

```
M1 ──── M2 ──── M3 ──── M4 ──── M5
第2周   第5周   第7周   第9周   第12周
工程骨架 核心展示 分类搜索 工作区  发布版本
```

| 里程碑 | 完成时间 | 核心交付物 | 状态 |
|--------|----------|------------|------|
| **M1** Sprint 0-1 | 第 2 周末 | 可运行应用，本地技能展示 | ✅ 已完成 |
| **M2** Sprint 1-2 | 第 5 周末 | 分类/标签/备注/搜索完整可用 | ✅ 已完成 |
| **M3** Sprint 3 | 第 7 周末 | 工作区系统完整可用 | ✅ 已完成 |
| **M4** Sprint 4 | 第 9 周末 | 仓库管理与技能安装完整可用 | ✅ 已完成 |
| **M5** Sprint 5 | 第 12 周末 | 生产就绪发布包 | ✅ 已完成 |

### 10.2 任务进度看板

> 开发过程中，按如下格式在此处更新进度：
> `✅ 已完成`  `🔄 进行中`  `✅ 已完成`  `⏸ 暂停`  `❌ 取消`

#### Sprint 0 — 工程基础

| 状态 | # | 任务 | 完成日期 |
|------|---|------|----------|
| ⬜ | S0-1 | 初始化 Tauri + React 项目 | - |
| ⬜ | S0-2 | 配置 ESLint/Prettier/TS | - |
| ⬜ | S0-3 | 设计系统 Token（色彩/字体/间距） | - |
| ⬜ | S0-4 | 自定义标题栏 | - |
| ⬜ | S0-5 | 主布局：侧边栏 + 内容区 | - |
| ⬜ | S0-6 | SQLite 初始化 + migrations | - |
| ⬜ | S0-7 | 系统托盘配置 | - |
| ⬜ | S0-8 | CI/CD 配置 | - |

#### Sprint 1 — 技能扫描与展示

| 状态 | # | 任务 | 完成日期 |
|------|---|------|----------|
| ⬜ | S1-1 | 工具适配器接口 trait | - |
| ⬜ | S1-2 | Claude Code 适配器 | - |
| ⬜ | S1-3 | Agents 适配器 | - |
| ⬜ | S1-4 | cc-switch 适配器 | - |
| ⬜ | S1-5 | SKILL.md 元数据解析 | - |
| ⬜ | S1-6 | 扫描写入 SQLite | - |
| ⬜ | S1-7 | 技能列表 - 网格视图 | - |
| ⬜ | S1-8 | 技能列表 - 列表视图切换 | - |
| ⬜ | S1-9 | 顶部工具栏 | - |
| ⬜ | S1-10 | 技能详情侧滑面板 | - |
| ⬜ | S1-11 | 启用/禁用技能 | - |
| ⬜ | S1-12 | 卸载技能 | - |
| ⬜ | S1-13 | 初次启动引导 | - |

#### Sprint 2 — 分类、标签、备注

| 状态 | # | 任务 | 完成日期 |
|------|---|------|----------|
| ⬜ | S2-1 | 分类树组件 | - |
| ⬜ | S2-2 | 分类 CRUD + 颜色/图标 | - |
| ⬜ | S2-3 | 拖拽技能到分类 | - |
| ⬜ | S2-4 | 批量操作 | - |
| ⬜ | S2-5 | 标签管理 | - |
| ⬜ | S2-6 | 备注编辑器 | - |
| ⬜ | S2-7 | 别名管理 | - |
| ⬜ | S2-8 | 技能重命名 | - |
| ⬜ | S2-9 | 按分类筛选 | - |
| ⬜ | S2-10 | 全文搜索 FTS5 | - |
| ⬜ | S2-11 | 搜索结果高亮 | - |
| ⬜ | S2-12 | 命令面板 (⌘K) | - |

#### Sprint 3 — 工作区系统

| 状态 | # | 任务 | 完成日期 |
|------|---|------|----------|
| ⬜ | S3-1 | 工作区管理页面 | - |
| ⬜ | S3-2 | 创建工作区 | - |
| ⬜ | S3-3 | 从工作区复制创建 | - |
| ⬜ | S3-4 | 工作区切换逻辑 | - |
| ⬜ | S3-5 | 托盘快速切换 | - |
| ⬜ | S3-6 | 工作区编辑 | - |
| ⬜ | S3-7 | 导出 YAML | - |
| ⬜ | S3-8 | 导入 YAML | - |
| ⬜ | S3-9 | 工作区状态气泡 | - |
| ⬜ | S3-10 | 托盘快捷窗口 | - |
| ⬜ | S3-11 | 切换动效 | - |

#### Sprint 4 — 仓库管理与安装

| 状态 | # | 任务 | 完成日期 |
|------|---|------|----------|
| ⬜ | S4-1 | 仓库管理页面 CRUD | - |
| ⬜ | S4-2 | skills.sh Registry 接入 | - |
| ⬜ | S4-3 | Git 仓库类型支持 | - |
| ⬜ | S4-4 | 本地路径仓库 | - |
| ⬜ | S4-5 | 仓库索引缓存同步 | - |
| ⬜ | S4-6 | 发现/安装页面 | - |
| ⬜ | S4-7 | 安装进度展示 | - |
| ⬜ | S4-8 | 版本管理 | - |
| ⬜ | S4-9 | 检查/批量更新 | - |
| ⬜ | S4-10 | 私有仓库认证 | - |

#### Sprint 5 — 打磨与发布

| 状态 | # | 任务 | 完成日期 |
|------|---|------|----------|
| ⬜ | S5-1 | 设置页面 | - |
| ⬜ | S5-2 | 使用统计 | - |
| ⬜ | S5-3 | 操作历史日志 | - |
| ⬜ | S5-4 | 自动更新 | - |
| ⬜ | S5-5 | 全局快捷键 | - |
| ⬜ | S5-6 | 通知系统 | - |
| ⬜ | S5-7 | 键盘导航 | - |
| ⬜ | S5-8 | 性能优化 | - |
| ⬜ | S5-9 | 错误处理优化 | - |
| ⬜ | S5-10 | 单元测试覆盖率 ≥ 80% | - |
| ⬜ | S5-11 | E2E 关键路径测试 | - |
| ⬜ | S5-12 | Windows 安装包 | - |
| ⬜ | S5-13 | macOS 安装包 | - |
| ⬜ | S5-14 | 应用图标 | - |
| ⬜ | S5-15 | README 文档 | - |


---

## 11. 验收标准

### 11.1 功能验收清单

#### 核心功能（必须 100% 通过）

| # | 功能 | 验收标准 | 状态 |
|---|------|----------|------|
| F1 | 技能扫描 | 初次启动能检测并导入所有已安装技能 | ⬜ |
| F2 | 技能列表 | 网格/列表视图正常切换，至少显示 100 个技能无卡顿 | ⬜ |
| F3 | 技能详情 | 侧滑面板正确展示所有元数据 | ⬜ |
| F4 | 启用/禁用 | 禁用后工具不可见该技能，启用后恢复 | ⬜ |
| F5 | 卸载 | 卸载后文件删除且数据库记录移除 | ⬜ |
| F6 | 分类管理 | 可创建 3 层分类，拖拽技能分类正常 | ⬜ |
| F7 | 标签管理 | 可添加/移除标签，按标签筛选正常 | ⬜ |
| F8 | 备注编辑 | 可保存 Markdown 格式备注 | ⬜ |
| F9 | 全文搜索 | < 100ms 返回结果，支持拼音首字母 | ⬜ |
| F10 | 命令面板 | ⌘K/Ctrl+K 打开，支持所有快捷命令 | ⬜ |
| F11 | 创建工作区 | 可创建并添加技能到工作区 | ⬜ |
| F12 | 切换工作区 | 切换后只显示工作区内技能 | ⬜ |
| F13 | 导出工作区 | YAML 文件包含完整配置 | ⬜ |
| F14 | 导入工作区 | 导入 YAML 能还原完整工作区 | ⬜ |
| F15 | 仓库管理 | 可添加 Git/本地/Registry 三类仓库 | ⬜ |
| F16 | 技能安装 | 从仓库搜索并安装技能成功 | ⬜ |
| F17 | 技能更新 | 检测可更新技能并执行更新 | ⬜ |
| F18 | 系统托盘 | 托盘图标可见，右键菜单正常 | ⬜ |

#### 体验指标（需达标）

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 启动速度 | < 2s | 从点击到主窗口可交互 |
| 搜索响应 | < 100ms | 输入到结果显示的延迟 |
| 工作区切换 | < 1s | 从点击到列表刷新完成 |
| 内存占用 | < 150MB | 空闲状态下的 RAM 占用 |
| 安装包大小 | < 25MB | Windows .exe 大小 |
| 列表滚动 | 60fps | 1000+ 技能滚动不掉帧 |

#### 兼容性验收

| 平台 | 最低版本 | 必测功能 |
|------|----------|----------|
| Windows | 10 (1809+) | 全功能 + 托盘 + 开机启动 |
| macOS | 12 (Monterey) | 全功能 + 托盘 + 快捷键 |
| Linux | Ubuntu 22.04 | 基础功能（托盘可选） |

### 11.2 测试用例示例

#### TC-001：安装技能并分类

```
前置条件：应用已初始化
步骤：
1. 点击侧边栏"发现"
2. 搜索"brandkit"
3. 点击"安装"按钮
4. 等待安装完成
5. 回到技能库
6. 找到 brandkit 卡片，点击打开详情
7. 点击"分类"下的 [+ 添加分类]
8. 选择"设计"分类
9. 关闭详情面板

预期结果：
- brandkit 出现在"设计"分类下
- 左侧分类树"设计"分类显示技能数量 +1
```

#### TC-002：工作区切换

```
前置条件：已创建"前端开发"和"数据分析"两个工作区
步骤：
1. 当前工作区为"前端开发"（8 个技能）
2. 点击系统托盘图标
3. 选择"切换工作区 → 数据分析"
4. 等待切换完成

预期结果：
- 托盘快捷窗口显示"◉ 数据分析  5个技能"
- 技能库列表只显示数据分析工作区的 5 个技能
- 侧边栏底部气泡更新为"数据分析"
```

### 11.3 发布检查清单

#### 代码质量

- [ ] 所有 TypeScript 严格模式警告已解决
- [ ] ESLint 0 error, 0 warning
- [ ] 核心逻辑单元测试覆盖率 ≥ 80%
- [ ] E2E 测试通过率 100%

#### 文档

- [ ] README.md 包含安装、使用、配置说明
- [ ] CHANGELOG.md 包含版本历史
- [ ] LICENSE 文件存在
- [ ] 内置帮助文档/教程

#### 安全

- [ ] 不在代码中硬编码 Token/密钥
- [ ] 敏感配置通过环境变量或加密存储
- [ ] 所有外部输入经过校验
- [ ] 依赖安全审计通过（npm audit fix）

#### 发布物

- [ ] Windows .exe 安装包（签名）
- [ ] macOS .dmg 安装包（签名 + 公证）
- [ ] Linux .AppImage（可选）
- [ ] GitHub Release 页面完整
- [ ] 更新服务器配置正确

---

## 12. 附录

### 12.1 术语表

| 术语 | 定义 |
|------|------|
| Skill | 技能，AI 工具的可插拔功能模块（如 SKILL.md 文件） |
| Workspace | 工作区，特定场景下的技能集合配置 |
| Adapter | 适配器，对接不同 AI 工具的技能目录 |
| Repository | 仓库，存储技能的远程或本地源 |
| Registry | 注册中心，可搜索的技能索引服务（如 skills.sh） |
| Tool | 工具，指 Claude Code、Agents 等 AI 编程工具 |

### 12.2 参考资料

- [Tauri 2.x 文档](https://v2.tauri.app/)
- [skills.sh 官方](https://skills.sh/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [React 19 文档](https://react.dev/)

### 12.3 设计参考

- cc-switch（主要参考）：系统托盘、暗色主题、玻璃质感
- Linear：清晰信息层级、快捷键驱动
- Raycast：命令面板交互、快速搜索

---

## 13. 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0 | 2026-07-07 | Product Team | 初始版本，完整产品规格 |

---

**文档结束**

