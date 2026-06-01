# -*- coding: utf-8 -*-
"""Generate analysis/字段对照/<菜单名>.md from dict_fld_keep44.txt"""
from __future__ import annotations

import re
from pathlib import Path

BASE = Path(__file__).parent
DICT = BASE / "dict_fld_keep44.txt"
OUT = BASE / "字段对照"

# db.js prototype columns (本期 UI baseline)
DBJS_FIELDS: dict[str, set[str]] = {
    "INDX": {"idx_no", "name", "idx_up", "stop_dd", "rem"},
    "DEPT": {"dep", "name", "eng_name", "up", "stop_dd", "rem"},
    "MY_WH": {"wh", "name", "dep", "up_wh", "adr", "tel_no", "stop_dd", "rem"},
    "PRDT": {
        # 上次总表确认 15 项（保留）
        "idx1", "prd_no", "name", "spc", "snm", "ut", "wh", "valid_days", "qty_min1", "qty_max",
        "stop_id", "rem", "sys_date", "dep", "sal_no",
        # 2026-05-23 口述补增（不删上项）
        "knd", "ut1", "upr", "up_sal", "use_prdmark", "zc_type", "wh_lc", "qty_min", "qty_low",
    },
    "CUST": {
        "cus_no", "obj_id", "name", "snm", "cus_are", "cnt_man1", "cnt_man2", "tel1", "tel2",
        "uni_no", "biz_dsc", "adr2", "end_dd", "cur_id", "id1_tax", "sal_no", "bnk_name",
        "id_code", "rem",
    },
    "SALM": {
        "sal_no", "name", "eng_name", "name_py", "sex", "dep", "pos", "up_sal_no", "tel1",
        "tel2", "e_mail", "con_adr", "id_num", "bth", "dut_in_d", "dut_ot_d", "rem",
    },
    "MF_POS": {
        "os_id", "os_no", "os_dd", "cus_no", "use_dep", "sal_no", "cus_os_no", "bil_type",
        "cur_id", "tax_id", "est_dd", "rem", "cls_mp_id", "cls_id", "dis_cnt", "amtn_net",
        "tax", "bil_id", "bil_no",
    },
    "TF_POS": {
        "os_id", "os_no", "itm", "prd_no", "prd_name", "wh", "qty", "ut", "up", "amtn",
        "tax_rto", "tax", "est_dd", "sup_prd_no", "rem", "qty_ps",
    },
    "MF_PSS": {
        "ps_id", "ps_no", "ps_dd", "cus_no", "dep", "sal_no", "os_id", "os_no", "bil_type",
        "cur_id", "tax_id", "zhang_id", "send_mth", "send_wh", "rem", "dis_cnt", "amtn_net",
        "tax", "pay_mth", "pay_days", "adr",
    },
    "TF_PSS": {
        "ps_id", "ps_no", "itm", "ps_dd", "wh", "prd_no", "prd_name", "prd_mark", "unit",
        "qty", "qty1", "up", "amtn_net", "tax", "tax_rto", "dis_cnt", "est_dd", "rem",
        "qty_rtn", "os_no",
    },
    "MF_SQ": {
        "sq_no", "sq_dd", "dep", "cus_no", "sal_no", "est_dd", "rem", "po_no", "po_dep",
        "cur_id", "exc_rto", "cls_id", "bil_id", "bil_no",
    },
    "TF_SQ": {
        "sq_no", "itm", "prd_no", "prd_name", "prd_mark", "unit", "qty", "up", "amtn",
        "est_dd", "rem", "cus_no", "cur_id", "exc_rto", "qty1", "qty_po", "bat_no",
    },
}

# Bill header / line fields commonly on screen (screenshot supplement, still 库为主)
BILL_HEADER_EXTRA = {
    "MF_POS": {"qt_no", "pay_mth", "pay_days", "send_mth", "send_wh", "adr", "pay_dd", "chk_dd"},
    "MF_PSS": {"pay_dd", "chk_dd", "inv_no", "rp_no", "contract", "cus_os_no", "voh_no"},
    "TF_POS": {"dis_cnt", "amt", "amtn", "qty1", "pak_unit"},
    "TF_PSS": {"amt", "amtn", "cst_sal", "wh", "bat_no"},
}

BILL_HEADER_EXTRA["MF_PSS_SB"] = BILL_HEADER_EXTRA["MF_PSS"]  # same table, return bill
BILL_HEADER_EXTRA["MF_PSS_SD"] = BILL_HEADER_EXTRA["MF_PSS"]  # allowance bill
BILL_HEADER_EXTRA["MF_PSS_PC"] = BILL_HEADER_EXTRA["MF_PSS"]  # purchase receipt
BILL_HEADER_EXTRA["MF_PSS_PB"] = BILL_HEADER_EXTRA["MF_PSS"]  # purchase return
BILL_HEADER_EXTRA["MF_PSS_PD"] = BILL_HEADER_EXTRA["MF_PSS"]  # purchase allowance

ARCHIVE_QUERY = {
    "INDX": {"idx_no", "name"},
    "DEPT": {"dep", "name"},
    "MY_WH": {"wh", "name"},
    "PRDT": {"prd_no", "name", "snm", "idx1", "knd", "wh", "stop_id", "spc"},
    "CUST": {"cus_no", "name", "snm", "name_py"},
    "SALM": {"sal_no", "name", "dep", "name_py"},
}

ARCHIVE_LIST = {
    "INDX": {"idx_no", "name", "idx_up", "stop_dd", "rem"},
    "DEPT": {"dep", "name", "up", "stop_dd"},
    "MY_WH": {"wh", "name", "dep", "stop_dd"},
    "PRDT": {"prd_no", "name", "snm", "idx1", "ut", "spc", "wh", "knd", "stop_id"},
    "CUST": {"cus_no", "name", "snm", "cus_are", "tel1", "sal_no", "end_dd"},
    "SALM": {"sal_no", "name", "dep", "pos", "tel1", "tel2"},
}

BILL_SIDEBAR_QUERY = {
    "MF_POS": {"os_no", "os_dd", "cus_no"},
    "MF_PSS": {"ps_no", "ps_dd", "cus_no"},
    "MF_SQ": {"sq_no", "sq_dd", "cus_no"},
}

BILL_SIDEBAR_LIST = {
    "MF_POS": {"os_no", "os_dd", "cus_no", "sal_no", "amtn_net", "cls_id"},
    "MF_PSS": {"ps_no", "ps_dd", "cus_no", "sal_no", "amtn_net", "tax"},
    "MF_SQ": {"sq_no", "sq_dd", "cus_no", "sal_no", "est_dd", "cls_id"},
}

