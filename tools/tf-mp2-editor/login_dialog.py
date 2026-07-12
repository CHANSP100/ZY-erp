"""数据库登录对话框。"""
from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk

from config import APP_NAME, load_saved_login, save_login
from db_service import DatabaseError, DbConfig, DbService


class LoginDialog(tk.Toplevel):
    def __init__(self, master: tk.Tk):
        super().__init__(master)
        self.title(f'{APP_NAME} - 登录')
        self.resizable(False, False)
        self.result: DbConfig | None = None

        saved = load_saved_login()
        self.vars = {
            'server': tk.StringVar(value=saved['server']),
            'port': tk.StringVar(value=saved.get('port', '1433')),
            'database': tk.StringVar(value=saved['database']),
            'user': tk.StringVar(value=saved['user']),
            'password': tk.StringVar(value=saved['password']),
            'remember': tk.BooleanVar(value=True),
        }

        frm = ttk.Frame(self, padding=16)
        frm.grid(row=0, column=0, sticky='nsew')

        fields = [
            ('服务器地址', 'server'),
            ('端口', 'port'),
            ('数据库名', 'database'),
            ('用户名', 'user'),
            ('密码', 'password'),
        ]
        for i, (label, key) in enumerate(fields):
            ttk.Label(frm, text=label).grid(row=i, column=0, sticky='w', pady=4)
            show = '*' if key == 'password' else None
            ent = ttk.Entry(frm, textvariable=self.vars[key], width=36, show=show)
            ent.grid(row=i, column=1, sticky='ew', pady=4)
            if i == 0:
                ent.focus_set()

        ttk.Checkbutton(frm, text='记住连接信息（密码明文保存在本机）', variable=self.vars['remember']).grid(
            row=len(fields), column=0, columnspan=2, sticky='w', pady=(8, 4)
        )

        btns = ttk.Frame(frm)
        btns.grid(row=len(fields) + 1, column=0, columnspan=2, sticky='e', pady=(12, 0))
        ttk.Button(btns, text='取消', command=self._cancel).pack(side='right', padx=(8, 0))
        ttk.Button(btns, text='测试连接', command=self._test).pack(side='right', padx=(8, 0))
        ttk.Button(btns, text='登录', command=self._login).pack(side='right')

        self.bind('<Return>', lambda _e: self._login())
        self.protocol('WM_DELETE_WINDOW', self._cancel)
        self.grab_set()
        self.transient(master)

    def _build_cfg(self) -> DbConfig:
        return DbConfig(
            server=self.vars['server'].get().strip(),
            port=self.vars['port'].get().strip(),
            database=self.vars['database'].get().strip(),
            user=self.vars['user'].get().strip(),
            password=self.vars['password'].get(),
        )

    def _test(self) -> None:
        cfg = self._build_cfg()
        if not cfg.server or not cfg.database or not cfg.user:
            messagebox.showwarning('提示', '请填写服务器、数据库名和用户名', parent=self)
            return
        try:
            DbService(cfg).test_connection()
            messagebox.showinfo('成功', '数据库连接成功', parent=self)
        except DatabaseError as e:
            messagebox.showerror('连接失败', str(e), parent=self)
        except Exception as e:
            messagebox.showerror('连接失败', str(e), parent=self)

    def _login(self) -> None:
        cfg = self._build_cfg()
        if not cfg.server or not cfg.database or not cfg.user:
            messagebox.showwarning('提示', '请填写服务器、数据库名和用户名', parent=self)
            return
        try:
            svc = DbService(cfg)
            svc.test_connection()
            svc.init_metadata()
        except DatabaseError as e:
            messagebox.showerror('登录失败', str(e), parent=self)
            return
        except Exception as e:
            messagebox.showerror('登录失败', str(e), parent=self)
            return

        if self.vars['remember'].get():
            save_login(
                {
                    'server': cfg.server,
                    'port': cfg.port,
                    'database': cfg.database,
                    'user': cfg.user,
                    'password': cfg.password,
                }
            )
        self.result = cfg
        self.destroy()

    def _cancel(self) -> None:
        self.result = None
        self.destroy()
