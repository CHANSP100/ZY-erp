# -*- coding: utf-8 -*-
"""Generate pre-start confirmation documents for ERP refactor."""
from pathlib import Path
from datetime import date

base = Path(__file__).parent
today = date.today().isoformat()


def read_lines(path, skip_header=2):
    return (base / path).read_text(encoding="utf-8", errors="ignore").splitlines()[skip_header:]


def load_dict_tab():
    d = {}
    raw = (base / "01_dict_tab_list.txt").read_bytes()
    for enc in ("gbk", "utf-8", "cp936"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("utf-8", errors="ignore")
    for line in text.splitlines()[2:]:
        p = line.split("|")
        if len(p) >= 3:
            d[p[1].strip().upper()] = p[2].strip()
    return d


def load_dataex_rem():
    m = {}
    for line in read_lines("dataex_menu_tables_full.txt"):
        p = [x.strip() for x in line.split("|")]
        if len(p) >= 3 and p[0]:
            m[p[0]] = p[2] if len(p) > 2 else ""
    for line in read_lines("03_dataex_bills.txt"):
        p = [x.strip() for x in line.split("|")]
        if len(p) >= 3 and p[1]:
            m.setdefault(p[1], p[2])
    return m


def load_keep_menus():
    menus = []
    in_keep = False
    for line in (base / "refactor_scope_by_menu.txt").read_text(encoding="utf-8", errors="ignore").splitlines():
        if "## KEEP menus" in line:
            in_keep = True
            continue
        if in_keep and line.startswith("## "):
            break
        if in_keep and line.strip() and not line.startswith("#"):
            menus.append(line.strip())
    return menus


def load_menu_rows():
    rows = []
    for line in read_lines("refactor_master_menus.md", skip_header=4):
        if not line.strip() or line.startswith("-"):
            continue
        p = [x.strip() for x in line.split("|")]
        if len(p) >= 6:
            rows.append(
                {
                    "menu": p[0],
                    "rem": p[1],
                    "mf": p[2],
                    "tf": p[3],
                    "mf_cnt": p[4],
                    "tf_cnt": p[5],
                }
            )
    return rows


def load_tables():
    tables = []
    in_sec = False
    for line in (base / "refactor_scope_by_menu.txt").read_text(encoding="utf-8", errors="ignore").splitlines():
        if "## KEEP tables" in line:
            in_sec = True
            continue
        if in_sec and line.startswith("## "):
            break
        if in_sec and "|" in line:
            p = line.split("|")
            if p[0] in ("Tbl", "") or p[0].startswith("-"):
                continue
            if p[0].strip():
                tables.append({"name": p[0].strip(), "rows": p[1].strip()})
    return tables


dict_tab = load_dict_tab()
dataex_rem = load_dataex_rem()
keep_menus = load_keep_menus()
menu_rows = load_menu_rows()
tables = load_tables()

# Module grouping
MODULE_RULES = [
    ("基础资料", lambda m: m.startswith("FasE") or m in ("OthHZYQD",)),
    ("定价政策", lambda m: m.startswith("UP_") or m.startswith("Up_")),
    ("采购管理", lambda m: m.startswith("InvA") or m in ("InvAQ",)),
    ("库存/进销", lambda m: m.startswith("InvB") or m.startswith("InvC") or m.startswith("InvD") or m.startswith("InvX") or m in ("INVXK", "DrpXH")),
    ("生产/MRP", lambda m: m.startswith("Mrp")),
    ("托外/入库", lambda m: m in ("FixT0",) or m.startswith("InvG") or m.startswith("InvH")),
    ("人事", lambda m: m.startswith("Wag")),
    ("POS", lambda m: m.startswith("POS")),
    ("设备", lambda m: m.startswith("Seb")),
    ("其他", lambda m: True),
]


def module_of(menu):
    for name, fn in MODULE_RULES:
        if fn(menu) and name != "其他":
            return name
    return "其他"


menu_by_name = {r["menu"]: r for r in menu_rows}

# --- CONFIRM_01 ---
c01 = f"""# CONFIRM-01 重构范围与规则（请确认）

> 生成日期：{today}  
> 确认人：________　确认日期：________　□同意 □需修改

---

## 1. 已确定的筛选规则

| 序号 | 规则 | 您的确认 |
|------|------|----------|
| R1 | 以 **DATAEX 菜单** 对应的 **MF_TABLE / TF_TABLE** 为准（表名去掉 `.DB`） | □ |
| R2 | 对应表在 **DB_11 有数据行** → 菜单与表 **纳入重构** | □ |
| R3 | 对应表在 DB_11 **无数据** → 菜单与表 **不重构** | □ |
| R4 | **无菜单关联** 但 DB_11 有数据的表（78 张）→ **不重构** | □ |
| R5 | 行级过滤：列均为 NULL 或空串视为空行；当前 44 表 **无此类行** | □ |

---

## 2. 数量汇总（系统扫描结果）

| 项目 | 数量 |
|------|------|
| SunSystem 逻辑表（DICT_TAB） | 2,296 |
| DB_11 物理表 | 2,230 |
| DB_11 有数据表（全库） | 122 |
| **纳入重构菜单** | **71** |
| **纳入重构业务表** | **44** |
| 淘汰菜单（对应表全空） | 448 |
| 剔除表（有数据无菜单） | 78 |

---

## 3. 不在本次重构范围（明确排除）

- 财务（Acc*）、未启用库存/销售模块等 448 个菜单  
- BILL_PROP、ping、REPORTS、LAYOUT、SPC_PSWD 等 78 张「孤儿」表  
- SunSystem 中权限/短信/OA 等空表（除非您另行指定）

---

## 4. 修改意见（如有）

```
（请填写）


```

---

**签字确认后，方可进入数据迁移/新系统开发阶段。**
"""
(base / "CONFIRM_01_重构范围与规则.md").write_text(c01, encoding="utf-8")

# --- CONFIRM_02 menus ---
lines02 = [
    f"# CONFIRM-02 保留菜单确认表（共 {len(keep_menus)} 项）",
    "",
    f"> 生成日期：{today}",
    "",
    "请在 **确认** 列勾选：✅保留 / ❌剔除（剔除后该菜单及仅其使用的表将不再迁移）",
    "",
    "| 序号 | 模块 | 菜单代码 | 功能说明 | 表头 | 表身 | 表头行数 | 表身行数 | 确认 | 备注 |",
    "|------|------|----------|----------|------|------|----------|----------|------|------|",
]
for i, menu in enumerate(sorted(keep_menus, key=lambda m: (module_of(m), m)), 1):
    r = menu_by_name.get(menu, {})
    rem = dataex_rem.get(menu) or r.get("rem", "")
    lines02.append(
        f"| {i} | {module_of(menu)} | {menu} | {rem or '-'} | {r.get('mf','-')} | {r.get('tf','-')} | "
        f"{r.get('mf_cnt','-')} | {r.get('tf_cnt','-')} | □保留 □剔除 | |"
    )
lines02 += [
    "",
    "## 需重点核对的菜单",
    "",
    "| 菜单 | 原因 | 建议 |",
    "|------|------|------|",
    "| MrpADA | 表身 TF_DA 行数为 0 | 确认是否保留菜单或补数据 |",
    "| POS_CUST | 表身 POSCARD 行数为 0 | 确认 POS 是否上线 |",
    "| FixT0 / MrpBL* | 表头表身各仅 1 行 | 确认是否为测试数据 |",
    "| MF_YG / WagBA | 人事薪资 | 确认是否纳入首期 |",
    "",
    "## 确认汇总",
    "",
    "- 保留菜单数：______",
    "- 剔除菜单数：______",
    "- 确认人：________  日期：________",
]
(base / "CONFIRM_02_菜单确认表.md").write_text("\n".join(lines02), encoding="utf-8")

# CSV for Excel
csv02 = ["模块,菜单代码,功能说明,表头,表身,表头行数,表身行数,确认(保留/剔除),备注\n"]
for menu in sorted(keep_menus, key=lambda m: (module_of(m), m)):
    r = menu_by_name.get(menu, {})
    rem = (dataex_rem.get(menu) or r.get("rem", "")).replace(",", "，")
    csv02.append(
        f"{module_of(menu)},{menu},{rem},{r.get('mf','')},{r.get('tf','')},"
        f"{r.get('mf_cnt','')},{r.get('tf_cnt','')},,\n"
    )
(base / "CONFIRM_02_菜单确认表.csv").write_text("".join(csv02), encoding="utf-8-sig")

# --- CONFIRM_03 tables ---
lines03 = [
    f"# CONFIRM-03 保留数据表确认表（共 {len(tables)} 张）",
    "",
    f"> 生成日期：{today}",
    "",
    "| 序号 | 表名 | 中文名 | 角色 | 行数 | 可迁移行数 | 确认 | 备注 |",
    "|------|------|--------|------|------|------------|------|------|",
]
empty_stats = {}
for line in read_lines("db11_row_empty_stats.txt"):
    p = line.split("|")
    if len(p) >= 4 and p[0] not in ("Tbl", "---"):
        empty_stats[p[0].upper()] = (p[1], p[3])
for i, t in enumerate(sorted(tables, key=lambda x: -int(x["rows"].replace(",", "") or 0)), 1):
    name = t["name"].upper()
    title = dict_tab.get(name, "")
    role = "表头" if name.startswith("MF_") else ("表身" if name.startswith("TF_") else "主数据")
    total, keep = empty_stats.get(name, (t["rows"], t["rows"]))
    lines03.append(
        f"| {i} | {name} | {title} | {role} | {total} | {keep} | □保留 □剔除 | |"
    )
lines03 += [
    "",
    "**说明**：可迁移行数 = 排除「全字段为空」后的行数；当前 44 表均为全量迁移。",
    "",
    "确认人：________  日期：________",
]
(base / "CONFIRM_03_数据表确认表.md").write_text("\n".join(lines03), encoding="utf-8")

csv03 = ["表名,中文名,角色,总行数,可迁移行数,确认(保留/剔除),备注\n"]
for t in sorted(tables, key=lambda x: x["name"]):
    name = t["name"].upper()
    title = dict_tab.get(name, "").replace(",", "，")
    role = "表头" if name.startswith("MF_") else ("表身" if name.startswith("TF_") else "主数据")
    total, keep = empty_stats.get(name, (t["rows"], t["rows"]))
    csv03.append(f"{name},{title},{role},{total},{keep},,\n")
(base / "CONFIRM_03_数据表确认表.csv").write_text("".join(csv03), encoding="utf-8-sig")

# --- CONFIRM_04 materials needed ---
c04 = f"""# CONFIRM-04 仍需您提供的资料

> 生成日期：{today}  
> 下列资料 **开工前** 尽量齐备；标「必填」项未齐则不建议启动开发。

---

## A. 业务决策（必填）

| 编号 | 资料 | 用途 | 状态 |
|------|------|------|------|
| A1 | 新 ERP 形态：自研 / 采购产品 / 仅数据平台 | 决定技术路线 | □未提供 |
| A2 | 首期上线模块（对照 CONFIRM-02 勾选结果） | 控制范围 | □未提供 |
| A3 | 历史数据截止：从哪年/哪月开始迁 | 迁移脚本时间窗 | □未提供 |
| A4 | 未结案单据：是否迁移在途单 | 影响库存/财务一致性 | □未提供 |
| A5 | 客户/物料/仓库编码：沿用旧码或重编 | 主数据策略 | □未提供 |

---

## B. 新系统设计（首期可简版，开发前必填）

| 编号 | 资料 | 用途 | 状态 |
|------|------|------|------|
| B1 | 新系统表结构或 ER 图（可 Excel/PDM） | 生成 DDL 与映射 | □未提供 |
| B2 | 旧→新字段映射表（可基于 dict_fld_keep44.txt 填） | 迁移 SQL | □未提供 |
| B3 | 菜单/功能清单（新系统模块树） | 对照 CONFIRM-02 | □未提供 |

---

## C. 验收与财务（强烈建议）

| 编号 | 资料 | 用途 | 状态 |
|------|------|------|------|
| C1 | 验收标准 2～5 条（如：2024-12 库存余额一致） | 上线依据 | □未提供 |
| C2 | 已结账会计期间列表 | 避免动账期历史 | □未提供 |
| C3 | 期初余额取自哪张表/哪个时点 | 财务衔接 | □未提供 |

---

## D. 集成与运维（可二期，请标注）

| 编号 | 资料 | 用途 | 状态 |
|------|------|------|------|
| D1 | 外部系统清单（金税、物流、条码、OA…） | 接口范围 | □未提供 |
| D2 | 定时任务/批处理说明 | 作业迁移 | □未提供 |
| D3 | 附件存储方式（库内 BLOB / 文件服务器路径） | 文件迁移 | □未提供 |
| D4 | 现用 Sunlike 版本与客户端类型 | 兼容性评估 | □未提供 |

---

## E. 我们已从库中生成（无需重复提供）

- SunSystem / DB_11 表结构与行数  
- 菜单↔表映射（DATAEX）  
- 44 表字段字典：`dict_fld_keep44.txt`  
- 筛选与剔除清单：`refactor_scope_by_menu.txt`
"""
(base / "CONFIRM_04_仍需您提供的资料.md").write_text(c04, encoding="utf-8")

# --- CONFIRM_05 new system template ---
c05 = f"""# CONFIRM-05 新系统与验收（请填写）

> 生成日期：{today}

---

## 1. 新 ERP 目标

| 项 | 您的选择 |
|----|----------|
| 类型 | □ 自研　□ 采购（产品名：______）　□ 仅数据中台 |
| 技术栈 | ________________________ |
| 是否兼容旧客户端 | □ 是　□ 否 |

---

## 2. 分期计划

| 期次 | 模块 | 计划上线时间 |
|------|------|--------------|
| 一期 | （例：基础资料+BOM+采购+库存） | |
| 二期 | | |
| 三期 | | |

---

## 3. 验收标准（请写可量化条款）

1. 
2. 
3. 

---

## 4. 主数据编码策略

| 对象 | □ 沿用旧编码　□ 新编码（规则：______） |
|------|--------------------------------------|
| 物料 PRDT | |
| 客户 CUST | |
| 仓库 MY_WH | |
| 部门 DEPT | |

---

## 5. 数据范围

| 项 | 选择 |
|----|------|
| 历史起止 | 从 ______ 到 ______ |
| 在途未审单据 | □ 迁　□ 不迁　□ 结案后再迁 |
| 作废/历史库 *_H | □ 迁　□ 不迁 |

---

确认人：________　日期：________
"""
(base / "CONFIRM_05_新系统与验收.md").write_text(c05, encoding="utf-8")

# --- 00 index ---
c00 = f"""# 00 开工前确认清单（总索引）

> 生成日期：{today}  
> **请您按顺序审阅并确认下列文件后，再通知开始重构/迁移开发。**

---

## 第一步：确认范围（我们已从数据库扫描生成）

| 序号 | 文件 | 您要做的 |
|------|------|----------|
| 1 | [CONFIRM_01_重构范围与规则.md](./CONFIRM_01_重构范围与规则.md) | 阅读规则，签字 □同意 |
| 2 | [CONFIRM_02_菜单确认表.md](./CONFIRM_02_菜单确认表.md) | 71 个菜单逐项 □保留/□剔除 |
| 2b | [CONFIRM_02_菜单确认表.csv](./CONFIRM_02_菜单确认表.csv) | （可选）用 Excel 编辑后回传 |
| 3 | [CONFIRM_03_数据表确认表.md](./CONFIRM_03_数据表确认表.md) | 44 张表逐项确认 |
| 3b | [CONFIRM_03_数据表确认表.csv](./CONFIRM_03_数据表确认表.csv) | （可选）Excel 版 |

**参考明细（只读）：**

- [refactor_master_menus.md](./refactor_master_menus.md) — 菜单与 MF/TF  
- [refactor_master_tables.md](./refactor_master_tables.md) — 表与中文名  
- [refactor_scope_by_menu.txt](./refactor_scope_by_menu.txt) — 含 448 淘汰菜单、78 剔除表  

---

## 第二步：补充决策（需您填写）

| 序号 | 文件 | 说明 |
|------|------|------|
| 4 | [CONFIRM_04_仍需您提供的资料.md](./CONFIRM_04_仍需您提供的资料.md) | 资料清单与状态 |
| 5 | [CONFIRM_05_新系统与验收.md](./CONFIRM_05_新系统与验收.md) | 新系统方向、分期、验收 |

---

## 第三步：技术附件（开发时用，确认范围后可细看）

| 文件 | 说明 |
|------|------|
| dict_fld_keep44.txt | 44 表全部字段定义（映射 B2 的基础） |
| db11_row_empty_stats.txt | 行级空行统计 |
| keep_tables_44.txt | 表名列表 |

---

## 开工门禁（全部满足后再说「开始」）

- [ ] CONFIRM-01 已同意  
- [ ] CONFIRM-02 菜单已勾选（允许剔除个别项）  
- [ ] CONFIRM-03 数据表已确认  
- [ ] CONFIRM-05 至少填：新系统类型、一期模块、验收 2 条  
- [ ] CONFIRM-04 中 **A1～A5、B1** 有明确答复  

---

## 您确认后我们将交付

1. 《最终迁移范围》定稿（菜单+表+行数）  
2. 旧→新字段映射表（需 B1/B2）  
3. 迁移顺序与脚本（主数据 → 单据 → 库存余额）  
4. 抽样验收 SQL  

---

**回复方式**：在 CONFIRM 文件中直接修改勾选，或回复「CONFIRM-01 同意，菜单全部保留，…」。
"""
(base / "00_开工前确认清单.md").write_text(c00, encoding="utf-8")

print("Generated CONFIRM docs OK")
