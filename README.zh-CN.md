# CASR GUI 详细文档（中文）

## 1. 项目概述

CASR GUI 是一个桌面应用，用于在不同 AI 编码代理之间浏览、查看并转换会话。

项目基于 `casr` 核心库，提供了图形化能力：

- 可视化 Provider 检测
- 会话列表浏览
- 单会话内容预览
- 一键跨 Provider 转换
- 一键复制恢复命令和对话 ID

当前支持 14 个 Provider：

- Claude Code
- Codex (OpenAI)
- Gemini
- Cursor
- Cline
- Aider
- Amp
- OpenCode
- ChatGPT
- ClawdBot
- Vibe
- Factory
- OpenClaw
- Pi Agent

## 2. 技术栈

- 前端：React 19 + TypeScript + Tailwind CSS + Vite
- 桌面框架：Tauri v2
- 后端：Rust（`src-tauri/`）
- 核心转换逻辑：本地 `casr` 依赖（`../../session-resumer`）

## 3. 目录结构

```text
casr-gui/
  src/                        # React 前端
    App.tsx
    components/
      ProviderSidebar.tsx
      SessionList.tsx
      SessionDetail.tsx
    hooks/
      useTauri.ts             # Tauri invoke 封装
    types/
      index.ts

  src-tauri/                  # Rust 后端
    src/
      main.rs
      lib.rs
      commands/
        providers.rs          # get_providers
        sessions.rs           # list_sessions + get_session
        convert.rs            # convert_session
    tauri.conf.json
```

## 4. 环境要求

- Node.js 18+
- Rust 稳定版工具链
- 对应操作系统下的 Tauri 运行依赖
- Windows 建议安装 WebView2 Runtime（多数系统默认已具备）

## 5. 本地开发

安装依赖：

```bash
npm install
```

启动开发模式：

```bash
npm run tauri dev
```

执行过程：

- Vite 启动在 `http://localhost:1420`
- Tauri 启动桌面壳并连接 Vite
- `src-tauri/` 变更会触发 Rust 端热重建

## 6. 生产构建

执行：

```bash
npm run tauri build
```

产物目录：

- `src-tauri/target/release/bundle/`

## 7. 使用流程

1. 启动应用
2. 在左侧选择 Provider
3. 在中间列表选择会话
4. 在右侧查看会话元信息和消息预览
5. 选择目标 Provider 并点击 `Convert`
6. 复制 `resume command` 到目标代理继续会话
7. 如需记录会话标识，可点击 `Copy ID`

## 8. 产品界面

以下截图展示当前产品界面（基于本地开发模式下的演示数据）：

### 全局总览

![CASR GUI 总览](./docs/images/ui-overview.png)

### 会话详情

![CASR GUI 会话详情](./docs/images/ui-session-detail.png)

### 转换结果

![CASR GUI 转换结果](./docs/images/ui-conversion-result.png)

## 9. IPC 命令说明

前端通过 Tauri 调用以下命令：

### `get_providers`

- 请求：无参数
- 返回：`ProviderInfo[]`

### `list_sessions`

- 请求参数：
  - `provider?: string`
  - `limit?: number`
  - `sort?: "date" | "messages" | "provider"`
- 返回：`SessionSummary[]`

### `get_session`

- 前端 payload 键：
  - `sessionId: string`
  - `sourceHint?: string`
- Rust 侧命令签名：
  - `session_id: String`
  - `source_hint: Option<String>`
- 返回：`SessionDetail`

### `convert_session`

- 前端 payload 键：
  - `target: string`
  - `sessionId: string`
  - `force?: boolean`
  - `enrich?: boolean`
- 返回：`ConvertResult`

## 10. 前端类型模型

定义位置：[`src/types/index.ts`](./src/types/index.ts)

- `ProviderInfo`
- `SessionSummary`
- `SessionDetail`
- `MessagePreview`
- `ConvertResult`

当你修改后端返回结构时，应同步更新该文件并验证前端调用。

## 11. 性能设计与优化

近期已落地的优化：

- 稳定化 invoke 方法引用：
  - `useTauri` 使用 `useCallback` + `useMemo`，避免 effect 依赖误触发循环请求
- 会话列表缓存：
  - 按 `provider|limit|sort` 作为 key 做内存缓存
  - TTL：60 秒
  - 最大条目数：24
- 后端扫描保护：
  - fallback 目录扫描使用 `max_depth(4)`，避免深层目录拖垮性能
- 预览截断安全：
  - 消息预览按字符截断，避免 UTF-8 中文字符边界 panic

## 12. 常见问题排查

### A. 开发时 CPU / 内存占用高

排查建议：

- 是否出现会话重复加载循环（旧版本常见）
- 是否目录规模过大导致扫描成本高
- 是否同时启动了多个 `tauri dev`

处理建议：

- 仅保留一个开发进程
- 使用当前已包含缓存与扫描深度限制的版本
- 重启应用后复测

### B. `invalid args sessionId` 这类参数错误

原因：

- 前端 invoke 参数名与 Tauri 期望不一致

处理：

- 使用 `sessionId` / `sourceHint` 作为前端 payload 键名

### C. `byte index ... is not a char boundary` 崩溃

原因：

- 使用字节切片截断 UTF-8 字符串（中文、emoji 会触发）

处理：

- 使用 `.chars().take(n)` 截断而非 `[..n]`

### D. Session not found

建议检查：

- 是否选对 Provider
- 源会话文件是否仍存在
- Provider 的会话目录是否可访问

## 13. 安全与隐私说明

- 本工具读取本地 Provider 会话目录中的数据。
- 查看和转换本身不强制上传云端。
- 转换结果可能包含消息历史和上下文增强内容（视转换参数而定）。

## 14. 贡献建议（简版）

推荐流程：

1. 新建分支
2. 开发与验证（`npm run build`、`cargo check`）
3. 提交 PR，说明：
   - 行为变化
   - UI 变更截图
   - 协议或数据结构改动说明

## 15. 许可证

MIT
