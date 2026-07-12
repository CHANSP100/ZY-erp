# TF_MP2 视图数据维护工具

独立 Windows 桌面程序，用于维护 `VIEW_TF_MP2` 视图对应的数据（底层表 `TF_MP2`）。

## 功能

- **登录**：手动录入服务器、端口、数据库、用户名、密码（默认 `127.0.0.1` / `DB_11` / `SA1` / `2285`）
- **查询**：分析单号、订单号两个下拉框（数据来自视图对应字段），点「查询」加载表格
- **表格**：
  - 显示视图全部栏位
  - 「选择」列对应 `PRD_NO_CHG`（非空即勾选 ☑）
  - **仅「选择」列可点击切换**，其余只读
  - 列标题点击排序；快速筛选框可匹配任意栏位
- **删除**：选中一行点「删除」→ 行标红（待删标记），保存时才真正删除
- **保存**：
  - 将勾选变更写回 `TF_MP2.PRD_NO_CHG`（取消勾选清空；新勾选且无原值时写入 `Y`）
  - 将待删行按 `MP_NO` + `ITM` 从 `TF_MP2` 物理删除
  - 自动刷新视图数据

## 环境要求

- Windows 10/11
- Python 3.10+（仅开发/打包时需要）
- **ODBC Driver 17 or 18 for SQL Server**（[微软下载](https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server)）
- 可访问的 SQL Server 及视图 `VIEW_TF_MP2`

## 视图字段约定

程序自动识别下列字段（按优先级）：

| 用途 | 候选列名 |
|------|----------|
| 分析单号下拉 | `分析单号`、`MP_NO` |
| 订单号下拉 | `OS_NO`、`订单号`、`SO_NO` |
| 关联键 | `MP_NO`、`ITM` |
| 选择框 | `PRD_NO_CHG` |

若视图列名不同，请在库中调整视图别名或联系开发扩展 `config.py` 中的候选名。

## 运行（源码）

```powershell
cd tools\tf-mp2-editor
pip install -r requirements.txt
python app.py
```

## 打包 EXE

在 **Windows** 上双击或执行：

```bat
build.bat
```

生成：`dist\TF_MP2视图维护.exe`

可将 exe 单独拷贝到其他 Windows 电脑使用（需安装 ODBC 驱动）。

## 配置文件

登录勾选「记住连接信息」后，在同目录生成 `login_config.json`（密码明文，仅本机）。
