@echo off
chcp 65001 >nul
title 创建桌面快捷方式

echo ========================================
echo    创建项目管理系统桌面快捷方式
echo ========================================
echo.

:: 检查是否以管理员身份运行
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [提示] 建议以管理员身份运行此脚本
    echo 点击确定后，将以管理员身份重新运行...
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 检查 start.bat 是否存在
if not exist "start.bat" (
    echo [错误] 未找到 start.bat 文件！
    echo 请确保此脚本位于项目根目录下。
    echo.
    pause
    exit /b 1
)

:: 获取项目路径
set "PROJECT_PATH=%CD%"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\项目管理系统.lnk"

:: 检查快捷方式是否已存在
if exist "%SHORTCUT_PATH%" (
    echo [警告] 桌面快捷方式已存在！
    echo.
    set /p OVERRIDE="是否覆盖现有快捷方式？(Y/N): "
    if /i not "%OVERRIDE%"=="Y" (
        echo [取消] 操作已取消
        pause
        exit /b 0
    )
    del "%SHORTCUT_PATH%"
)

:: 使用 PowerShell 创建快捷方式
echo [正在] 创建桌面快捷方式...
echo.
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%PROJECT_PATH%\start.bat'; $Shortcut.WorkingDirectory = '%PROJECT_PATH%'; $Shortcut.Description = '启动项目管理系统'; $Shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,13'; $Shortcut.Save"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo [成功] 桌面快捷方式创建成功！
    echo ========================================
    echo.
    echo 快捷方式位置: %SHORTCUT_PATH%
    echo.
    echo 后续步骤:
    echo   1. 检查是否已安装 Node.js (https://nodejs.org/)
    echo   2. 检查是否已安装 PostgreSQL
    echo   3. 确保 .env 配置文件已创建
    echo   4. 首次运行时会自动安装依赖
    echo.
    echo 使用方法:
    echo   双击桌面"项目管理系统"快捷方式即可启动
    echo   服务地址: http://localhost:5000
    echo.
    echo ========================================
) else (
    echo.
    echo [错误] 快捷方式创建失败！
    echo 请检查是否有足够的权限。
    echo.
)

pause
