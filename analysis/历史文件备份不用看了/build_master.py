# -*- coding: utf-8 -*-
from pathlib import Path

base = Path(__file__).parent

# Parse KEEP tables
keep = set()
rows_cnt = {}
in_keep = False
for line in (base / "refactor_scope_by_menu.txt").read_text(encoding="utf-8", errors="ignore").splitlines():
    if "## KEEP tables" in line:
        in_keep = True
        continue
    if in_keep and line.startswith("## "):
        break
    if in_keep and "|" in line:
        p = line.split("|")
        if p[0] in ("Tbl", "") or p[0].startswith("-"):
            continue
        t = p[0].strip().upper()
        if t:
            keep.add(t)
            try:
                rows_cnt[t] = int(p[1].strip())
            except ValueError:
                pass

# DICT_TAB titles (try GBK for Chinese)
dict_tab = {}
raw = (base / "01_dict_tab_list.txt").read_bytes()
for enc in ("utf-8", "gbk", "cp936"):
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
        dict_tab[p[1].strip().upper()] = p[2].strip()

# DATAEX links
menu_by_tbl = {}
for line in (base / "dataex_menu_tables_full.txt").read_text(encoding="utf-8", errors="ignore").splitlines()[2:]:
    p = [x.strip() for x in line.split("|")]
    if len(p) < 5:
        continue
    menu, bil, rem, mf, tf = p[0], p[1], p[2], p[3].upper(), p[4].upper()
    for t, role in ((mf, "MF"), (tf, "TF")):
        if not t or t not in keep:
            continue
        menu_by_tbl.setdefault(t, []).append(
            {"menu": menu, "bil": bil, "rem": rem, "role": role, "pair_mf": mf, "pair_tf": tf}
        )

# Table-centric markdown
lines = [
    "# ERP 重构保留总表（菜单驱动）",
    "",
    f"保留菜单 **71** 个 | 保留表 **{len(keep)}** 张",
    "",
    "| 表名 | 行数 | 中文名 | 角色 | 关联菜单 | 配对表头 | 配对表身 | 功能说明 |",
    "|------|------|--------|------|----------|----------|----------|----------|",
]
for t in sorted(keep, key=lambda x: -rows_cnt.get(x, 0)):
    title = dict_tab.get(t, "")
    if t.startswith("MF_"):
        role = "表头"
    elif t.startswith("TF_"):
        role = "表身"
    else:
        role = "主数据"
    menus = sorted({m["menu"] for m in menu_by_tbl.get(t, [])})
    menu_s = ", ".join(menus[:6])
    if len(menus) > 6:
        menu_s += f" …(+{len(menus)-6})"
    rems = sorted({m["rem"] for m in menu_by_tbl.get(t, []) if m.get("rem")})
    rem_s = " / ".join(rems[:2])
    pair_mf = "-"
    pair_tf = "-"
    for m in menu_by_tbl.get(t, []):
        if m["role"] == "MF":
            pair_tf = m["pair_tf"] or pair_tf
            pair_mf = t
        if m["role"] == "TF":
            pair_mf = m["pair_mf"] or pair_mf
            pair_tf = t
    if not t.startswith("MF_") and not t.startswith("TF_"):
        pair_mf = "-"
        pair_tf = "-"
    lines.append(
        f"| {t} | {rows_cnt.get(t, 0):,} | {title} | {role} | {menu_s or '-'} | {pair_mf} | {pair_tf} | {rem_s or '-'} |"
    )
(base / "refactor_master_tables.md").write_text("\n".join(lines), encoding="utf-8")

# Menu-centric markdown
mlines = [
    "# 保留菜单与表头/表身结构",
    "",
    "| 菜单 | 功能说明 | 表头(MF) | 表身(TF) | 表头行数 | 表身行数 |",
    "|------|----------|----------|----------|----------|----------|",
]
seen = set()
for line in (base / "dataex_menu_tables_full.txt").read_text(encoding="utf-8", errors="ignore").splitlines()[2:]:
    p = [x.strip() for x in line.split("|")]
    if len(p) < 5:
        continue
    menu, rem, mf, tf = p[0], p[2], p[3].upper(), p[4].upper()
    if mf not in keep and tf not in keep:
        continue
    key = (menu, mf, tf)
    if key in seen:
        continue
    seen.add(key)
    mlines.append(
        f"| {menu} | {rem or '-'} | {mf or '-'} | {tf or '-'} | "
        f"{rows_cnt.get(mf, 0) if mf else '-'} | {rows_cnt.get(tf, 0) if tf else '-'} |"
    )
(base / "refactor_master_menus.md").write_text("\n".join(mlines), encoding="utf-8")

# Export keep table list for SQL
(base / "keep_tables_44.txt").write_text("\n".join(sorted(keep)), encoding="utf-8")
print(f"OK tables={len(keep)} menu_rows={len(seen)}")
