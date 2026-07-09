# SkillManager

> AI Skills 管理与安装桌面工具 — 统一管理 Claude Code、Agents、cc-switch 等 AI 工具的技能集

![Version](https://img.shields.io/badge/version-0.1.0-6366f1)
![Platform](https://img.shields.io/badge/platform-Windows%20|%20macOS-lightgrey)
![Tech](https://img.shields.io/badge/Tauri%202%20+%20React%2019-blue)

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 📦 **统一管理** | 一个界面管理 Claude Code、Agents、cc-switch 的所有技能 |
| 🗂 **自由分类** | 层级分类树 + 多标签 + 备注，快速定位任意技能 |
| 🔲 **工作区** | 按业务场景组织技能集，一键切换，YAML 导入导出 |
| 🔍 **全文搜索** | SQLite FTS5 引擎，100ms 内响应，⌘K 命令面板 |
| 🏪 **技能发现** | 接入 skills.sh 官方仓库，搜索并一键安装新技能 |
| 📋 **仓库管理** | 支持 Registry / Git / 本地路径多种技能来源 |
| 🖥 **系统集成** | 系统托盘、开机自启、无边框暗色主题 |

## 🚀 快速开始

### 环境要求

- Node.js ≥ 20
- Rust (stable) — [安装 rustup](https://rustup.rs/)
- **Windows**: Microsoft C++ Build Tools
- **macOS**: Xcode Command Line Tools

### 开发模式

```bash
git clone https://github.com/Lee-zg/skillmanager.git
cd skillmanager
npm install
npm run tauri dev
```

### 构建发布包

```bash
npm run tauri build
# 产物: src-tauri/target/release/bundle/
```

## 📁 项目结构

```
skillmanager/
├── src/
│   ├── components/    # TitleBar / Sidebar / SkillCard / CommandPalette ...
│   ├── pages/         # Skills / Workspaces / Discover / Repos / Settings
│   ├── stores/        # Zustand: skillStore / workspaceStore / categoryStore
│   └── styles/        # globals.css (设计系统 Tokens)
├── src-tauri/
│   ├── src/
│   │   ├── adapters/  # 工具适配器 (Claude Code / Agents / cc-switch)
│   │   ├── commands/  # Tauri IPC 命令 (skills/metadata/workspaces/repos/settings)
│   │   ├── db/        # SQLite 操作层 + migrations
│   │   └── installer.rs  # 技能安装引擎 (npx + skills.sh HTTP)
│   └── migrations/    # 001_initial.sql
└── PRODUCT_SPEC.md    # 完整产品规格文档
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `⌘K` / `Ctrl+K` | 打开命令面板 |
| `↑↓ Enter` | 命令面板导航与执行 |
| `Esc` | 关闭面板/取消操作 |

## 🛠 技术栈

| 层次 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x + Rust |
| 前端 | React 19 + TypeScript 5 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand v5 |
| 数据层 | SQLite + FTS5 (rusqlite) |
| HTTP 客户端 | reqwest |
| 构建工具 | Vite 6 |

## 📋 支持的工具

| 工具 | 技能路径 | 状态 |
|------|----------|------|
| Claude Code | `~/.claude/skills/` | ✅ |
| Agents | `~/.agents/skills/` | ✅ |
| cc-switch | `~/.cc-switch/skills/` | ✅ |

## 📄 许可证

MIT License — © 2026 SkillManager
