#!/bin/bash

# Android构建脚本
# 用于自动化构建Android APK和AAB文件

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查前置条件
check_prerequisites() {
    print_info "检查前置条件..."

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js未安装"
        exit 1
    fi

    # 检查Java
    if ! command -v java &> /dev/null; then
        print_error "Java未安装"
        exit 1
    fi

    # 检查Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        print_warn "ANDROID_HOME环境变量未设置"
        print_warn "尝试使用默认路径..."
        if [ -d "$HOME/Library/Android/sdk" ]; then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
        elif [ -d "$HOME/Android/Sdk" ]; then
            export ANDROID_HOME="$HOME/Android/Sdk"
        else
            print_error "找不到Android SDK"
            exit 1
        fi
    fi

    print_info "前置条件检查通过 ✓"
}

# 清理构建
clean_build() {
    print_info "清理旧构建..."

    if [ -d "android/app/build" ]; then
        rm -rf android/app/build
    fi

    cd android
    ./gradlew clean
    cd ..

    print_info "清理完成 ✓"
}

# 构建Debug APK
build_debug() {
    print_info "构建Debug APK..."

    cd android
    ./gradlew assembleDebug
    cd ..

    if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
        print_info "Debug APK构建成功 ✓"
        print_info "APK位置: android/app/build/outputs/apk/debug/app-debug.apk"
    else
        print_error "Debug APK构建失败"
        exit 1
    fi
}

# 构建Release APK
build_release() {
    print_info "构建Release APK..."

    # 检查是否存在签名密钥
    if [ ! -f "android/app/my-release-key.keystore" ]; then
        print_warn "未找到发布密钥库"
        print_warn "将使用debug签名构建..."
    fi

    cd android
    ./gradlew assembleRelease
    cd ..

    if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
        print_info "Release APK构建成功 ✓"
        print_info "APK位置: android/app/build/outputs/apk/release/app-release.apk"
    else
        print_error "Release APK构建失败"
        exit 1
    fi
}

# 构建App Bundle (AAB)
build_bundle() {
    print_info "构建App Bundle (AAB)..."

    cd android
    ./gradlew bundleRelease
    cd ..

    if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
        print_info "App Bundle构建成功 ✓"
        print_info "AAB位置: android/app/build/outputs/bundle/release/app-release.aab"
    else
        print_error "App Bundle构建失败"
        exit 1
    fi
}

# 安装到设备
install_device() {
    print_info "检查设备连接..."

    if [ -z "$(adb devices | grep -v 'List of devices' | grep 'device')" ]; then
        print_error "未找到已连接的设备"
        print_info "请确保:"
        print_info "1. 设备已通过USB连接"
        print_info "2. 已开启USB调试"
        print_info "3. 已授权计算机"
        exit 1
    fi

    print_info "已找到设备 ✓"

    # 检查要安装的文件
    APK_FILE=""
    if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
        APK_FILE="android/app/build/outputs/apk/release/app-release.apk"
    elif [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
        APK_FILE="android/app/build/outputs/apk/debug/app-debug.apk"
    else
        print_error "未找到APK文件，请先构建"
        exit 1
    fi

    print_info "安装 $APK_FILE..."

    adb install -r "$APK_FILE"

    print_info "安装成功 ✓"
}

# 显示帮助信息
show_help() {
    cat << EOF
Android构建脚本

用法: ./scripts/build-android.sh [选项]

选项:
    debug       构建Debug APK
    release     构建Release APK
    bundle      构建App Bundle (AAB)
    install     安装到连接的设备
    clean       清理构建
    all         构建所有类型 (debug + release + bundle)
    help        显示此帮助信息

示例:
    ./scripts/build-android.sh debug
    ./scripts/build-android.sh release
    ./scripts/build-android.sh all
    ./scripts/build-android.sh install
EOF
}

# 主函数
main() {
    print_info "Android构建脚本开始执行..."

    check_prerequisites

    case "$1" in
        debug)
            clean_build
            build_debug
            ;;
        release)
            clean_build
            build_release
            ;;
        bundle)
            clean_build
            build_bundle
            ;;
        install)
            install_device
            ;;
        clean)
            clean_build
            ;;
        all)
            clean_build
            build_debug
            build_release
            build_bundle
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac

    print_info "构建脚本执行完成 ✓"
}

# 执行主函数
main "$@"
