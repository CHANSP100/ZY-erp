"""本地配置默认值与持久化。"""
from __future__ import annotations

import json
from pathlib import Path

APP_NAME = 'TF_MP2 视图数据维护'
VIEW_NAME = 'VIEW_TF_MP2'
TABLE_NAME = 'TF_MP2'
CONFIG_FILE = Path(__file__).resolve().parent / 'login_config.json'

DEFAULTS = {
    'server': '127.0.0.1',
    'port': '1433',
    'database': 'DB_11',
    'user': 'SA1',
    'password': '2285',
}

# 视图下拉字段名（优先中文列名，否则回退物理字段）
MP_NO_CANDIDATES = ('分析单号', 'MP_NO', 'mp_no')
SO_NO_CANDIDATES = ('订单号', 'SO_NO', 'so_no')
KEY_MP_NO = 'MP_NO'
KEY_ITM = 'ITM'
CHK_FIELD = 'PRD_NO_CHG'


def load_saved_login() -> dict:
    if not CONFIG_FILE.exists():
        return dict(DEFAULTS)
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding='utf-8'))
        merged = dict(DEFAULTS)
        merged.update({k: v for k, v in data.items() if k in DEFAULTS})
        return merged
    except Exception:
        return dict(DEFAULTS)


def save_login(cfg: dict) -> None:
    payload = {k: cfg.get(k, DEFAULTS[k]) for k in DEFAULTS}
    CONFIG_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