FK_LOOKUP = {
    "CUS_NO", "PRD_NO", "SAL_NO", "WH", "DEP", "IDX_NO", "IDX1", "IDX2", "IDX_UP",
    "UP_WH", "UP", "OS_NO", "BIL_TYPE", "SEND_WH", "USE_DEP", "PO_DEP", "CUR_ID",
    "MAS_CUS", "SUP1", "SUP2", "SRV_NO", "CHK_MAN", "USR", "USR1", "LOCK_MAN",
    "MODIFY_MAN", "PRT_USR", "SCAN_USR", "ACC_MAN", "BNK_NO", "WH_NO", "YH_WH1",
    "YH_WH2", "PJSQ_WH", "CUS_NO_KD", "CUS_NO_POS", "SAL_NO1", "UP_SAL_NO",
    "DEPRO_NO", "DEP1", "DEP_GSTD", "DEP_RK", "WC_NO", "CAS_NO", "CNTT_NO",
    "VOH_ID", "MOB_ID", "MOB_ID1", "TPL_NO", "CC_NO", "XN_NO", "PRM_NO",
}

AUTO_NO = {"OS_NO", "PS_NO", "BG_NO", "QT_NO", "VOH_NO", "RP_NO", "INV_NO", "EP_NO"}

SYSTEM_READONLY = {
    "USR", "USR1", "SYS_DATE", "UP_DD", "CLS_DATE", "CHK_MAN", "LOCK_MAN", "LOCK_DATE",
    "MODIFY_DD", "MODIFY_MAN", "PRT_DATE", "PRT_USR", "SCAN_USR", "SCAN_DATE", "PRT_NUM",
}

BACKWRITE_QTY = re.compile(
    r"^QTY_(PS|RK|PO|PRE|YS|SL|FH|IC|SQ|FX|CK|SB|RTN|ARK|XB|OI|OUT|ZQ|FP|CLS|CASH|INV|LOSS|POS)",
    re.I,
)

PHASE2_NOTE = re.compile(r"保留")
PHASE2_NAME = re.compile(
    r"(IFRS|_POS|POS_|B2C|WEB_|TB_|WS_|SCM_|JD_|ONLINE|MAI_NO|MATRIX|XPM_|TT_|CF_ID|"
    r"INV_BCODE|SUNLIKE|CWORK|DRP_|EPAPER|TRAN_REC|PSWD|PAY_B2C|MO_NO|WC_NO|FW_FLAG|"
    r"ME_FLAG|NOJF|OM_ID|YH_ID|BL_OS|QC_|TI_ITM|SL_ITM|PW_ITM|BOX_ITM|TASK_|PRM_NO|"
    r"ACT_|ZC_|SG_ID|BIL_COMP|SUB_NO|HG_BH|TZZG|POPC|OM_NO|DEF_NO|KIND_NO|"
    r"ONLINESERVICE|TB_OID|NUMIDS|HITRUST|ALIPAY|CHINAPAY)",
    re.I,
)

# 用户确认后：从 PENDING_CHANGE_MENUS 移除并登记到此
CONFIRMED_MENUS: dict[str, dict[str, str]] = {
    "销货单": {"user": "用户", "date": "2026-05-23", "note": "验收通过"},
    "货品": {"user": "用户", "date": "2026-05-23", "note": "文件头已确认 + 验收通过（DEV-02 §10 查询/列表对齐）"},
    "销货折让": {"user": "用户", "date": "2026-05-23", "note": "验收通过"},
    "进货单": {"user": "用户", "date": "2026-05-24", "note": "验收通过（进货链）"},
    "进货退回": {"user": "用户", "date": "2026-05-24", "note": "验收通过（进货链）"},
    "进货折让": {"user": "用户", "date": "2026-05-24", "note": "验收通过（进货链）"},
    "采购单": {"user": "用户", "date": "2026-05-24", "note": "验收通过"},
    "请购单": {"user": "用户", "date": "2026-05-24", "note": "验收通过"},
    "销货退回": {"user": "用户", "date": "2026-05-24", "note": "验收通过"},
}

# 有新增/修改字段、尚未「字段确认」的菜单 → 生成时状态 = 待确认
PENDING_CHANGE_MENUS: dict[str, str] = {}

# 本期增改字段（可选）：生成时在「本期」表增加「增改」列标记 新增/修改
FIELD_CHANGE_MARK: dict[tuple[str, str], dict[str, str]] = {}

