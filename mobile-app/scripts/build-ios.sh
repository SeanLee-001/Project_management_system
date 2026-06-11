#!/bin/bash

# iOS构建脚本 (仅macOS)
# 用于自动化构建iOS应用

set -e  # 遇到错误立即退出

# 检查操作系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "[ERROR] 此脚本只能在macOS上运行"
    exit 1
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

    # 检查Xcode
    if ! command -v xcodebuild &> /dev/null; then
        print_error "Xcode未安装"
        exit 1
    fi

    # 检查CocoaPods
    if ! command -v pod &> /dev/null; then
        print_error "CocoaPods未安装"
        exit 1
    fi

    print_info "前置条件检查通过 ✓"
}

# 安装依赖
install_dependencies() {
    print_info "安装CocoaPods依赖..."

    if [ ! -d "ios/Pods" ]; then
        cd ios
        pod install
        cd ..
        print_info "依赖安装完成 ✓"
    else
        print_info "依赖已存在，跳过安装"
    fi
}

# 清理构建
clean_build() {
    print_info "清理旧构建..."

    if [ -d "ios/build" ]; then
        rm -rf ios/build
    fi

    print_info "清理完成 ✓"
}

# 构建Debug版本
build_debug() {
    print_info "构建Debug版本..."

    npx react-native run-ios

    print_info "Debug版本构建完成 ✓"
}

# 归档应用
archive_app() {
    print_info "归档应用..."

    WORKSPACE="ios/ProjectManagementMobile.xcworkspace"
    SCHEME="ProjectManagementMobile"
    ARCHIVE_PATH="build/ProjectManagementMobile.xcarchive"

    if [ ! -f "$WORKSPACE/project.pbxproj" ]; then
        print_error "未找到Xcode工作空间文件"
        print_info "请确保已运行: cd ios && pod install"
        exit 1
    fi

    xcodebuild archive \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME" \
        -configuration Release \
        -archivePath "$ARCHIVE_PATH" \
        -destination 'generic/platform=iOS'

    if [ -d "$ARCHIVE_PATH" ]; then
        print_info "归档成功 ✓"
        print_info "归档位置: $ARCHIVE_PATH"
    else
        print_error "归档失败"
        exit 1
    fi
}

# 导出IPA
export_ipa() {
    print_info "导出IPA..."

    ARCHIVE_PATH="build/ProjectManagementMobile.xcarchive"
    EXPORT_PATH="build/ipa"
    IPA_PATH="$EXPORT_PATH/ProjectManagementMobile.ipa"

    if [ ! -d "$ARCHIVE_PATH" ]; then
        print_error "未找到归档文件"
        print_info "请先运行: ./scripts/build-ios.sh archive"
        exit 1
    fi

    # 检查导出配置文件
    if [ ! -f "ios/ExportOptions.plist" ]; then
        print_warn "未找到ExportOptions.plist"
        print_info "创建默认导出配置..."

        cat > ios/ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string></string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF
    fi

    xcodebuild -exportArchive \
        -archivePath "$ARCHIVE_PATH" \
        -exportPath "$EXPORT_PATH" \
        -exportOptionsPlist ios/ExportOptions.plist

    if [ -f "$IPA_PATH" ]; then
        print_info "IPA导出成功 ✓"
        print_info "IPA位置: $IPA_PATH"
    else
        print_error "IPA导出失败"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
iOS构建脚本 (仅macOS)

用法: ./scripts/build-ios.sh [选项]

选项:
    debug       运行Debug版本
    archive     归档应用
    export      导出IPA
    install     安装依赖
    clean       清理构建
    help        显示此帮助信息

示例:
    ./scripts/build-ios.sh debug
    ./scripts/build-ios.sh archive
    ./scripts/build-ios.sh export

注意:
    - 此脚本只能在macOS上运行
    - 需要安装Xcode和CocoaPods
    - 首次使用前需要配置签名证书
EOF
}

# 主函数
main() {
    print_info "iOS构建脚本开始执行..."

    check_prerequisites

    case "$1" in
        debug)
            install_dependencies
            build_debug
            ;;
        archive)
            clean_build
            archive_app
            ;;
        export)
            export_ipa
            ;;
        install)
            install_dependencies
            ;;
        clean)
            clean_build
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
