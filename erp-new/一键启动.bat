@echo off

setlocal EnableDelayedExpansion

chcp 65001 >nul

title ERP 一键启动



:: ========== 配置 ==========

set "ROOT=%~dp0"

set "SERVER_DIR=%ROOT%server"

set "CLIENT_DIR=%ROOT%client-vue"

set "API_PORT=3001"

set "WEB_PORT=5180"



:: ========== Node.js ==========

where node >nul 2>&1

if errorlevel 1 (

  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

)

where node >nul 2>&1

if errorlevel 1 (

  if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"

)

where node >nul 2>&1

if errorlevel 1 (

  echo [错误] 未找到 Node.js，请先安装 Node 22 LTS。

  pause

  exit /b 1

)



color 0A

echo ==============================

echo   ERP 一键启动

echo   后端 API : http://localhost:%API_PORT%

echo   前端页面 : http://localhost:%WEB_PORT%

echo ==============================

echo.



cd /d "%ROOT%"



:: ========== 首次自动安装依赖 ==========

if not exist "%SERVER_DIR%\node_modules" (

  echo [安装] server 依赖...

  pushd "%SERVER_DIR%" && call npm install && popd

  if errorlevel 1 ( echo [错误] server npm install 失败 & pause & exit /b 1 )

)

if not exist "%CLIENT_DIR%\node_modules" (

  echo [安装] client-vue 依赖...

  pushd "%CLIENT_DIR%" && call npm install && popd

  if errorlevel 1 ( echo [错误] client-vue npm install 失败 & pause & exit /b 1 )

)



:: ========== 检查 better-sqlite3（Node 升级后需重装原生模块）==========

echo [检查] better-sqlite3 兼容性...

pushd "%SERVER_DIR%"

node -e "require('better-sqlite3')(':memory:')" >nul 2>&1

if errorlevel 1 (

  echo [修复] 检测到 Node 版本变更，重新安装 better-sqlite3...

  call npm install better-sqlite3@12.10.0

  if errorlevel 1 (

    echo [错误] better-sqlite3 安装失败，请查看上方报错。

    popd

    pause

    exit /b 1

  )

)

popd



:: ========== 清理占用 API 端口的旧进程 ==========

for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%API_PORT% " ^| findstr LISTENING') do (

  echo [清理] 端口 %API_PORT% 被 PID %%p 占用，结束旧进程...

  taskkill /PID %%p /F >nul 2>&1

)

timeout /t 2 /nobreak >nul



:: ========== 1. 后端：npm start ==========

echo [1/2] 启动后端 server（端口 %API_PORT%）...

start "ERP-API-%API_PORT%" /D "%SERVER_DIR%" cmd /k "title ERP API :%API_PORT% && npm start"



:: 等待 API 就绪

echo       等待 API 就绪...

set /a WAIT_SEC=0

:wait_api

powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', %API_PORT%); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1

if !errorlevel! equ 0 goto api_ready

set /a WAIT_SEC+=2

if !WAIT_SEC! geq 90 (

  echo [错误] API 端口 %API_PORT% 启动超时，请查看 ERP-API 窗口报错。

  pause

  exit /b 1

)

timeout /t 2 /nobreak >nul

goto wait_api



:api_ready

echo       API 已就绪



:: ========== 2. 前端：npm run dev ==========

echo [2/2] 启动前端 client-vue（端口 %WEB_PORT%）...

start "ERP-Vue-%WEB_PORT%" /D "%CLIENT_DIR%" cmd /k "title ERP 前端 :%WEB_PORT% && npm run dev"



echo.

echo ==============================

echo   启动完成

echo   浏览器: http://localhost:%WEB_PORT%

echo   请勿关闭 ERP-API 与 ERP-Vue 两个窗口

echo ==============================

echo.



timeout /t 4 /nobreak >nul

start "" "http://localhost:%WEB_PORT%/"



pause

exit /b 0