MENUS = [
    {
        "name": "中类",
        "code": "OthHZYQD",
        "tables": [("INDX", "主表")],
        "page_type": "树形档案",
        "route": "/indx",
        "screenshot": "旧ERP文件/截图/基础资料/01中类代号.png",
    },
    {
        "name": "货品",
        "code": "FasECA",
        "tables": [("PRDT", "主表")],
        "page_type": "档案列表",
        "route": "/prdt",
        "screenshot": "旧ERP文件/截图/基础资料/02货品资料.png",
    },
    {
        "name": "客户厂商",
        "code": "FasEA",
        "tables": [("CUST", "主表")],
        "page_type": "档案列表",
        "route": "/cust",
        "screenshot": "旧ERP文件/截图/单据/01商品物料表.png",
        "screenshot_note": "客户截图待补；字段以库为准",
    },
    {
        "name": "部门",
        "code": "FasED",
        "tables": [("DEPT", "主表")],
        "page_type": "树形档案",
        "route": "/dept",
        "screenshot": "旧ERP文件/截图/单据/04部门.png",
    },
    {
        "name": "仓库",
        "code": "FasECB",
        "tables": [("MY_WH", "主表")],
        "page_type": "档案列表",
        "route": "/wh",
        "screenshot": "旧ERP文件/截图/单据/05仓库.png",
    },
    {
        "name": "员工",
        "code": "FasEB",
        "tables": [("SALM", "主表")],
        "page_type": "档案列表",
        "route": "/salm",
        "screenshot": "旧ERP文件/截图/单据/03员工资料.png",
    },
    {
        "name": "受订单",
        "code": "InvAD",
        "tables": [("MF_POS", "表头"), ("TF_POS", "表身")],
        "page_type": "单据",
        "route": "/so",
        "filter": "OS_ID='SO'",
        "screenshot": "旧ERP文件/截图/单据/04受订单.png",
        "txt": "旧ERP文件/04受订单.txt",
    },
    {
        "name": "请购单",
        "code": "InvAQ",
        "tables": [("MF_SQ", "表头"), ("TF_SQ", "表身")],
        "page_type": "单据",
        "route": "/sq",
        "screenshot": "旧ERP文件/截图/单据/02请购单.png",
        "screenshot_note": "表头 MF_SQ + 表身 TF_SQ；转出采购单 InvAF 为二期",
    },
    {
        "name": "采购单",
        "code": "InvAF",
        "tables": [("MF_POS", "表头"), ("TF_POS", "表身")],
        "page_type": "单据",
        "route": "/po",
        "filter": "OS_ID='PO'",
        "screenshot": "旧ERP文件/截图/单据/03采购单.png",
        "screenshot_note": "字段同 InvAD，OS_ID=PO；转入来源请购单等二期",
    },
    {
        "name": "销货单",
        "code": "InvCA",
        "tables": [("MF_PSS", "表头"), ("TF_PSS", "表身")],
        "page_type": "单据",
        "route": "/sa",
        "filter": "PS_ID='SA'",
        "screenshot": "旧ERP文件/截图/单据/05销货单.png",
        "txt": "旧ERP文件/05销货单.txt",
    },
    {
        "name": "销货退回",
        "code": "InvCB",
        "tables": [("MF_PSS", "表头"), ("TF_PSS", "表身")],
        "page_type": "单据",
        "route": "/sb",
        "filter": "PS_ID='SB'",
        "screenshot": "—",
        "screenshot_note": "截图待补；字段与 MF_PSS/TF_PSS 库结构相同，PS_ID=SB",
    },
    {
        "name": "销货折让",
        "code": "InvCC",
        "tables": [("MF_PSS", "表头"), ("TF_PSS", "表身")],
        "page_type": "单据",
        "route": "/invcc",
        "filter": "PS_ID='SD'",
        "screenshot": "—",
        "screenshot_note": "截图待补；字段同 InvCA，PS_ID=SD；转入来源销货单",
    },
    {
        "name": "进货单",
        "code": "InvBA",
        "tables": [("MF_PSS", "表头"), ("TF_PSS", "表身")],
        "page_type": "单据",
        "route": "/pc",
        "filter": "PS_ID='PC'",
        "screenshot": "旧ERP文件/截图/单据/06进货单.png",
        "screenshot_note": "字段同 InvCA，PS_ID=PC；转入来源采购单 InvAF",
    },
    {
        "name": "进货退回",
        "code": "InvBB",
        "tables": [("MF_PSS", "表头"), ("TF_PSS", "表身")],
        "page_type": "单据",
        "route": "/pb",
        "filter": "PS_ID='PB'",
        "screenshot": "—",
        "screenshot_note": "字段同 InvCB，PS_ID=PB；转入来源进货单 InvBA",
    },
    {
        "name": "进货折让",
        "code": "InvBC",
        "tables": [("MF_PSS", "表头"), ("TF_PSS", "表身")],
        "page_type": "单据",
        "route": "/invbc",
        "filter": "PS_ID='PD'",
        "screenshot": "—",
        "screenshot_note": "字段同 InvCC，PS_ID=PD；转入来源进货单 InvBA",
    },
]


# 货品子表 PRDT_PIC（用户确认：图片/CAD 存子表，不占用 PRDT.PIC）
PRDT_PIC_FIELDS = [
    {"fld_name": "PIC", "note": "图片", "fld_type": "G", "fld_len": "0", "ispk": "", "table": "PRDT_PIC"},
    {"fld_name": "CADIMG", "note": "cad 图档", "oral": "上传CAD图", "fld_type": "G", "fld_len": "0", "ispk": "", "table": "PRDT_PIC"},
]

# 用户确认显示名（库注释冲突时，以用户拍板为准，须在口述节记录）
PRDT_DISPLAY_OVERRIDES: dict[str, str] = {
    "USE_PRDMARK": "货品特性",
    "ZC_TYPE": "加工方式",
    "WH_LC": "余料仓库",
}

