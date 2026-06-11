@echo off
chcp 65001 >nul
title 项目管理系统启动器

echo ========================================
echo    项目管理系统启动器
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先安装 Node.js: https://nodejs.org/
    echo 推荐版本: v20 LTS 或更高版本
    echo.
    pause
    exit /b 1
)

:: 检查 PostgreSQL 是否安装
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 未检测到 PostgreSQL！
    echo 请确保 PostgreSQL 已安装并启动
    echo 下载地址: https://www.postgresql.org/download/windows/
    echo.
)

:: 检查依赖是否安装
if not exist "node_modules" (
    echo [信息] 首次启动，正在安装依赖...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 依赖安装失败！
        echo 请检查网络连接或切换 npm 镜像源
        echo.
        pause
        exit /b 1
    )
    echo.
)

:: 检查环境配置文件
if not exist ".env" (
    echo [错误] 未找到 .env 配置文件！
    echo 请先创建 .env 文件并配置数据库连接信息
    echo.
    echo 参考配置:
    echo DATABASE_URL=postgresql://用户名:密码@localhost:5432/数据库名
    echo.
    pause
    exit /b 1
)

echo [启动] 正在启动项目管理系统...
echo.
echo 服务地址: http://localhost:5000
echo 按 Ctrl+C 可停止服务
echo.
echo ========================================
echo.

:: 启动开发服务器
call npm run dev

pause
