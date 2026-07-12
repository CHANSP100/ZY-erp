"""主界面：查询、勾选 PRD_NO_CHG、标记删除、保存回写 TF_MP2。"""
from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk
from typing import Any

from config import APP_NAME
from db_service import DatabaseError, DbService


def _fmt(val: Any) -> str:
    if val is None:
        return ''
    if hasattr(val, 'isoformat'):
        try:
            return val.isoformat(sep=' ', timespec='seconds')
        except Exception:
            return str(val)
    return str(val)


class RowState:
    def __init__(self, raw: dict[str, Any], svc: DbService):
        self.raw = raw
        self.svc = svc
        orig = raw.get(svc.chk_col)
        self.orig_checked = svc.is_checked(orig)
        self.checked = self.orig_checked
        self.orig_prd_no_chg = _fmt(orig)
        self.delete_mark = False

    @property
    def mp_no(self):
        return self.raw.get(self.svc.key_mp_col)

    @property
    def itm(self):
        return self.raw.get(self.svc.key_itm_col)

    def checkbox_dirty(self) -> bool:
        return self.checked != self.orig_checked

    def display_values(self, columns: list[str]) -> tuple[str, ...]:
        vals: list[str] = []
        for col in columns:
            if col == '__CHK__':
                vals.append('☑' if self.checked else '☐')
            else:
                vals.append(_fmt(self.raw.get(col)))
        return tuple(vals)