PRDT_ORAL_ALIASES = [
    ("USE_PRDMARK", "启动特征", "货品特性"),
    ("ZC_TYPE", "周长种类(1.内周长；2.节周长；3.外周长)", "加工方式"),
    ("WH_LC", "在线仓库", "余料仓库"),
    ("CADIMG", "cad 图档", "上传CAD图"),
]
# 截图 / 口述 / 原型页面栏位顺序
SCREEN_ORDER: dict[tuple[str, str], list[str]] = {
    ("中类", "INDX"): ["IDX_NO", "NAME", "IDX_UP", "STOP_DD", "REM"],
    ("部门", "DEPT"): ["DEP", "NAME", "ENG_NAME", "UP", "STOP_DD", "REM"],
    ("仓库", "MY_WH"): ["WH", "NAME", "DEP", "UP_WH", "ADR", "TEL_NO", "STOP_DD", "REM"],
    ("货品", "PRDT"): [
        # 上次总表 15 项 + 2026-05-23 口述补增（顺序：在原有栏位间插入，不删项）
        "IDX1", "PRD_NO", "KND",
        "NAME", "SPC", "SNM", "UT", "UT1",
        "UPR", "UP_SAL", "USE_PRDMARK", "ZC_TYPE",
        "WH", "WH_LC",
        "QTY_MIN", "QTY_LOW",
        "VALID_DAYS", "QTY_MIN1", "QTY_MAX", "STOP_ID", "REM", "SYS_DATE",
        "DEP", "SAL_NO",
    ],
    ("客户厂商", "CUST"): [
        "OBJ_ID", "CUS_NO", "NAME", "SNM", "CUS_ARE", "CNT_MAN1", "CNT_MAN2", "TEL1", "TEL2",
        "UNI_NO", "BIZ_DSC", "FP_NAME", "ADR2", "END_DD", "RTO_TAX", "CUR", "ID1_TAX", "SAL_NO",
        "BNK_NAME", "ID_CODE", "REM",
    ],
    ("员工", "SALM"): [
        "SAL_NO", "NAME", "SEX", "ENG_NAME", "NAME_PY", "POS", "DEP", "UP_SAL_NO",
        "TEL1", "TEL2", "E_MAIL", "CON_ADR", "ID_NUM", "BTH", "DUT_IN_D", "DUT_OT_D", "REM",
    ],
    ("受订单", "MF_POS"): [
        "OS_DD", "OS_NO", "EST_DD", "CUS_NO", "CUS_OS_NO", "SAL_NO", "USE_DEP", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DIS_CNT", "REM", "CLS_MP_ID", "CLS_ID", "AMTN_NET", "TAX",
        "QT_NO", "SEND_MTH", "SEND_WH", "ADR", "PAY_MTH", "PAY_DAYS",
    ],
    ("受订单", "TF_POS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "SUP_PRD_NO", "WH", "QTY", "UT", "UP",
        "AMTN", "TAX", "TAX_RTO", "EST_DD", "REM", "OS_NO", "DIS_CNT", "QTY_PS",
    ],
    ("请购单", "MF_SQ"): [
        "SQ_DD", "SQ_NO", "DEP", "CUS_NO", "SAL_NO", "EST_DD", "REM", "CUR_ID", "PO_DEP",
        "CLS_ID", "PO_NO", "EXC_RTO", "BIL_NO",
    ],
    ("请购单", "TF_SQ"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "UNIT", "QTY", "UP", "AMTN", "EST_DD", "REM",
        "CUS_NO", "CUR_ID", "EXC_RTO", "QTY1", "UP_QTY1", "QTY_PO", "QTY_PO_UNSH", "QTY_QS",
        "QTY_QS_UNSH", "EST_ITM", "BAT_NO", "REMARK", "AMT", "BIL_ID", "BIL_NO", "BIL_ITM",
    ],
    ("采购单", "MF_POS"): [
        "OS_DD", "OS_NO", "EST_DD", "CUS_NO", "CUS_OS_NO", "SAL_NO", "USE_DEP", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DIS_CNT", "REM", "CLS_MP_ID", "CLS_ID", "AMTN_NET", "TAX",
        "QT_NO", "SEND_MTH", "SEND_WH", "ADR", "PAY_MTH", "PAY_DAYS",
    ],
    ("采购单", "TF_POS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "SUP_PRD_NO", "WH", "QTY", "UT", "UP",
        "AMTN", "TAX", "TAX_RTO", "EST_DD", "REM", "OS_NO", "DIS_CNT", "QTY_PS",
    ],
    ("销货单", "MF_PSS"): [
        "PS_DD", "PS_NO", "CUS_NO", "OS_NO", "OS_ID", "CUS_OS_NO", "SAL_NO", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DEP", "DIS_CNT", "ZHANG_ID", "SEND_MTH", "SEND_WH", "ADR",
        "PAY_MTH", "PAY_DAYS", "PAY_DD", "CHK_DD", "INV_NO", "RP_NO", "REM", "AMTN_NET", "TAX",
        "PS_ID", "VOH_NO", "CONTRACT",
    ],
    ("销货单", "TF_PSS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "WH", "QTY", "UT", "UNIT", "UP",
        "AMTN_NET", "TAX", "TAX_RTO", "REM", "EST_DD", "SUP_PRD_NO", "OS_NO", "DIS_CNT", "QTY1",
    ],
    ("销货退回", "MF_PSS"): [
        "PS_DD", "PS_NO", "CUS_NO", "OS_NO", "OS_ID", "CUS_OS_NO", "SAL_NO", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DEP", "DIS_CNT", "REM", "AMTN_NET", "TAX",
    ],
    ("销货退回", "TF_PSS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "WH", "QTY", "UT", "UP",
        "AMTN_NET", "TAX", "OS_NO", "REM", "QTY_RTN",
    ],
    ("销货折让", "MF_PSS"): [
        "PS_DD", "PS_NO", "CUS_NO", "OS_NO", "OS_ID", "CUS_OS_NO", "SAL_NO", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DEP", "DIS_CNT", "ZHANG_ID", "SEND_MTH", "SEND_WH", "ADR",
        "PAY_MTH", "PAY_DAYS", "PAY_DD", "CHK_DD", "INV_NO", "RP_NO", "REM", "AMTN_NET", "TAX",
        "PS_ID", "VOH_NO", "CONTRACT",
    ],
    ("销货折让", "TF_PSS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "WH", "QTY", "UT", "UNIT", "UP",
        "AMTN_NET", "TAX", "TAX_RTO", "REM", "EST_DD", "SUP_PRD_NO", "OS_NO", "DIS_CNT", "QTY1",
    ],
    ("进货单", "MF_PSS"): [
        "PS_DD", "PS_NO", "CUS_NO", "OS_NO", "OS_ID", "CUS_OS_NO", "SAL_NO", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DEP", "DIS_CNT", "ZHANG_ID", "SEND_MTH", "SEND_WH", "ADR",
        "PAY_MTH", "PAY_DAYS", "PAY_DD", "CHK_DD", "INV_NO", "RP_NO", "REM", "AMTN_NET", "TAX",
        "PS_ID", "VOH_NO", "CONTRACT",
    ],
    ("进货单", "TF_PSS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "WH", "QTY", "UT", "UNIT", "UP",
        "AMTN_NET", "TAX", "TAX_RTO", "REM", "EST_DD", "SUP_PRD_NO", "OS_NO", "DIS_CNT", "QTY1",
    ],
    ("进货退回", "MF_PSS"): [
        "PS_DD", "PS_NO", "CUS_NO", "OS_NO", "OS_ID", "CUS_OS_NO", "SAL_NO", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DEP", "DIS_CNT", "REM", "AMTN_NET", "TAX",
    ],
    ("进货退回", "TF_PSS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "WH", "QTY", "UT", "UP",
        "AMTN_NET", "TAX", "OS_NO", "REM", "QTY_RTN",
    ],
    ("进货折让", "MF_PSS"): [
        "PS_DD", "PS_NO", "CUS_NO", "OS_NO", "OS_ID", "CUS_OS_NO", "SAL_NO", "BIL_TYPE",
        "CUR_ID", "TAX_ID", "DEP", "DIS_CNT", "ZHANG_ID", "SEND_MTH", "SEND_WH", "ADR",
        "PAY_MTH", "PAY_DAYS", "PAY_DD", "CHK_DD", "INV_NO", "RP_NO", "REM", "AMTN_NET", "TAX",
        "PS_ID", "VOH_NO", "CONTRACT",
    ],
    ("进货折让", "TF_PSS"): [
        "ITM", "PRD_NO", "PRD_NAME", "PRD_MARK", "WH", "QTY", "UT", "UNIT", "UP",
        "AMTN_NET", "TAX", "TAX_RTO", "REM", "EST_DD", "SUP_PRD_NO", "OS_NO", "DIS_CNT", "QTY1",
    ],
}


def fld_no_int(fld: dict) -> int:
    try:
        return int(fld["fld_no"])
    except (TypeError, ValueError):
        return 999999


def menu_doc_status(menu_name: str) -> tuple[str, str, str, str | None]:
    """返回 (状态, 确认人, 确认日期, 本期变更说明)。"""
    if menu_name in CONFIRMED_MENUS:
        c = CONFIRMED_MENUS[menu_name]
        return (f"**✅ 已确认**", c.get("user", ""), c.get("date", ""), c.get("note"))
    if menu_name in PENDING_CHANGE_MENUS:
        return ("**⏳ 待确认**", "", "", PENDING_CHANGE_MENUS[menu_name])
    return ("草稿", "", "", None)


