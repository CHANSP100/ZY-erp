# -*- coding: utf-8 -*-
from pathlib import Path

base = Path(__file__).parent

# Parse 不要 from chinese table
reject = set()
rows_cn = []
for line in (base / "菜单中文名对照表_保留71项.md").read_text(encoding="utf-8").splitlines():
    if line.startswith("|") and not line.startswith("| 界面") and not line.startswith("|---"):
        p = [x.strip() for x in line.split("|")]
        if len(p) >= 6 and p[2]:
            code = p[2]
            cn = p[1]
            note = p[5] if len(p) > 5 else ""
            if "不要" in note or "不要" in line:
                reject.add(code)
            rows_cn.append((cn, code, note))

# Menu detail from master_menus (gbk)
menu_detail = {}
text = (base / "refactor_master_menus.md").read_bytes().decode("gbk", errors="ignore")
for line in text.splitlines()[4:]:
    if "|" not in line or line.startswith("-"):
        continue
    p = [x.strip() for x in line.split("|") if x.strip()]
    if len(p) >= 5:
        menu_detail[p[0]] = {
            "rem": p[1],
            "mf": p[2] if p[2] != "-" else "",
            "tf": p[3] if p[3] != "-" else "",
            "mf_cnt": p[4],
            "tf_cnt": p[5],
        }

# cn name map
cn_map = {c: n for n, c, _ in rows_cn}

# Development phases: (phase_id, phase_name, menu_order)
PHASES = [
    ("P0", "平台基础（首期开工前）", []),
    (
        "P1",
        "基础资料",
        [
            "FasED",
            "FasECB",
            "OthHZYQD",
            "FasECA",
            "FasEA",
            "FasEB",
            "WagBA",
        ],
    ),
    ("P2", "BOM", ["FasECF"]),
    ("P3", "定价政策", ["UP_DEF", "UP_DEFA", "Up_DefB"]),
    (
        "P4",
        "采购",
        ["InvAQ", "InvAD", "InvAF", "InvAG", "InvADA", "InvAFC", "InvHC", "InvHD"],
    ),
    (
        "P5",
        "进货/销货",
        ["InvBA", "InvBB", "InvBC", "InvCA", "InvCB", "InvCC"],
    ),
    (
        "P6",
        "生产核心",
        [
            "MrpABA",
            "MrpAC",
            "MrpAG",
            "MrpAFC",
            "MrpAA",
            "MrpAGI",
            "MrpAGJ",
        ],
    ),
    (
        "P7",
        "托外",
        ["MrpBE", "MrpBF", "MrpBR", "MrpAGK", "MrpAGL", "MrpAGM", "MrpAHJ"],
    ),
    (
        "P8",
        "库存调整/成本/期初",
        [
            "InvDE",
            "InvDEA",
            "InvDEB",
            "InvDEE",
            "InvXA",
            "InvXB",
            "InvXC",
            "DrpXH",
            "MrpHSA",
            "MrpHSC",
        ],
    ),
    (
        "P9",
        "变更与其它",
        ["MrpAZ", "MrpADA", "MrpAGA", "MrpAGG", "FixT0", "InvGA", "InvGB", "InvGC", "MrpBLA", "MrpBLB", "MrpBLC"],
    ),
]

# All keep menus from scope
all_keep = set()
in_k = False
for line in (base / "refactor_scope_by_menu.txt").read_text(encoding="utf-8").splitlines():
    if "## KEEP menus" in line:
        in_k = True
        continue
    if in_k and line.startswith("## "):
        break
    if in_k and line.strip():
        all_keep.add(line.strip())

# Menus in phases
phased = set()
for _, _, menus in PHASES:
    phased |= set(menus)

unphased = sorted(all_keep - phased - reject)
reject_sorted = sorted(reject)

active = sorted(all_keep - reject, key=lambda m: cn_map.get(m, m))

# Build backlog md
lines = [
    "# BACKLOG — 菜单逐项开发清单",
    "",
    "> 工作方式：**一次只做一个菜单/功能**，您验收通过后再做下一项。",
    "",
    "## 统计",
    "",
    f"| 项目 | 数量 |",
    f"|------|------|",
    f"| 原保留菜单 | 71 |",
    f"| 您标注「不要」 | {len(reject)} |",
    f"| **待开发菜单** | **{len(all_keep) - len(reject)}** |",
    f"| 待补充（后期） | 您口头说明 |",
    "",
    "## 您标注「不要」的菜单（不做）",
    "",
    "| 菜单代码 | 界面中文 | 表头 | 表身 |",
    "|----------|----------|------|------|",
]
for m in reject_sorted:
    d = menu_detail.get(m, {})
    lines.append(
        f"| {m} | {cn_map.get(m, d.get('rem', ''))} | {d.get('mf', '-')} | {d.get('tf', '-')} |"
    )