class MainWindow(ttk.Frame):
    def __init__(self, master: tk.Tk, svc: DbService):
        super().__init__(master, padding=8)
        self.master = master
        self.svc = svc
        self.rows: list[RowState] = []
        self.filtered_indices: list[int] = []
        self.sort_col: str | None = None
        self.sort_reverse = False

        self.mp_var = tk.StringVar()
        self.so_var = tk.StringVar()
        self.global_filter_var = tk.StringVar()

        self._build_ui()
        self.pack(fill='both', expand=True)
        self._reload_dropdowns()
        self._query()

    def _build_ui(self) -> None:
        top = ttk.LabelFrame(self, text='查询条件', padding=8)
        top.pack(fill='x')

        ttk.Label(top, text='分析单号').grid(row=0, column=0, sticky='w', padx=(0, 6))
        self.mp_combo = ttk.Combobox(top, textvariable=self.mp_var, width=28, state='readonly')
        self.mp_combo.grid(row=0, column=1, sticky='w', padx=(0, 16))
        self.mp_combo.bind('<<ComboboxSelected>>', lambda _e: None)

        ttk.Label(top, text='订单号').grid(row=0, column=2, sticky='w', padx=(0, 6))
        self.so_combo = ttk.Combobox(top, textvariable=self.so_var, width=28, state='readonly')
        self.so_combo.grid(row=0, column=3, sticky='w')

        btns = ttk.Frame(top)
        btns.grid(row=0, column=4, sticky='e', padx=(16, 0))
        ttk.Button(btns, text='查询', command=self._query).pack(side='left', padx=4)
        ttk.Button(btns, text='删除', command=self._mark_delete).pack(side='left', padx=4)
        ttk.Button(btns, text='保存', command=self._save).pack(side='left', padx=4)

        top.columnconfigure(4, weight=1)

        hint = ttk.Label(
            self,
            text='说明：仅「选择」列可编辑（对应 PRD_NO_CHG，非空即勾选）；选中行点「删除」仅打删除标记，点「保存」后从 TF_MP2 物理删除并刷新。',
            wraplength=980,
        )
        hint.pack(fill='x', pady=(8, 4))

        table_wrap = ttk.Frame(self)
        table_wrap.pack(fill='both', expand=True, pady=(4, 0))

        cols = self.svc.display_columns
        self.tree = ttk.Treeview(table_wrap, columns=cols, show='headings', selectmode='browse')
        vsb = ttk.Scrollbar(table_wrap, orient='vertical', command=self.tree.yview)
        hsb = ttk.Scrollbar(table_wrap, orient='horizontal', command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self.tree.grid(row=0, column=0, sticky='nsew')
        vsb.grid(row=0, column=1, sticky='ns')
        hsb.grid(row=1, column=0, sticky='ew')
        table_wrap.rowconfigure(0, weight=1)
        table_wrap.columnconfigure(0, weight=1)

        for col in cols:
            label = self.svc.column_label(col)
            self.tree.heading(col, text=label, command=lambda c=col: self._sort_by(c))
            width = 70 if col == '__CHK__' else 120
            self.tree.column(col, width=width, anchor='center' if col == '__CHK__' else 'w')

        self.tree.bind('<Button-1>', self._on_tree_click)
        self.tree.tag_configure('deleted', background='#ffd6d6')
        self.tree.tag_configure('dirty', background='#fff3cd')

        filt = ttk.Frame(self)
        filt.pack(fill='x', pady=(8, 0))
        ttk.Label(filt, text='快速筛选').pack(side='left')
        ent = ttk.Entry(filt, textvariable=self.global_filter_var, width=40)
        ent.pack(side='left', padx=6)
        ent.bind('<Return>', lambda _e: self._apply_filter())
        ttk.Button(filt, text='应用', command=self._apply_filter).pack(side='left', padx=4)
        ttk.Button(filt, text='清除', command=self._clear_filter).pack(side='left')
        ttk.Label(filt, text='（匹配任意栏位；点击列标题排序）').pack(side='left', padx=8)

        status = ttk.Label(self, text='')
        status.pack(fill='x', pady=(6, 0))
        self.status = status

    def _reload_dropdowns(self) -> None:
        try:
            mp_list = [''] + self.svc.fetch_distinct_mp_nos()
            so_list = [''] + self.svc.fetch_distinct_so_nos()
            self.mp_combo['values'] = mp_list
            self.so_combo['values'] = so_list
            if self.mp_var.get() not in mp_list:
                self.mp_var.set('')
            if self.so_var.get() not in so_list:
                self.so_var.set('')
        except Exception as e:
            messagebox.showerror('错误', f'加载下拉数据失败：{e}')

    def _query(self) -> None:
        mp_no = self.mp_var.get().strip() or None
        so_no = self.so_var.get().strip() or None
        try:
            raw_rows = self.svc.query_rows(mp_no, so_no)
            self.rows = [RowState(r, self.svc) for r in raw_rows]
            self.sort_col = None
            self.sort_reverse = False
            self._apply_filter()
            self.status.config(text=f'共 {len(self.rows)} 行')
        except Exception as e:
            messagebox.showerror('查询失败', str(e))

    def _apply_filter(self) -> None:
        kw = self.global_filter_var.get().strip().lower()
        indices = []
        for i, row in enumerate(self.rows):
            if not kw:
                indices.append(i)
                continue
            text = ' '.join(row.display_values(self.svc.display_columns)).lower()
            if kw in text:
                indices.append(i)
        self.filtered_indices = indices
        self._render_tree()

    def _clear_filter(self) -> None:
        self.global_filter_var.set('')
        self._apply_filter()

    def _render_tree(self) -> None:
        self.tree.delete(*self.tree.get_children())
        cols = self.svc.display_columns
        for idx in self.filtered_indices:
            row = self.rows[idx]
            tags: list[str] = []
            if row.delete_mark:
                tags.append('deleted')
            elif row.checkbox_dirty():
                tags.append('dirty')
            self.tree.insert('', 'end', iid=str(idx), values=row.display_values(cols), tags=tags)

    def _sort_by(self, col: str) -> None:
        if self.sort_col == col:
            self.sort_reverse = not self.sort_reverse
        else:
            self.sort_col = col
            self.sort_reverse = False

        def key_fn(i: int):
            row = self.rows[i]
            if col == '__CHK__':
                return 1 if row.checked else 0
            return _fmt(row.raw.get(col)).lower()

        self.filtered_indices.sort(key=key_fn, reverse=self.sort_reverse)
        self._render_tree()

    def _selected_row_index(self) -> int | None:
        sel = self.tree.selection()
        if not sel:
            return None
        return int(sel[0])

    def _on_tree_click(self, event) -> None:
        region = self.tree.identify('region', event.x, event.y)
        if region != 'cell':
            return
        col_id = self.tree.identify_column(event.x)
        row_id = self.tree.identify_row(event.y)
        if not row_id or not col_id:
            return
        col_index = int(col_id.replace('#', '')) - 1
        cols = self.svc.display_columns
        if col_index < 0 or col_index >= len(cols) or cols[col_index] != '__CHK__':
            return
        idx = int(row_id)
        row = self.rows[idx]
        if row.delete_mark:
            return
        row.checked = not row.checked
        self.tree.item(row_id, values=row.display_values(cols))
        tags: list[str] = []
        if row.delete_mark:
            tags.append('deleted')
        elif row.checkbox_dirty():
            tags.append('dirty')
        self.tree.item(row_id, tags=tags)

    def _mark_delete(self) -> None:
        idx = self._selected_row_index()
        if idx is None:
            messagebox.showwarning('提示', '请先选中要删除的行')
            return
        row = self.rows[idx]
        row.delete_mark = True
        self._render_tree()
        self.tree.selection_set(str(idx))

    def _save(self) -> None:
        to_delete = [(r.mp_no, r.itm) for r in self.rows if r.delete_mark]
        to_update = [r for r in self.rows if r.checkbox_dirty() and not r.delete_mark]

        if not to_delete and not to_update:
            messagebox.showinfo('提示', '没有待保存的变更')
            return

        msg = []
        if to_update:
            msg.append(f'更新 PRD_NO_CHG：{len(to_update)} 行')
        if to_delete:
            msg.append(f'删除 TF_MP2：{len(to_delete)} 行')
        if not messagebox.askyesno('确认保存', '\n'.join(msg) + '\n\n是否继续？'):
            return

        try:
            for row in to_update:
                new_val = self.svc.checked_value(row.raw.get(self.svc.chk_col), row.checked)
                self.svc.update_prd_no_chg(row.mp_no, row.itm, new_val)
            deleted = self.svc.delete_rows(to_delete)
            messagebox.showinfo('成功', f'已更新 {len(to_update)} 行，已删除 {deleted} 行')
            self._reload_dropdowns()
            self._query()
        except DatabaseError as e:
            messagebox.showerror('保存失败', str(e))
        except Exception as e:
            messagebox.showerror('保存失败', str(e))


def open_main_window(master: tk.Tk, svc: DbService) -> None:
    for child in master.winfo_children():
        child.destroy()
    master.title(APP_NAME)
    MainWindow(master, svc)