def sort_fields(menu: dict, table: str, fields: list[dict]) -> list[dict]:
    """本期按 SCREEN_ORDER；未登记顺序的本期字段紧接 SCREEN_ORDER 之后（应尽量避免，见 DEV-02 §8）。"""
    order_list = SCREEN_ORDER.get((menu["name"], table), [])
    order_map = {n: i for i, n in enumerate(order_list)}
    max_ord = len(order_list)

    def sort_key(fld: dict) -> tuple:
        ph = phase(table, fld, menu["name"])
        fn = fld["fld_name"]
        if ph == "二期":
            return (1, fld_no_int(fld), fn)
        if fn in order_map:
            return (0, order_map[fn], fn)
        return (0, max_ord + fld_no_int(fld) / 1000000, fn)

    return sorted(fields, key=sort_key)


def parse_dict() -> dict[str, list[dict]]:
    tables: dict[str, list[dict]] = {}
    for line in DICT.read_text(encoding="gbk").splitlines():
        if not line or line.startswith("TabName") or line.startswith("---"):
            continue
        parts = line.split("|")
        if len(parts) < 7:
            continue
        tab, fld_no, fld_name, fld_type, fld_len, ispk, note = parts[:7]
        tables.setdefault(tab, []).append(
            {
                "fld_no": fld_no,
                "fld_name": fld_name,
                "fld_type": fld_type,
                "fld_len": fld_len,
                "ispk": ispk.strip(),
                "note": note.strip(),
            }
        )
    return tables


def sql_type(fld_type: str, fld_len: str) -> str:
    m = {
        "A": f"varchar({fld_len})" if fld_len else "varchar",
        "N": "numeric",
        "#": "numeric",
        "I": "int",
        "@": "datetime",
        "T": "datetime",
        "S": "smallint",
        "M": "memo",
        "G": "image",
    }
    return m.get(fld_type, fld_type)


def map_component(fld_name: str, fld_type: str, note: str, ispk: str, table: str) -> str:
    if fld_type == "G":
        return "hidden"
    if fld_name in AUTO_NO:
        return "input-readonly"
    if fld_name in ("ITM", "PS_ID", "OS_ID", "MM_ID", "BIL_ID"):
        return "hidden"
    if fld_name == "UP" and fld_type in ("N", "#"):
        return "number"
    if ispk == "*":
        return "input"
    if note and re.search(r"\d+[\.:]", note) and fld_type == "A" and len(note) < 120:
        return "select"
    lookup_fk = {
        "CUS_NO", "PRD_NO", "SAL_NO", "WH", "DEP", "IDX_NO", "IDX1", "IDX2", "IDX_UP",
        "UP_WH", "OS_NO", "BIL_TYPE", "SEND_WH", "USE_DEP", "UP_SAL_NO", "MAS_CUS",
        "SUP1", "SUP2", "CUR_ID",
    }
    if fld_name in lookup_fk or (fld_name.endswith("_NO") and fld_name not in AUTO_NO and fld_type == "A"):
        return "lookup"
    if fld_type in ("@", "T") or (fld_name.endswith("_DD") and fld_type != "S"):
        return "date"
    if fld_type in ("N", "#", "I", "S") or re.match(r"^(AMTN|AMT|QTY|TAX|DIS|RTO|CST|LIM|LS_RTO)", fld_name):
        return "number"
    if fld_type == "M" or fld_name in ("REM", "ADR", "ADR1", "ADR2", "SPC"):
        return "textarea" if fld_type == "M" or fld_name in ("REM", "ADR", "ADR1", "ADR2") else "input"
    if note and re.search(r"\([TF\d]", note):
        return "select"
    if ispk == "*":
        return "input"
    return "input"


def is_phase1(table: str, fld_name: str, menu_key: str | None = None) -> bool:
    fn = fld_name.lower()
    t = table.upper()
    if fn in {x.lower() for x in DBJS_FIELDS.get(t, set())}:
        return True
    extra_key = t
    if menu_key == "销货退回" and t == "MF_PSS":
        extra_key = "MF_PSS_SB"
    if menu_key == "销货折让" and t == "MF_PSS":
        extra_key = "MF_PSS_SD"
    if menu_key == "进货单" and t == "MF_PSS":
        extra_key = "MF_PSS_PC"
    if menu_key == "进货退回" and t == "MF_PSS":
        extra_key = "MF_PSS_PB"
    if menu_key == "进货折让" and t == "MF_PSS":
        extra_key = "MF_PSS_PD"
    if fn in {x.lower() for x in BILL_HEADER_EXTRA.get(extra_key, BILL_HEADER_EXTRA.get(t, set()))}:
        return True
    if t in ARCHIVE_LIST and fn in {x.lower() for x in ARCHIVE_LIST[t]}:
        return True
    if t in ARCHIVE_QUERY and fn in {x.lower() for x in ARCHIVE_QUERY[t]}:
        return True
    # Primary keys and names always phase 1
    if fld_name in ("IDX_NO", "PRD_NO", "CUS_NO", "DEP", "WH", "SAL_NO", "OS_NO", "PS_NO", "SQ_NO", "NAME", "SNM"):
        return True
    return False


def phase(table: str, fld: dict, menu_key: str | None = None) -> str:
    note = fld["note"]
    name = fld["fld_name"]
    if is_phase1(table, name, menu_key):
        return "本期"
    if PHASE2_NOTE.search(note):
        return "二期"
    if PHASE2_NAME.search(name):
        return "二期"
    if BACKWRITE_QTY.match(name) and name not in DBJS_FIELDS.get(table, set()):
        return "二期"
    return "二期"


def yn(v: bool) -> str:
    return "是" if v else "否"


