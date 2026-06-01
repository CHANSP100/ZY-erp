# -*- coding: utf-8 -*-
"""Generate analysis/菜单字段对照总表_待确认.md — single review document."""
from __future__ import annotations

import re
from pathlib import Path

# Reuse field logic from per-menu generator
from gen_field_mapping_docs import (
    MENUS,
    field_flags,
    map_component,
    parse_dict,
    phase,
    sort_fields,
    sql_type,
)

BASE = Path(__file__).parent
OUT = BASE / "菜单字段对照总表_待确认.md"
BACKLOG = BASE / "BACKLOG_菜单开发清单.md"

# 九项已完成/在做的菜单代码（Part 3 细表）
CURRENT_CODES = {
    "OthHZYQD", "FasECA", "FasEA", "FasED", "FasECB", "FasEB",
    "InvAD", "InvCA", "InvCB",
}

# 经验：同构单据 PS_ID / OS_ID
PS_ID_HINT = {
    "InvBA": "PC 进货",
    "InvBB": "PB 进货退回",
    "InvBC": "PD 进货折让",
    "InvCA": "SA 销货",
    "InvCB": "SB 销退",
    "InvCC": "SD 销折",
}

OS_ID_HINT = {
    "InvAD": "SO 受订",
    "InvAF": "PO 采购",
    "InvAG": "PR 采购退回",
}


def infer_page_type(hdr: str, body: str, code: str) -> str:
    body = (body or "").strip()
    if not body or body == "—":
        if hdr in ("INDX", "DEPT") or code in ("OthHZYQD", "FasED"):
            return "树形档案"
        if hdr in ("UP_DEF",):
            return "政策列表"
        if hdr in ("MF_YG",):
            return "人事扩展"
        return "档案列表"
    if hdr.startswith("MF_TI"):
        return "送检单据"
    if hdr.startswith("MF_IJ"):
        return "调整/领料单据"
    return "单据"


def infer_route(code: str, name: str) -> str:
    known = {
        "OthHZYQD": "/indx", "FasECA": "/prdt", "FasEA": "/cust", "FasED": "/dept",
        "FasECB": "/wh", "FasEB": "/salm", "InvAD": "/so", "InvCA": "/sa", "InvCB": "/sb",
        "InvBA": "/pc", "InvBB": "/pb", "InvAF": "/po", "InvAQ": "/sq", "MrpAC": "/mo",
    }
    if code in known:
        return known[code]
    return f"/{code.lower()}"


