# CASR GUI - Chinese Path Fix

## 问题
之前的版本在处理包含中文字符的路径时会出现错误：
```
文件名、目录名或卷标语法不正确。
```

## 解决方案
现在使用临时批处理文件来正确处理中文路径：

1. **创建临时批处理文件**，设置 UTF-8 代码页
2. **在批处理文件中切换目录**并执行命令
3. **避免命令行参数解析问题**

## 使用方法

### 方法 1：使用启动脚本（推荐）
双击运行 `start-chinese-fix.bat`

### 方法 2：手动启动
在 PowerShell 中：
```powershell
cd "D:\程序\code\cross-agent\casr-gui"
# 先停止占用端口的进程
npm run tauri dev
```

## 验证修复
当你在 GUI 中点击 "Resume" 按钮时，应该看到：

```
=== RESUME COMMAND EXECUTION DEBUG ===
Original command: claude --resume <session-id>
Workspace detected: D:\程序\code\apps\项目名
=======================================
Batch file content: chcp 65001 > nul
cd /d "D:\程序\code\apps\项目名"
claude --resume <session-id>
```

新的终端窗口应该能正确处理中文路径并成功恢复会话！

## 技术细节
- 使用 `chcp 65001` 设置 UTF-8 代码页
- 创建临时批处理文件避免命令行解析问题
- 批处理文件位置: `%TEMP%\casr_resume.bat`