def field_flags(table: str, fld: dict, area: str, menu: dict) -> dict:
    name = fld["fld_name"]
    fn = name.lower()
    t = table.upper()
    ph = phase(t, fld, menu["name"])
    is_pk = fld["ispk"] == "*"
    is_sys = name in SYSTEM_READONLY
    is_bw = bool(BACKWRITE_QTY.match(name))
    is_auto = name in AUTO_NO or name in ("ITM", "PS_ID", "OS_ID")
    comp = map_component(name, fld["fld_type"], fld["note"], fld["ispk"], t)

    page = menu["page_type"]
    if page in ("档案列表", "树形档案"):
        qset = {x.lower() for x in ARCHIVE_QUERY.get(t, set())}
        lset = {x.lower() for x in ARCHIVE_LIST.get(t, set())}
        query = ph == "本期" and fn in qset
        list_ = ph == "本期" and fn in lset
        form = ph == "本期" and not is_sys and comp != "hidden" and not is_bw
    elif area == "表头":
        qset = {x.lower() for x in BILL_SIDEBAR_QUERY.get(t, set())}
        lset = {x.lower() for x in BILL_SIDEBAR_LIST.get(t, set())}
        query = fn in qset
        list_ = fn in lset
        form = ph == "本期" and not is_sys and comp != "hidden" and name not in ("PS_ID", "OS_ID")
    else:  # 表身
        query = False
        list_ = ph == "本期" and (not is_bw or fn in {x.lower() for x in DBJS_FIELDS.get(t, set())})
        form = ph == "本期" and not is_sys and not is_bw and comp != "hidden" and name not in ("PS_ID", "OS_ID", "ITM")

    readonly = is_pk and name in AUTO_NO
    if name in AUTO_NO or is_sys or name in ("PRD_NAME",) or (is_bw and area == "表身"):
        readonly = True
    if is_pk and name not in AUTO_NO and page != "单据":
        readonly = False  # archive PK editable on create
    if is_pk and name not in AUTO_NO and area == "表身" and name == "ITM":
        readonly = True

    required = is_pk and name not in ("ITM", "PS_ID", "OS_ID")
    if name in ("PS_DD", "OS_DD", "CUS_NO", "PRD_NO", "QTY") and ph == "本期":
        required = True

    return {
        "query": yn(query),
        "list": yn(list_),
        "form": yn(form),
        "required": yn(required),
        "readonly": yn(readonly),
        "phase": ph,
        "component": comp,
    }


def display_note(table: str, menu: dict, fld_name: str, db_note: str) -> str:
    if menu["name"] == "货品" and table == "PRDT" and fld_name in PRDT_DISPLAY_OVERRIDES:
        return PRDT_DISPLAY_OVERRIDES[fld_name]
    return db_note


def row_md(
    i: int, fld: dict, table: str, area: str, menu: dict, *, show_change: bool = False
) -> str:
    flags = field_flags(table, fld, area, menu)
    note = display_note(table, menu, fld["fld_name"], fld["note"]).replace("|", "\\|")
    cols = (
        f"| {i} | {fld['fld_name']} | {note} | {sql_type(fld['fld_type'], fld['fld_len'])} "
        f"| {flags['component']} | {flags['query']} | {flags['list']} | {flags['form']} "
        f"| {flags['required']} | {flags['readonly']} | {flags['phase']} |"
    )
    if show_change:
        mark = FIELD_CHANGE_MARK.get((menu["name"], table), {}).get(fld["fld_name"], "")
        return cols + f" {mark} |"
    return cols


def render_field_table(
    fields: list[dict], table: str, area: str, menu: dict, start_no: int = 1, *, phase1: bool = False
) -> tuple[list[str], int]:
    show_change = phase1 and menu["name"] in PENDING_CHANGE_MENUS
    if show_change:
        header_cols = (
            "| # | 字段名 | 中文名称 | 类型 | 组件 | 查询 | 列表 | 表单 | 必填 | 只读 | 阶段 | 增改 |"
            "\n|---|--------|----------|------|------|------|------|------|------|------|------|------|"
        )
    else:
        header_cols = (
            "| # | 字段名 | 中文名称 | 类型 | 组件 | 查询 | 列表 | 表单 | 必填 | 只读 | 阶段 |"
            "\n|---|--------|----------|------|------|------|------|------|------|------|------|"
        )
    lines = [header_cols]
    n = start_no
    for fld in fields:
        lines.append(row_md(n, fld, table, area, menu, show_change=show_change))
        n += 1
    return lines, n


def render_prdt_pic_section(menu: dict) -> list[str]:
    """子表 PRDT_PIC — 用户确认本期字段"""
    lines = [
        "## 子表 — PRDT_PIC（品图片，1:1 PRD_NO）",
        "",
        "> 图片、上传 CAD 图档存子表 `PRDT_PIC`，**不占用** PRDT 主表 `PIC` 列。",
        "> 本期补增，与主表字段一并开发；不删除上次主表 15 项。",
        "",
        "| 序 | 字段名 | 中文名称 | 类型 | 组件 | 查询 | 列表 | 表单 | 必填 | 只读 | 阶段 |",
        "|----|--------|----------|------|------|------|------|------|------|------|------|",
    ]
    for i, fld in enumerate(PRDT_PIC_FIELDS, 1):
        lines.append(
            f"| {i} | {fld['fld_name']} | {fld['note']} | image | upload | 否 | 否 | 是 | 否 | 否 | 本期 |"
        )
    lines.append("")
    return lines


def render_prdt_oral_section() -> list[str]:
    lines = [
        "## 口述补增说明（2026-05-23）",
        "",
        "> **原则：** 在 [菜单字段对照总表](../菜单字段对照总表_待确认.md) §3.2 原 **15 项** 基础上 **新增**，不删除原字段。",
        "> 库注释与您口述不一致时，**已确认项用您拍板显示名**（见上表「中文名称」列）。",
        "",
        "### 主表 PRDT — 本次新增本期字段",
        "",
        "| 字段名 | 库注释 | 界面显示名 | 阶段 |",
        "|--------|--------|------------|------|",
        "| KND | 大类 | 大类 | 本期 |",
        "| UT1 | 副单位 | 副单位 | 本期 |",
        "| UPR | 统一定价 | 统一定价 | 本期 |",
        "| UP_SAL | 业务成本 | 业务成本 | 本期 |",
        "| USE_PRDMARK | 启动特征 | **货品特性** ✅ | 本期 |",
        "| ZC_TYPE | 周长种类(1.内周长；2.节周长；3.外周长) | **加工方式** ✅ | 本期 |",
        "| WH_LC | 在线仓库 | **余料仓库** ✅ | 本期 |",
        "| QTY_MIN | 最小采购量 | 最小采购量 | 本期 |",
        "| QTY_LOW | 批量 | 批量 | 本期 |",
        "",
        "### 子表 PRDT_PIC — 本次新增",
        "",
        "| 字段名 | 库/子表注释 | 界面显示名 | 阶段 |",
        "|--------|-------------|------------|------|",
        "| PIC | 图片 | 图片 | 本期 |",
        "| CADIMG | cad 图档 | cad 图档 ✅ | 本期 |",
        "",
        "### 显示名确认记录",
        "",
        "| 日期 | 字段 | 库注释 | 您确认显示名 |",
        "|------|------|--------|--------------|",
        "| 2026-05-23 | USE_PRDMARK | 启动特征 | 货品特性 |",
        "| 2026-05-23 | ZC_TYPE | 周长种类 | 加工方式 |",
        "| 2026-05-23 | WH_LC | 在线仓库 | 余料仓库 |",
        "| 2026-05-23 | CADIMG | cad 图档 | cad 图档（库注释） |",
        "",
        "### 仍待确认",
        "",
    ]
    pending = []
    for fld, db_note, oral in PRDT_ORAL_ALIASES:
        if fld in PRDT_DISPLAY_OVERRIDES:
            continue
        if db_note != oral:
            pending.append(f"- **{fld}**：库「{db_note}」 vs 口述「{oral}」")
    if pending:
        lines.extend(pending)
    else:
        lines.append("（无）")
    lines.append("")
    return lines


