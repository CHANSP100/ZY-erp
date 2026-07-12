"""TF_MP2 视图数据维护工具入口。"""
from __future__ import annotations

import tkinter as tk
from tkinter import ttk

from config import APP_NAME
from db_service import DbService
from login_dialog import LoginDialog
from main_window import open_main_window


def main() -> None:
    root = tk.Tk()
    root.title(APP_NAME)
    root.geometry('1100x700')
    try:
        root.iconbitmap(default='')
    except Exception:
        pass
    style = ttk.Style()
    if 'vista' in style.theme_names():
        style.theme_use('vista')
    elif 'clam' in style.theme_names():
        style.theme_use('clam')

    dlg = LoginDialog(root)
    root.wait_window(dlg)
    if not dlg.result:
        root.destroy()
        return

    svc = DbService(dlg.result)
    svc.init_metadata()
    open_main_window(root, svc)
    root.mainloop()


if __name__ == '__main__':
    main()
