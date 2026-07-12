# TF_MP2 视图数据维护工具（C# WinForms）

独立 Windows 桌面程序，用于维护 `VIEW_TF_MP2` 视图数据（底层表 `TF_MP2`）。

## 技术栈

- C# / .NET 8 WinForms
- Microsoft.Data.SqlClient
- 单文件自包含 EXE（`win-x64`）

## 功能

- **登录**：手动录入服务器、端口、数据库、用户名、密码（默认 `127.0.0.1` / `1433` / `DB_11` / `SA1` / `2285`）
- **查询**：分析单号、订单号下拉（来自视图字段）+ 查询 / 删除 / 保存
- **表格**：
  - 显示视图全部栏位
  - 「选择」复选框列映射 `PRD_NO_CHG`（非空即勾选），**仅此列可编辑**
  - 列标题点击排序；快速筛选匹配任意栏位
- **删除**：选中行点「删除」标红待删；**保存**时按 `MP_NO` + `ITM` 从 `TF_MP2` 物理删除
- **保存**：回写勾选变更到 `TF_MP2.PRD_NO_CHG`，删除待删行，刷新视图

## 环境要求

- Windows 10/11 x64
- 编译时需要 [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- 可访问的 SQL Server 及视图 `VIEW_TF_MP2`

## 编译 EXE

```bat
cd tools\tf-mp2-editor-csharp
build.bat
```

输出：`publish\TF_MP2视图维护.exe`（自包含，无需目标机安装 .NET）

或用 Visual Studio 2022 打开 `TfMp2Editor.sln`，发布为单文件。

## 开发调试

```bat
dotnet run --project TfMp2Editor\TfMp2Editor.csproj
```

## 视图字段约定

| 用途 | 候选列名 |
|------|----------|
| 分析单号下拉 | `分析单号`、`MP_NO` |
| 订单号下拉 | `OS_NO`、`订单号`、`SO_NO` |
| 关联键 | `MP_NO`、`ITM` |
| 选择框 | `PRD_NO_CHG` |

列名不同可修改 `AppConfig.cs` 中 `AppConstants` 的候选数组。

## 与 Python 版关系

同目录上一版 Python 工具在 `tools/tf-mp2-editor/`；本目录为 C# 正式 EXE 版本，推荐在 Windows 上使用本版。