lines += [
    "",
    "## 开发顺序（按阶段，阶段内从上到下）",
    "",
    "| 状态 | 阶段 | 序号 | 菜单代码 | 界面中文 | 表头 | 表身 | 前置依赖 |",
    "|------|------|------|----------|----------|------|------|----------|",
]

seq = 0
first_pending = None
for pid, pname, menus in PHASES:
    if pid == "P0":
        continue
    for m in menus:
        if m in reject:
            continue
        if m not in all_keep:
            continue
        seq += 1
        d = menu_detail.get(m, {})
        deps = ""
        if pid == "P1":
            if m == "FasECA":
                deps = "FasED,FasECB"
            elif m == "FasEA":
                deps = "FasECA"
        elif pid == "P2":
            deps = "FasECA"
        elif pid == "P4":
            deps = "FasECA,CUST"
        elif pid == "P6":
            deps = "FasECF,BOM"
        status = "⏳待开发"
        if first_pending is None:
            first_pending = m
            status = "**▶当前建议**"
        lines.append(
            f"| {status} | {pid} | {seq} | {m} | {cn_map.get(m, d.get('rem', ''))} | "
            f"{d.get('mf', '-')} | {d.get('tf', '-')} | {deps} |"
        )

if unphased:
    lines += ["", "### 未编入阶段（需与您确认顺序）", ""]
    for m in unphased:
        d = menu_detail.get(m, {})
        lines.append(f"- {m} {cn_map.get(m, d.get('rem', ''))}")

lines += [
    "",
    "## 待补充菜单（您说后期再补）",
    "",
    "| 界面中文 | 菜单代码 | 状态 |",
    "|----------|----------|------|",
    "| （待您提供） | | 📌待补充 |",
    "",
    "## 单项完成定义（验收门禁）",
    "",
    "每个菜单必须全部满足才可标 ✅：",
    "",
    "1. **流程**：与您提供的截图/步骤一致（或已确认无截图）",
    "2. **数据**：表头/表身可增删改查；DB_11 迁移或对接完成",
    "3. **规则**：审核/状态/单号规则与旧系统一致（或书面变更）",
    "4. **联调**：前置菜单数据可正常被引用",
    "5. **您签字**：该菜单验收通过",
    "",
    "## 状态图例",
    "",
    "| 符号 | 含义 |",
    "|------|------|",
    "| ▶当前建议 | 建议下一个开发的菜单 |",
    "| ⏳待开发 | 排队中 |",
    "| 🔄开发中 | 进行中 |",
    "| ✅已完成 | 您已验收 |",
    "| ❌不要 | 您已剔除 |",
    "| 📌待补充 | 后期新增 |",
]

(base / "BACKLOG_菜单开发清单.md").write_text("\n".join(lines), encoding="utf-8")

