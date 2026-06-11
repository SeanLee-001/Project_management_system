@echo off
REM Windows版本Android构建脚本
REM 用于自动化构建Android APK和AAB文件

setlocal enabledelayedexpansion

REM 检查前置条件
:check_prerequisites
echo [INFO] 检查前置条件...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js未安装
    exit /b 1
)

where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Java未安装
    exit /b 1
)

echo [INFO] 前置条件检查通过
goto :eof

REM 清理构建
:clean_build
echo [INFO] 清理旧构建...

if exist android\app\build (
    rmdir /s /q android\app\build
)

cd android
call gradlew.bat clean
cd ..

echo [INFO] 清理完成
goto :eof

REM 构建Debug APK
:build_debug
echo [INFO] 构建Debug APK...

cd android
call gradlew.bat assembleDebug
cd ..

if exist android\app\build\outputs\apk\debug\app-debug.apk (
    echo [INFO] Debug APK构建成功
    echo [INFO] APK位置: android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo [ERROR] Debug APK构建失败
    exit /b 1
)
goto :eof

REM 构建Release APK
:build_release
echo [INFO] 构建Release APK...

if not exist android\app\my-release-key.keystore (
    echo [WARN] 未找到发布密钥库
    echo [WARN] 将使用debug签名构建...
)

cd android
call gradlew.bat assembleRelease
cd ..

if exist android\app\build\outputs\apk\release\app-release.apk (
    echo [INFO] Release APK构建成功
    echo [INFO] APK位置: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo [ERROR] Release APK构建失败
    exit /b 1
)
goto :eof

REM 构建App Bundle (AAB)
:build_bundle
echo [INFO] 构建App Bundle (AAB)...

cd android
call gradlew.bat bundleRelease
cd ..

if exist android\app\build\outputs\bundle\release\app-release.aab (
    echo [INFO] App Bundle构建成功
    echo [INFO] AAB位置: android\app\build\outputs\bundle\release\app-release.aab
) else (
    echo [ERROR] App Bundle构建失败
    exit /b 1
)
goto :eof

REM 安装到设备
:install_device
echo [INFO] 检查设备连接...

adb devices
echo %errorlevel%

findstr /C:"device" >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] 未找到已连接的设备
    echo [INFO] 请确保:
    echo [INFO] 1. 设备已通过USB连接
    echo [INFO] 2. 已开启USB调试
    echo [INFO] 3. 已授权计算机
    exit /b 1
)

echo [INFO] 已找到设备

REM 检查要安装的文件
set APK_FILE=
if exist android\app\build\outputs\apk\release\app-release.apk (
    set APK_FILE=android\app\build\outputs\apk\release\app-release.apk
) else if exist android\app\build\outputs\apk\debug\app-debug.apk (
    set APK_FILE=android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo [ERROR] 未找到APK文件，请先构建
    exit /b 1
)

echo [INFO] 安装 !APK_FILE!...

adb install -r !APK_FILE!

echo [INFO] 安装成功
goto :eof

REM 显示帮助信息
:show_help
echo Android构建脚本 (Windows版本)
echo.
echo 用法: build-android.bat [选项]
echo.
echo 选项:
echo     debug       构建Debug APK
echo     release     构建Release APK
echo     bundle      构建App Bundle (AAB)
echo     install     安装到连接的设备
echo     clean       清理构建
echo     all         构建所有类型 (debug + release + bundle)
echo     help        显示此帮助信息
echo.
echo 示例:
echo     build-android.bat debug
echo     build-android.bat release
echo     build-android.bat all
echo     build-android.bat install
goto :eof

REM 主函数
:main
echo [INFO] Android构建脚本开始执行...

call :check_prerequisites

if "%1"=="debug" (
    call :clean_build
    call :build_debug
) else if "%1"=="release" (
    call :clean_build
    call :build_release
) else if "%1"=="bundle" (
    call :clean_build
    call :build_bundle
) else if "%1"=="install" (
    call :install_device
) else if "%1"=="clean" (
    call :clean_build
) else if "%1"=="all" (
    call :clean_build
    call :build_debug
    call :build_release
    call :build_bundle
) else if "%1"=="help" (
    call :show_help
) else (
    echo [ERROR] 未知选项: %1
    call :show_help
    exit /b 1
)

echo [INFO] 构建脚本执行完成
goto :eof

REM 执行主函数
call :main %1
