@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === TF_MP2 视图维护工具 (C#) - 编译 EXE ===

where dotnet >nul 2>&1
if errorlevel 1 (
  echo 未找到 .NET SDK，请安装 .NET 8 SDK：
  echo https://dotnet.microsoft.com/download/dotnet/8.0
  pause
  exit /b 1
)

dotnet restore TfMp2Editor.sln
if errorlevel 1 goto :fail

dotnet publish TfMp2Editor\TfMp2Editor.csproj -c Release -r win-x64 --self-contained true ^
  -p:PublishSingleFile=true ^
  -p:IncludeNativeLibrariesForSelfExtract=true ^
  -p:EnableCompressionInSingleFile=true ^
  -o publish

if errorlevel 1 goto :fail

echo.
echo 成功：publish\TF_MP2视图维护.exe
echo 可将 publish 目录下 exe 单独拷贝到其他 Windows 电脑运行（无需安装 .NET 运行时）
pause
exit /b 0

:fail
echo 编译失败
pause
exit /b 1