def table_field_sets(
    menu: dict, table: str, all_tables: dict[str, list[dict]]
) -> tuple[list[dict], list[dict], list[dict]]:
    raw = all_tables.get(table, [])
    sorted_fields = sort_fields(menu, table, raw)
    p1 = [f for f in sorted_fields if phase(table, f, menu["name"]) == "本期"]
    p2 = [f for f in sorted_fields if phase(table, f, menu["name"]) == "二期"]
    return sorted_fields, p1, p2


def render_bill_field_sections(menu: dict, all_tables: dict[str, list[dict]]) -> list[str]:
    """单据：本期表头 → 本期表身 → 二期（表头+表身均置后）。"""
    lines: list[str] = []
    tables_data: list[tuple[str, str, list[dict], list[dict], list[dict]]] = []
    for table, area in menu["tables"]:
        sorted_fields, p1, p2 = table_field_sets(menu, table, all_tables)
        tables_data.append((table, area, sorted_fields, p1, p2))

    total = sum(len(t[2]) for t in tables_data)
    total_p1 = sum(len(t[3]) for t in tables_data)
    total_p2 = sum(len(t[4]) for t in tables_data)
    lines += [
        "## 字段概览",
        "",
        f"共 **{total}** 个字段（库全量）；本期 **{total_p1}** · 二期 **{total_p2}**（表头+表身）。",
        "",
        "| 区域 | 表 | 本期 | 二期 | 合计 |",
        "|------|-----|------|------|------|",
    ]
    for table, area, sorted_fields, p1, p2 in tables_data:
        lines.append(f"| {area} | {table} | {len(p1)} | {len(p2)} | {len(sorted_fields)} |")
    lines += [
        "",
        "## 本期",
        "",
        "> 顺序：**表头 → 表身**（各小节内按截图/口述栏位顺序）。",
        "",
    ]
    for table, area, _sorted_fields, p1, _p2 in tables_data:
        lines += [f"### {area} — {table}", "", f"本期 **{len(p1)}** 项。", ""]
        if p1:
            tbl_lines, _ = render_field_table(p1, table, area, menu, 1, phase1=True)
            lines.extend(tbl_lines)
        else:
            lines.append("（无）")
        lines.append("")

    lines += [
        "## 二期（库顺序，置后）",
        "",
        "> 表头、表身二期字段均置后；各表内按库 FLD_NO 顺序。",
        "",
    ]
    for table, area, _sorted_fields, _p1, p2 in tables_data:
        lines += [f"### {area} — {table}", "", f"二期 **{len(p2)}** 项。", ""]
        if p2:
            tbl_lines, _ = render_field_table(p2, table, area, menu, 1)
            lines.extend(tbl_lines)
        else:
            lines.append("（无）")
        lines.append("")
    return lines


def render_archive_field_sections(menu: dict, all_tables: dict[str, list[dict]]) -> list[str]:
    """档案/树形：单表本期 → 二期。"""
    lines: list[str] = []
    for table, area in menu["tables"]:
        sorted_fields, p1, p2 = table_field_sets(menu, table, all_tables)
        lines += [
            f"## {area} — {table}",
            "",
            f"共 **{len(sorted_fields)}** 个字段（库全量）；本期 **{len(p1)}** · 二期 **{len(p2)}**。",
            "",
            "### 本期字段（截图/口述顺序）",
            "",
        ]
        if p1:
            tbl_lines, _ = render_field_table(p1, table, area, menu, 1, phase1=True)
            lines.extend(tbl_lines)
        else:
            lines.append("（无）")
        lines += ["", "### 二期字段（库顺序，置后）", ""]
        if p2:
            tbl_lines, _ = render_field_table(p2, table, area, menu, len(p1) + 1)
            lines.extend(tbl_lines)
        else:
            lines.append("（无）")
        lines.append("")
    return lines


def render_menu(menu: dict, all_tables: dict[str, list[dict]]) -> str:
    sort_note = (
        "> **排序（单据）：本期表头 → 本期表身 → 二期（表头+表身均置后）。**"
        if menu["page_type"] == "单据"
        else "> **排序（档案/单表）：本期 → 二期（库 FLD_NO 顺序）。**"
    )
    lines = [
        f"# 字段对照 — {menu['name']}（{menu['code']}）",
        "",
        "> 数据源：SunSystem DICT_FLD（`dict_fld_keep44.txt`）为主；截图仅参考。",
        "> 中文标签默认来自库注释；**用户确认显示名**见各菜单「显示名确认记录」。",
        sort_note,
        "> **增改约定（DEV-02 §8）：新增/修改字段一律「本期」，按 SCREEN_ORDER 插入对应序位，状态改「待确认」，禁止追加在本期表格末尾。**",
        "",
        "## 文件头",
        "",
        "| 项 | 值 |",
        "|----|-----|",
        f"| 菜单代码 | {menu['code']} |",
    ]
    if menu["page_type"] == "单据":
        hdr, body = menu["tables"]
        lines.append(f"| 表头表 | {hdr[0]}（{menu.get('filter', '')}） |")
        lines.append(f"| 表身表 | {body[0]} |")
    else:
        lines.append(f"| 主表 | {menu['tables'][0][0]} |")
    lines.append(f"| 页面类型 | {menu['page_type']} |")
    lines.append(f"| 路由 | {menu['route']} |")
    lines.append(f"| 截图 | {menu.get('screenshot', '—')} |")
    if menu.get("screenshot_note"):
        lines.append(f"| 截图说明 | {menu['screenshot_note']} |")
    if menu.get("txt"):
        lines.append(f"| 口述 | {menu['txt']} |")
    version = "v1.2" if menu["name"] == "货品" else "v1.1"
    lines.append(f"| 对照表版本 | {version} |")
    status, conf_user, conf_date, change_note = menu_doc_status(menu["name"])
    if change_note and menu["name"] in PENDING_CHANGE_MENUS:
        lines.append(f"| 本期变更 | {change_note} |")
    lines.append(f"| 状态 | {status} |")
    lines.append(f"| 确认人 | {conf_user} |")
    lines.append(f"| 确认日期 | {conf_date} |")
    lines += [
        "",
        "## 列说明",
        "",
        "| 列 | 含义 |",
        "|----|------|",
        "| 字段名 | 数据库物理字段 |",
        "| 中文名称 | DICT_FLD.NOTE（库注释） |",
        "| 类型 | 库字段类型 |",
        "| 组件 | Element Plus 组件映射（DEV-00 §4.3） |",
        "| 查询 | 是否出现在查询区 |",
        "| 列表 | 是否出现在列表/侧栏/表身列 |",
        "| 表单 | 是否出现在弹窗/表头/表身编辑 |",
        "| 必填 | 存盘校验 |",
        "| 只读 | 不可编辑 |",
        "| 阶段 | 本期 / 二期 |",
        "| 增改 | 仅「待确认」菜单的本期表出现：新增 / 修改 |",
        "",
        "> **档案类：** 查询/列表按 DEV-02 §10 + DEV-04 §12（非全部本期上屏）。",
        "",
    ]

    if menu["page_type"] == "单据":
        lines += render_bill_field_sections(menu, all_tables)
    else:
        lines += render_archive_field_sections(menu, all_tables)

    if menu["name"] == "货品":
        lines += render_prdt_pic_section(menu)
        lines += render_prdt_oral_section()

    if menu["page_type"] == "单据":
        lines += bill_extra_sections(menu)

    lines += [
        "## 审阅检查清单",
        "",
        "- [ ] 中文名称与库一致",
        "- [ ] 「本期」字段覆盖截图主要栏位",
        "- [ ] 「二期」字段同意延后",
        "- [ ] 查询/列表/表单标记符合 DEV-04",
        "",
        f"**文件头状态改为「已确认」即表示本菜单对照表全部确认。**",
        "",
    ]
    return "\n".join(lines)


