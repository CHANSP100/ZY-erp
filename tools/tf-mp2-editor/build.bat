@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === TF_MP2 视图维护工具 - 打包 EXE ===

where python >nul 2>&1
if errorlevel 1 (
  echo 未找到 Python，请先安装 Python 3.10+ 并勾选 "Add to PATH"
  pause
  exit /b 1
)

python -m pip install -r requirements.txt
if errorlevel 1 (
  echo 依赖安装失败
  pause
  exit /b 1
)

pyinstaller --noconfirm --clean --onefile --windowed ^
  --name "TF_MP2视图维护" ^
  app.py

if errorlevel 1 (
  echo 打包失败
  pause
  exit /b 1
)

echo.
echo 成功：dist\TF_MP2视图维护.exe
echo 首次运行需本机已安装 SQL Server ODBC 驱动（ODBC Driver 17/18 for SQL Server）
pause
