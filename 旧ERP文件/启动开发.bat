@echo off
:: 解决管理员运行闪退 + 路径找不到 + npm找不到的问题
color 0A
echo 正在启动项目...
echo ==============================

:: 【关键】切换到脚本所在盘符，防止管理员权限乱切盘符
cd /d "%~dp0"

:: 启动服务端
echo 启动服务端...
cd /d "C:\Users\admin\Desktop\cursor\erp-new\server"
call npm start

:: 启动客户端
echo.
echo 启动客户端...
cd /d "C:\Users\admin\Desktop\cursor\erp-new\client-vue"
call npm run dev

:: 结束后暂停
echo.
echo 项目已全部启动！
pause
exit