def bill_extra_sections(menu: dict) -> list[str]:
    name = menu["name"]
    lines = ["## 单据专用规则", ""]
    if name == "受订单":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 说明 |",
            "|--------|------|------|------|",
            "| 询价/报价等 | — | 待确认 | 二期 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 销货单存盘 | TF_POS | QTY_PS | += 销货数量 |",
            "",
        ]
    elif name == "销货单":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 带入 |",
            "|--------|------|------|------|",
            "| 受订单 | InvAD | 客户相同且未交完 | 表头客户/业务员/币别；表身品号/未交量 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 存盘 | TF_POS | QTY_PS | += 表身数量 |",
            "",
            "### 计算规则",
            "",
            "| 项目 | 说明 |",
            "|------|------|",
            "| 表身未税 | 数量 × 单价，按扣税类别拆税 |",
            "| 表头合计 | 表身汇总 |",
            "",
        ]
    elif name == "销货折让":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 带入 |",
            "|--------|------|------|------|",
            "| 销货单 | InvCA | 客户相同 | 表头客户/业务员/币别；表身品号/数量/单价 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 存盘 | — | — | 首期不回写库存（纯折让金额） |",
            "",
            "### 计算规则",
            "",
            "| 项目 | 说明 |",
            "|------|------|",
            "| 表身未税 | 数量 × 单价，按扣税类别拆税 |",
            "| 表头合计 | 表身汇总 |",
            "",
        ]
    elif name == "销货退回":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 说明 |",
            "|--------|------|------|------|",
            "| 销货单 | InvCA | 待确认 | 从销货单转入 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 存盘 | TF_PSS / 库存 | QTY_RTN 等 | 待确认 |",
            "",
        ]
    elif name == "请购单":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 说明 |",
            "|--------|------|------|------|",
            "| 受订单等 | — | 待确认 | 二期 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 采购单存盘 | TF_SQ | QTY_PO | += 采购数量（二期） |",
            "",
            "### 计算规则",
            "",
            "| 项目 | 说明 |",
            "|------|------|",
            "| 表身金额 | 数量 × 单价，金额精度 2 |",
            "| 表头合计 | 表身 AMTN 汇总 |",
            "",
        ]
    elif name == "采购单":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 说明 |",
            "|--------|------|------|------|",
            "| 请购单 | InvAQ | 厂商相同且未转完 | 表头厂商/请购人/币别；表身品号/未转量（二期） |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 进货单存盘 | TF_POS | QTY_PS | += 进货数量 |",
            "",
            "### 计算规则",
            "",
            "| 项目 | 说明 |",
            "|------|------|",
            "| 表身未税 | 数量 × 单价，按扣税类别拆税 |",
            "| 表头合计 | 表身汇总 |",
            "",
        ]
    elif name == "进货单":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 带入 |",
            "|--------|------|------|------|",
            "| 采购单 | InvAF | 厂商相同且未交完 | 表头厂商/业务员/币别；表身品号/未交量 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 存盘 | TF_POS | QTY_PS | += 表身数量 |",
            "",
            "### 计算规则",
            "",
            "| 项目 | 说明 |",
            "|------|------|",
            "| 表身未税 | 数量 × 单价，按扣税类别拆税 |",
            "| 表头合计 | 表身汇总 |",
            "",
        ]
    elif name == "进货折让":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 带入 |",
            "|--------|------|------|------|",
            "| 进货单 | InvBA | 厂商相同 | 表头厂商/业务员/币别；表身品号/数量/单价 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 存盘 | — | — | 首期不回写库存（纯折让金额） |",
            "",
            "### 计算规则",
            "",
            "| 项目 | 说明 |",
            "|------|------|",
            "| 表身未税 | 数量 × 单价，按扣税类别拆税 |",
            "| 表头合计 | 表身汇总 |",
            "",
        ]
    elif name == "进货退回":
        lines += [
            "### 转入规则",
            "",
            "| 来源单 | 菜单 | 条件 | 说明 |",
            "|--------|------|------|------|",
            "| 进货单 | InvBA | 待确认 | 从进货单转入 |",
            "",
            "### 回写规则",
            "",
            "| 触发 | 更新表 | 字段 | 规则 |",
            "|------|--------|------|------|",
            "| 存盘 | TF_PSS / 库存 | QTY_RTN 等 | 待确认 |",
            "",
        ]
    lines += [
        "### 按钮与操作",
        "",
        "| 按钮 | 阶段 | 说明 |",
        "|------|------|------|",
        "| 新增 | 本期 | |",
        "| 存盘 | 本期 | |",
        "| 转入 | 本期 | 见上表 |",
        "| 附件 | 二期 | |",
        "| 导出 | 二期 | |",
        "",
    ]
    return lines


def main(names: list[str] | None = None) -> None:
    all_tables = parse_dict()
    OUT.mkdir(parents=True, exist_ok=True)
    for menu in MENUS:
        if names and menu["name"] not in names:
            continue
        content = render_menu(menu, all_tables)
        path = OUT / f"{menu['name']}.md"
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path.name} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    import sys

    main(sys.argv[1:] if len(sys.argv) > 1 else None)
