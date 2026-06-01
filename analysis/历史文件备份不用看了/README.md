# SunSystem 分析导出

规则：**逻辑表名去掉 `.DB` 后缀 = 业务库 DB_11 物理表名**（如 `ABGT.DB` → `ABGT`）。

## 文件说明

| 文件 | 内容 |
|------|------|
| `01_dict_tab_list.txt` | 全部 2296 张逻辑表 + 中文名 + 字段数 |
| `02_tablesrc_raw.txt` | 留在 SunSystem 的 80 张表（无 .DB 后缀） |
| `09_sys_vs_biz_counts.txt` | 系统表 80 / 业务字典 2216 |
| `03_dataex_bills.txt` | 625 条单据 ↔ 菜单 ↔ 表头表身 |
| `04_bil_lc_rules.txt` | 224 条单据流程规则 |
| `05_tables_in_dataex.txt` | DATAEX 中出现的表名（已去 .DB） |
| `08_bills_with_tables.txt` | 有表头映射的单据 + 中文表名 |
| `10_active_tables_from_meta.txt` | DATAEX ∪ 报表 引用的表（候选优先扫描） |
| `11_biz_dict_tables.txt` | 2216 张业务库字典表清单 |
| `06_reports_summary.txt` | 报表按模块/文件汇总 |
| `07_dlllink_summary.txt` | 菜单统计 + 样例 |

## DB_11 扫描结果（已完成）

| 指标 | 数量 |
|------|------|
| 用户表 | 2230 |
| 有数据（`rows>0`） | **122** |
| 空表 | 2108 |
| 总行数（约） | 267,849 |

| 文件 | 内容 |
|------|------|
| `db11_all_tables_rowcount.txt` | 全库 2230 表行数 |
| `db11_tables_with_data.txt` | 122 张有数据表 |
| `db11_empty_tables.txt` | 2108 张空表 |
| `db11_keep_list_with_titles.txt` | 保留候选 + DICT 中文名 |
| `db11_crossref_active_meta.txt` | 与 meta 约 600 张对照 |
| `db11_data_not_in_active_meta.txt` | 有数据但不在 meta 的 69 张 |

**对照 meta 约 600 张**：53 张有数据，539 张在 DB_11 存在但为空，10 张在 DB_11 不存在。

## 重构范围规则（以菜单为准）

**菜单在 DATAEX 中对应的表（MF_TABLE / TF_TABLE，去 `.DB`）若在 DB_11 有非空记录 → 保留；否则该菜单及对应表不重构。**

有数据但**未挂在任何菜单**上的表 → **排除**（不重构）。

见 `refactor_scope_by_menu.txt`：**71** 个菜单、**44** 张表保留；**448** 个菜单淘汰；**78** 张有数据但无菜单的表剔除。

## 逐项开发（当前模式）

- [PLAN_总体规划.md](./PLAN_总体规划.md) — 总体规划、验收门禁、协作约定  
- [BACKLOG_菜单开发清单.md](./BACKLOG_菜单开发清单.md) — **60 项待开发** / 11 项不要 / 逐项状态  

**当前建议先做**：`FasED` 部门（或您指定从 `FasECA` 货品开始）。

---

## 开工前确认（请先审阅）

**总索引**：[00_开工前确认清单.md](./00_开工前确认清单.md)

| 文件 | 用途 |
|------|------|
| CONFIRM_01 | 范围与规则签字 |
| CONFIRM_02 | 71 菜单勾选（含 CSV） |
| CONFIRM_03 | 44 表确认（含 CSV） |
| CONFIRM_04 | 仍需您提供的资料 |
| CONFIRM_05 | 新系统与验收（请填写） |

---

## 交付文档（菜单驱动重构）

| 文件 | 说明 |
|------|------|
| `refactor_master_tables.md` | 44 张表：中文名、菜单、MF/TF 配对 |
| `refactor_master_menus.md` | 71 个保留菜单与表头表身 |
| `refactor_scope_by_menu.txt` | 完整筛选日志（含剔除清单） |
| `db11_row_empty_stats.txt` | 行级空行统计（NULL+空串） |
| `dict_fld_keep44.txt` | 44 表字段字典（DICT_FLD） |
| `keep_tables_44.txt` | 表名列表 |

行级空行：44 表在「全字段 NULL 或空串」口径下 **EmptyRows=0**，现有行均可迁。

## 下一步

新系统表结构 / 旧→新字段映射；按 `refactor_master_menus.md` 模块实施。