def parse_backlog_rows() -> list[dict]:
    rows = []
    for line in BACKLOG.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or line.startswith("| 状态") or line.startswith("|------"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 9:
            continue
        status, stage, seq, code, name, hdr, body, deps = parts[1:9]
        if not code or code in ("菜单代码", "—") or "不要" in status:
            continue
        if code.startswith("INV") and code == "INVXK":
            continue
        rows.append({
            "status": status.replace("✅已完成", "已完成").replace("⏳待开发", "待开发").replace("**▶当前建议**", "当前建议"),
            "stage": stage,
            "seq": seq,
            "code": code,
            "name": name,
            "hdr": hdr,
            "body": body or "—",
            "deps": deps or "—",
        })
    return rows


def experience_note(row: dict) -> str:
    code, hdr, body, name = row["code"], row["hdr"], row["body"], row["name"]
    if code in CURRENT_CODES:
        return "见 Part 3 本期字段细表"
    if hdr == "MF_PSS" and body == "TF_PSS":
        ps = PS_ID_HINT.get(code, "PS_ID 待查 DATAEX")
        return f"同销货单模板；{ps}；表头表身栏位参照 InvCA，差异仅识别码与转入来源"
    if hdr == "MF_POS" and body == "TF_POS":
        os_ = OS_ID_HINT.get(code, "OS_ID 待查 DATAEX")
        return f"同受订单模板；{os_}；栏位参照 InvAD"
    if hdr == "MF_BG" and body == "TF_BG":
        return "变更单模板；表头变更号+日期+原单号；表身变更前后对照（二期可简化为整单复制改）"
    if hdr == "MF_SQ":
        return "请购单；表头请购日期/单号/请购人/部门；表身品号/数量/需求日"
    if hdr == "MF_MO":
        return "制令单；表头制令号/品号/数量/开工完工日；表身领料BOM行（首期可只做表头+完工数量）"
    if hdr == "MF_ML":
        return "领退料单；表头单号/制令或托工单号/仓库；表身品号/数量/库位"
    if hdr == "MF_IJ":
        return "调整/领料类；表头调整号/日期/仓库；表身品号/数量/单位成本（按菜单细分）"
    if hdr == "MF_TI":
        return "送检单；表头送检号/来源单；表身品号/送检数量/合格数（首期列表+明细）"
    if hdr == "MF_BOM":
        return "BOM；母件品号+版本；表身子件/用量/损耗率"
    if hdr == "MF_YG":
        return "人事扩展；员工 SALM 已覆盖基础；此项二期或合并 FasEB"
    if hdr == "UP_DEF":
        return "定价政策；政策代号/名称/生效日；明细行品号或中类+单价"
    if hdr in ("PRDT", "CUST", "SALM", "MY_WH", "INDX", "DEPT"):
        return "基础资料；见 Part 3 同表菜单"
    return "待补截图后细化；库字段以 DICT_FLD 为准"


def dev_phase(row: dict) -> str:
    if row["code"] in CURRENT_CODES:
        return "本期（在修）"
    if row["stage"] in ("P1", "P2", "P3", "P4", "P5") and row["code"] in ("InvCC", "InvBA", "InvAQ", "InvAF"):
        return "下一批"
    if row["stage"].startswith("P6") or row["stage"] in ("P6", "P7", "P8", "P9"):
        return "二期"
    return "按 BACKLOG 阶段"


def render_p1_table(menu: dict, table: str, area: str, fields: list[dict]) -> list[str]:
    p1 = [f for f in sort_fields(menu, table, fields) if phase(table, f, menu["name"]) == "本期"]
    lines = [
        f"#### {area} `{table}` — 本期 **{len(p1)}** 项（库内另有二期字段，确认后写入分文件附录）",
        "",
        "| 序 | 字段名 | 中文名称 | 组件 | 查询 | 列表 | 表单 | 必填 | 只读 | 您的备注 |",
        "|----|--------|----------|------|------|------|------|------|------|----------|",
    ]
    for i, fld in enumerate(p1, 1):
        flags = field_flags(table, fld, area, menu)
        note = fld["note"].replace("|", "\\|")
        comp = flags["component"]
        lines.append(
            f"| {i} | {fld['fld_name']} | {note} | {comp} | {flags['query']} | {flags['list']} "
            f"| {flags['form']} | {flags['required']} | {flags['readonly']} | |"
        )
    lines.append("")
    return lines


def render_master(all_tables: dict) -> str:
    backlog = parse_backlog_rows()
    lines = [
        "# 菜单与字段对照总表（待确认）",
        "",
        "> **状态：草稿 — 请您在本表直接修改**",
        "> **确认方式：** 改完后回复「**总表确认**」或逐段「Part 3 确认」",
        "> **确认前：** 不拆分 `字段对照/*.md`、不写 `client-vue` 业务页",
        "",
        "---",
        "",
        "## 0. 使用说明",
        "",
        "| 部分 | 内容 | 您做什么 |",
        "|------|------|----------|",
        "| **Part 1** | 60 项菜单索引（路由/类型/阶段） | 改路由、页面类型、开发优先级 |",
        "| **Part 2** | 全局约定 | 有异议请标注 |",
        "| **Part 3** | **当前 9 项**本期字段（截图顺序） | 改顺序、删增栏、改组件/必填 |",
        "| **Part 4** | 其余 51 项经验预设 | 改「本期要点」或标「延后」 |",
        "| **Part 5** | 签字 | 确认后我再执行 |",
        "",
        "**原则：** 库字段中文不擅自改；截图顺序优先；二期字段不在 Part 3 展开（确认后自动生成附录）。",
        "",
        "---",
        "",
        "## Part 1 — 菜单总览（60 项）",
        "",
        "| 序 | 状态 | 阶段 | 菜单代码 | 界面中文 | 表头 | 表身 | 页面类型 | 路由 | 开发批次 | 前置 |",
        "|----|------|------|----------|----------|------|------|----------|------|----------|------|",
    ]

    for row in backlog:
        pt = infer_page_type(row["hdr"], row["body"], row["code"])
        if row["code"] == "FasED":
            pt = "树形档案"
        if row["code"] == "OthHZYQD":
            pt = "树形档案"
        route = infer_route(row["code"], row["name"])
        batch = dev_phase(row)
        lines.append(
            f"| {row['seq']} | {row['status']} | {row['stage']} | {row['code']} | {row['name']} | "
            f"{row['hdr']} | {row['body']} | {pt} | {route} | {batch} | {row['deps']} |"
        )

    lines += [
        "",
        "---",
        "",
        "## Part 2 — 全局约定",
        "",
        "| 项 | 约定 |",
        "|----|------|",
        "| 布局 | 顶栏 + 左菜单 + 底栏版权 |",
        "| 档案/列表 | 顶查询区 + 表格 + **弹窗**编辑 |",
        "| 树形档案 | 左树 + 右列表 + 弹窗（中类、部门） |",
        "| 单据 | 左宽表头表身 + 右单据列表（列表顶可筛） |",
        "| 开窗 | LookupField + LookupDialog，单击选中 |",
        "| 字段权威 | 库为主 → 截图补展示 → 冲突问您 |",
        "| 单号 | 档案手输或规则；**单据自动生成只读** |",
        "",
        "---",
        "",
        "## Part 3 — 当前 9 项 · 本期字段（截图/口述顺序）",
        "",
        "> 下列仅列 **本期** 栏位，供您逐项改。二期库字段在总表确认后自动附录。",
        "",
    ]

    for idx, menu in enumerate(MENUS, 1):
        lines += [
            f"### 3.{idx} {menu['name']}（{menu['code']}）",
            "",
            f"| 项 | 值 |",
            f"|----|-----|",
            f"| 路由 | {menu['route']} |",
            f"| 页面类型 | {menu['page_type']} |",
        ]
        if menu.get("filter"):
            hdr, body = menu["tables"]
            lines.append(f"| 表头 | {hdr[0]}（{menu['filter']}） |")
            lines.append(f"| 表身 | {body[0]} |")
        else:
            lines.append(f"| 主表 | {menu['tables'][0][0]} |")
        if menu.get("screenshot"):
            lines.append(f"| 截图 | {menu.get('screenshot')} |")
        if menu.get("txt"):
            lines.append(f"| 口述 | {menu.get('txt')} |")
        lines.append("")

        for table, area in menu["tables"]:
            fields = all_tables.get(table, [])
            lines += render_p1_table(menu, table, area, fields)

        if menu["page_type"] == "单据":
            lines += [
                "**单据规则（经验预设，可改）：**",
                "",
                "| 项 | 内容 |",
                "|----|------|",
            ]
            if menu["name"] == "受订单":
                lines += [
                    "| 转入 | 计划单/报价单（二期）；首期可只做手工录入 |",
                    "| 回写 | 销货单存盘 → TF_POS.QTY_PS |",
                    "| 按钮 | 新增｜转入｜存盘 |",
                ]
            elif menu["name"] == "销货单":
                lines += [
                    "| 转入 | 受订单（客户相同、未交完） |",
                    "| 回写 | TF_POS.QTY_PS += 数量 |",
                    "| 合计 | 表身汇总未税/税额/合计 |",
                    "| 按钮 | 新增｜从受订单转入｜存盘 |",
                ]
            elif menu["name"] == "销货退回":
                lines += [
                    "| 转入 | 销货单（待您确认条件） |",
                    "| 按钮 | 新增｜从销货单转入｜存盘 |",
                ]
            lines.append("")
        lines.append("---")
        lines.append("")

    lines += [
        "## Part 4 — 其余 51 项 · 经验预设（菜单级）",
        "",
        "> 未展开库字段明细。您可改「本期要点」或「开发批次」。确认后再按菜单出分文件或开发。",
        "",
        "| 序 | 菜单代码 | 界面中文 | 表头 | 表身 | 页面类型 | 路由 | 开发批次 | 本期要点（经验） | 截图 | 您的修改 |",
        "|----|----------|----------|------|------|----------|------|----------|------------------|------|----------|",
    ]

    for row in backlog:
        if row["code"] in CURRENT_CODES:
            continue
        pt = infer_page_type(row["hdr"], row["body"], row["code"])
        if row["code"] in ("FasED", "OthHZYQD"):
            pt = "树形档案"
        lines.append(
            f"| {row['seq']} | {row['code']} | {row['name']} | {row['hdr']} | {row['body']} | "
            f"{pt} | {infer_route(row['code'], row['name'])} | {dev_phase(row)} | "
            f"{experience_note(row)} | 待补 | |"
        )

    lines += [
        "",
        "---",
        "",
        "## Part 5 — 确认",
        "",
        "| 项 | 内容 |",
        "|----|------|",
        "| 确认人 | |",
        "| 日期 | |",
        "| 范围 | □ Part 1 菜单索引　□ Part 3 九项字段　□ Part 4 其余预设 |",
        "",
        "**回复示例：**",
        "",
        "- 「总表确认」→ 我按您的修改同步 `字段对照/*.md` 并开始排开发顺序",
        "- 「总表确认，先做销货单」→ 仅销货单进入字段确认与开发",
        "- 或直接在本表 Part 3 改完后说「按总表 Part 3 重做字段对照」",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    all_tables = parse_dict()
    content = render_master(all_tables)
    OUT.write_text(content, encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
