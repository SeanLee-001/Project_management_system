@echo off
chcp 65001 >nul
title 项目管理系统 - 环境检查

echo ==========================================
echo   项目管理系统 - 环境检查
echo ==========================================
echo.

set total=0
set passed=0

:: 检查操作系统
set /a total+=1
echo [信息] 操作系统: %OS%
set /a passed+=1

echo.
echo --- 必需工具 ---
echo.

:: 检查 Node.js
set /a total+=1
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js
    node -v
    set /a passed+=1
) else (
    echo [错误] Node.js 未安装
)

:: 检查 npm
set /a total+=1
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] npm
    npm -v
    set /a passed+=1
) else (
    echo [错误] npm 未安装
)

:: 检查 pnpm
set /a total+=1
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] pnpm
    pnpm -v
    set /a passed+=1
) else (
    echo [警告] pnpm 未安装，可以通过 npm install -g pnpm 安装
)

:: 检查 PostgreSQL
set /a total+=1
where psql >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL
    psql --version
    set /a passed+=1
) else (
    echo [警告] PostgreSQL 未安装或不在 PATH 中
)

echo.
echo --- 项目文件 ---
echo.

:: 检查 package.json
set /a total+=1
if exist "package.json" (
    echo [OK] package.json 存在
    set /a passed+=1
) else (
    echo [错误] package.json 缺失
)

:: 检查 .env
set /a total+=1
if exist ".env" (
    echo [OK] .env 存在
    set /a passed+=1
) else (
    echo [警告] .env 缺失，首次运行会自动创建
)

:: 检查 node_modules
set /a total+=1
if exist "node_modules" (
    echo [OK] node_modules 存在
    set /a passed+=1
) else (
    echo [警告] node_modules 缺失，首次运行会自动安装
)

:: 检查 src 目录
set /a total+=1
if exist "src" (
    echo [OK] src 目录存在
    set /a passed+=1
) else (
    echo [错误] src 目录缺失
)

echo.
echo --- 端口检查 ---
echo.

:: 检查端口 5000
set /a total+=1
netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [警告] 端口 5000 已被占用
) else (
    echo [OK] 端口 5000 可用
    set /a passed+=1
)

echo.
echo --- 检查结果 ---
echo.

set /a score=passed*100/total
echo 总检查项: %total%
echo 通过项: %passed%
echo 失败项: %total%-%passed%
echo 通过率: %score%%%
echo.

if %score%==100 (
    echo [通过] 环境检查完全通过！
    echo.
    echo 下一步：
    echo   运行: quick-start.bat
    echo.
) else if %score% GEQ 80 (
    echo [警告] 环境基本满足，但存在一些问题
    echo.
    echo 建议：
    where pnpm >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo   1. 安装 pnpm: npm install -g pnpm
    )
    where psql >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo   2. 安装 PostgreSQL
    )
    if not exist ".env" (
        echo   3. 配置 .env 文件
    )
    netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo   4. 释放端口 5000
    )
    echo.
) else (
    echo [失败] 环境检查不通过
    echo.
    echo 请安装缺失的组件后再试
    echo.
)

pause
