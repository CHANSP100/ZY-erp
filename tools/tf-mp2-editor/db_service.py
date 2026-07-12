"""MSSQL 访问：VIEW_TF_MP2 查询与 TF_MP2 更新/删除。"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pyodbc

from config import (
    CHK_FIELD,
    KEY_ITM,
    KEY_MP_NO,
    MP_NO_CANDIDATES,
    SO_NO_CANDIDATES,
    TABLE_NAME,
    VIEW_NAME,
)


@dataclass
class DbConfig:
    server: str
    port: str
    database: str
    user: str
    password: str

    def connection_string(self) -> str:
        host = self.server.strip()
        port = str(self.port or '').strip()
        if port and ',' not in host and '\\' not in host:
            host = f'{host},{port}'
        return (
            'DRIVER={ODBC Driver 17 for SQL Server};'
            f'SERVER={host};'
            f'DATABASE={self.database};'
            f'UID={self.user};'
            f'PWD={self.password};'
            'TrustServerCertificate=yes;'
        )


class DatabaseError(Exception):
    pass


def _pick_column(columns: list[str], candidates: tuple[str, ...]) -> str | None:
    lower_map = {c.lower(): c for c in columns}
    for name in candidates:
        if name.lower() in lower_map:
            return lower_map[name.lower()]
    return None


class DbService:
    def __init__(self, cfg: DbConfig):
        self.cfg = cfg
        self._columns: list[str] = []
        self.mp_no_col: str | None = None
        self.so_no_col: str | None = None
        self.key_mp_col: str | None = None
        self.key_itm_col: str | None = None
        self.chk_col: str | None = None

    def connect(self) -> pyodbc.Connection:
        drivers = [
            'ODBC Driver 18 for SQL Server',
            'ODBC Driver 17 for SQL Server',
            'ODBC Driver 13 for SQL Server',
            'SQL Server',
        ]
        last_err: Exception | None = None
        base = self.cfg.connection_string()
        for drv in drivers:
            try:
                conn_str = base.replace('ODBC Driver 17 for SQL Server', drv)
                return pyodbc.connect(conn_str, timeout=8)
            except Exception as e:
                last_err = e
        raise DatabaseError(f'无法连接数据库：{last_err}')

    def test_connection(self) -> None:
        conn = self.connect()
        conn.close()

    def _load_view_columns(self, conn: pyodbc.Connection) -> list[str]:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS c
            WHERE c.TABLE_NAME = ?
            ORDER BY c.ORDINAL_POSITION
            """,
            VIEW_NAME,
        )
        cols = [row[0] for row in cur.fetchall()]
        if not cols:
            cur.execute(f'SELECT TOP 0 * FROM {VIEW_NAME}')
            cols = [d[0] for d in cur.description]
        if not cols:
            raise DatabaseError(f'视图 {VIEW_NAME} 不存在或无法读取列信息')
        return cols

    def init_metadata(self) -> None:
        conn = self.connect()
        try:
            self._columns = self._load_view_columns(conn)
            self.mp_no_col = _pick_column(self._columns, MP_NO_CANDIDATES)
            self.so_no_col = _pick_column(self._columns, SO_NO_CANDIDATES)
            self.key_mp_col = _pick_column(self._columns, (KEY_MP_NO, 'mp_no'))
            self.key_itm_col = _pick_column(self._columns, (KEY_ITM, 'itm'))
            self.chk_col = _pick_column(self._columns, (CHK_FIELD, 'prd_no_chg'))
            if not self.mp_no_col:
                raise DatabaseError('视图中未找到「分析单号」或 MP_NO 字段')
            if not self.so_no_col:
                raise DatabaseError('视图中未找到「订单号」或 SO_NO 字段')
            if not self.key_mp_col or not self.key_itm_col:
                raise DatabaseError('视图中未找到 MP_NO / ITM 关联字段，无法回写 TF_MP2')
            if not self.chk_col:
                raise DatabaseError('视图中未找到 PRD_NO_CHG 字段')
        finally:
            conn.close()

    @property
    def display_columns(self) -> list[str]:
        """表格展示列：用「选择」代替 PRD_NO_CHG 原列。"""
        out: list[str] = []
        for col in self._columns:
            if col == self.chk_col:
                out.append('__CHK__')
            else:
                out.append(col)
        return out

    def column_label(self, col: str) -> str:
        if col == '__CHK__':
            return '选择'
        return col

    def fetch_distinct_mp_nos(self) -> list[str]:
        conn = self.connect()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""
                SELECT DISTINCT CAST([{self.mp_no_col}] AS nvarchar(100)) AS v
                FROM {VIEW_NAME}
                WHERE [{self.mp_no_col}] IS NOT NULL AND CAST([{self.mp_no_col}] AS nvarchar(100)) <> ''
                ORDER BY v
                """
            )
            return [str(r[0]).strip() for r in cur.fetchall() if r[0] is not None]
        finally:
            conn.close()

    def fetch_distinct_so_nos(self) -> list[str]:
        conn = self.connect()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""
                SELECT DISTINCT CAST([{self.so_no_col}] AS nvarchar(100)) AS v
                FROM {VIEW_NAME}
                WHERE [{self.so_no_col}] IS NOT NULL AND CAST([{self.so_no_col}] AS nvarchar(100)) <> ''
                ORDER BY v
                """
            )
            return [str(r[0]).strip() for r in cur.fetchall() if r[0] is not None]
        finally:
            conn.close()

    def query_rows(self, mp_no: str | None, so_no: str | None) -> list[dict[str, Any]]:
        conn = self.connect()
        try:
            where: list[str] = []
            params: list[Any] = []
            if mp_no:
                where.append(f'CAST([{self.mp_no_col}] AS nvarchar(100)) = ?')
                params.append(mp_no)
            if so_no:
                where.append(f'CAST([{self.so_no_col}] AS nvarchar(100)) = ?')
                params.append(so_no)
            sql = f'SELECT * FROM {VIEW_NAME}'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += f' ORDER BY [{self.key_mp_col}], [{self.key_itm_col}]'
            cur = conn.cursor()
            cur.execute(sql, params)
            rows: list[dict[str, Any]] = []
            for rec in cur.fetchall():
                item = {col: rec[idx] for idx, col in enumerate(self._columns)}
                rows.append(item)
            return rows
        finally:
            conn.close()

    def delete_rows(self, keys: list[tuple[Any, Any]]) -> int:
        if not keys:
            return 0
        conn = self.connect()
        try:
            cur = conn.cursor()
            deleted = 0
            for mp_no, itm in keys:
                cur.execute(
                    f'DELETE FROM {TABLE_NAME} WHERE [{KEY_MP_NO}] = ? AND [{KEY_ITM}] = ?',
                    mp_no,
                    itm,
                )
                deleted += cur.rowcount
            conn.commit()
            return deleted
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def update_prd_no_chg(self, mp_no: Any, itm: Any, value: str) -> None:
        conn = self.connect()
        try:
            cur = conn.cursor()
            cur.execute(
                f'UPDATE {TABLE_NAME} SET [{CHK_FIELD}] = ? WHERE [{KEY_MP_NO}] = ? AND [{KEY_ITM}] = ?',
                value,
                mp_no,
                itm,
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def is_checked(val: Any) -> bool:
        if val is None:
            return False
        return str(val).strip() != ''

    @staticmethod
    def checked_value(original: Any, want_checked: bool) -> str:
        if want_checked:
            if original is not None and str(original).strip():
                return str(original).strip()
            return 'Y'
        return ''