# Plan doc
plan = f"""# PLAN — ERP 重构总体规划

> 原则：**总体规划、逐一开发、逐项验收**。  
> 更新：根据您对 71 菜单的审阅，**{len(reject)} 项标注「不要」**，首期开发 **{len(all_keep) - len(reject)}** 个菜单功能。

---

## 1. 工作模式（已按您的要求固定）

```mermaid
flowchart LR
  A[选下一个菜单] --> B[流程+字段确认]
  B --> C[开发+迁移]
  C --> D[您验收]
  D -->|通过| E[标为完成]
  E --> A
  D -->|不通过| C
```

- **不做大爆炸**：不同时开 71 个功能。
- **一个菜单 = 一个交付单元**（含表头/表身、列表、必要审核）。
- **缺少的菜单**：在 BACKLOG 标「待补充」，您提供后再插入合适阶段。

---

## 2. 范围快照

| 类别 | 说明 |
|------|------|
| 开发菜单 | 见 [BACKLOG_菜单开发清单.md](./BACKLOG_菜单开发清单.md) |
| 数据表 | 仍基于原 44 张有数据表；不做「不要」菜单的**界面**，表若被其他菜单共用仍保留 |
| 系统库 SunSystem | 菜单/字段/规则只读参照，首期以 DB_11 数据为准 |
| 排除 | 448 个空菜单、78 张无菜单有数据表、您标注「不要」的 11 菜单 |

### 您标注「不要」的 11 项

`POS_CUST`、`InvAE`、`MrpBEA`、`MrpAGH`、`SebCA`、`SebCB`、`InvGE`、`InvGD`、`MrpBL`、`INVXK`、`MrpBLD`

> 说明：例如 `InvAE` 不要，但 `InvAD` 采购受订仍保留，共用 `MF_POS`/`TF_POS` 表无冲突。

---

## 3. 分阶段路线图（宏观）

| 阶段 | 名称 | 目标 |
|------|------|------|
| **P0** | 平台基础 | 登录、组织、权限骨架、单号/参数（首期最小集） |
| **P1** | 基础资料 | 部门、仓库、中类、**货品**、客户、业务员、人事 |
| **P2** | BOM | 物料清单（生产/采购依赖） |
| **P3** | 定价 | 销/购/托工定价政策 |
| **P4** | 采购 | 请购 → 受订 → 采购 → 变更/核价 |
| **P5** | 进销 | 进货、销货、退回、折让 |
| **P6** | 生产核心 | 需求分析、制令、领/退/补料、缴库、计划 |
| **P7** | 托外 | 托外单、缴回、退料、补料等 |
| **P8** | 库存成本 | 调整单、成本调整、期初、缴库联动 |
| **P9** | 其余 | 生产变更、订单分析、送检类（保留部分） |

阶段内顺序见 **BACKLOG**；**建议第一项业务菜单：`FasECA` 货品基础资料**（P1-4，依赖部门+仓库已建）。

---

## 4. 每个菜单的固定交付包（重复 60 次的标准）

每个菜单完成时，交付：

| 交付物 | 说明 |
|--------|------|
| `功能说明.md` | 界面中文名、操作步骤、审核规则 |
| 表结构 | 新系统 DDL 或映射表（来自 dict_fld） |
| 接口/页面 | 列表 + 表头 + 表身（如有） |
| 迁移脚本 | 从 DB_11 导入该菜单相关数据 |
| 验收清单 | 5～10 条可勾选测试项 |

您的流程包放在 `ERP流程确认/<界面中文>/`，每完成一菜单更新一项。

---

## 5. 技术总体规划（待您 CONFIRM-05 拍板）

以下在 **P0** 开工前需定稿（不必一次齐，但 P1 前要有）：

- 新 ERP 形态：自研 / 产品
- 技术栈（前端、后端、数据库）
- 与旧 Sunlike 并行还是切换
- 编码策略：沿用旧物料码/客户码

**在未定技术栈前**，我仍可继续做：字段映射、迁移 SQL 设计、流程文档——以 **菜单为单位** 积累。

---

## 6. 当前建议的「第一个功能」

| 项 | 建议 |
|----|------|
| **菜单** | `FasECA` — 货品基础资料 |
| **表** | `PRDT`（约 10100 行） |
| **理由** | 几乎全部被采购/生产/库存引用，最适合作为 P1 核心 |
| **您需配合** | `ERP流程确认/货品基础资料/` 截图 + 步骤说明（若已做可直接用） |

若您希望先从更简单的练手：**`FasED` 部门** 或 **`FasECB` 仓库**（数据量小）也可以，请直接说。

---

## 7. 协作约定

1. 您验收通过 → 回复「`FasECA` 通过」→ 我更新 BACKLOG 为 ✅ 并标下一个 ▶  
2. 验收不通过 → 列问题 → 只改该菜单，不牵动其他  
3. 新菜单补充 → 您给界面中文 + 截图 → 插入 BACKLOG 待补充区并排期  

---

## 相关文件

- [BACKLOG_菜单开发清单.md](./BACKLOG_菜单开发清单.md) — **逐项状态主表**
- [菜单中文名对照表_保留71项.md](./菜单中文名对照表_保留71项.md) — 含您的「不要」备注
- [refactor_master_menus.md](./refactor_master_menus.md) — 表头表身对照
- [dict_fld_keep44.txt](./dict_fld_keep44.txt) — 字段级字典
"""

(base / "PLAN_总体规划.md").write_text(plan, encoding="utf-8")

# Update chinese table with status
out = []
for line in (base / "菜单中文名对照表_保留71项.md").read_text(encoding="utf-8").splitlines():
    if line.startswith("| 界面中文"):
        out.append("| 界面中文（系统库） | 菜单代码 | 开发状态 | 表头 | 表身 | 备注 |")
        continue
    if line.startswith("|---"):
        out.append("|------------------|----------|----------|------|------|------|")
        continue
    if line.startswith("|") and not line.startswith("| 界面"):
        p = [x.strip() for x in line.split("|")]
        if len(p) >= 6 and p[2]:
            code = p[2]
            if "不要" in line:
                st = "❌不要"
            elif code == first_pending:
                st = "▶待开发"
            else:
                st = "⏳排队"
            out.append(f"| {p[1]} | {code} | {st} | {p[3]} | {p[4]} | {p[5]} |")
        else:
            out.append(line)
    else:
        out.append(line)

(base / "菜单中文名对照表_保留71项.md").write_text("\n".join(out), encoding="utf-8")
print("reject", len(reject), "active", len(all_keep) - len(reject), "first", first_pending)
