#!/bin/bash

# 项目管理系统 - 环境检查脚本

echo "=========================================="
echo "  项目管理系统 - 环境检查"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        version=$($1 --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}[✓]${NC} $1 - $version"
        return 0
    else
        echo -e "${RED}[✗]${NC} $1 - 未安装"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}[✓]${NC} 文件存在: $1"
        return 0
    else
        echo -e "${RED}[✗]${NC} 文件缺失: $1"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}[✓]${NC} 目录存在: $1"
        return 0
    else
        echo -e "${RED}[✗]${NC} 目录缺失: $1"
        return 1
    fi
}

# 检查计数器
total=0
passed=0

echo "--- 系统环境 ---"
echo ""

# 检查操作系统
total=$((total + 1))
echo -n "操作系统: "
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${GREEN}Linux${NC}"
    passed=$((passed + 1))
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${GREEN}macOS${NC}"
    passed=$((passed + 1))
else
    echo -e "${YELLOW}$OSTYPE${NC}"
fi

# 检查必需工具
echo ""
echo "--- 必需工具 ---"
echo ""

total=$((total + 1))
check_command node && passed=$((passed + 1))

total=$((total + 1))
check_command npm && passed=$((passed + 1))

total=$((total + 1))
check_command pnpm && passed=$((passed + 1))

total=$((total + 1))
check_command psql && passed=$((passed + 1)) || echo -e "${YELLOW}[!]${NC} PostgreSQL 未安装或不在 PATH 中"

echo ""
echo "--- 项目文件 ---"
echo ""

# 检查关键文件
total=$((total + 1))
check_file package.json && passed=$((passed + 1))

total=$((total + 1))
check_file .env && passed=$((passed + 1)) || echo -e "${YELLOW}[!]${NC} .env 文件缺失，首次运行会自动创建"

total=$((total + 1))
check_dir node_modules && passed=$((passed + 1)) || echo -e "${YELLOW}[!]${NC} node_modules 缺失，首次运行会自动安装"

total=$((total + 1))
check_dir src && passed=$((passed + 1))

echo ""
echo "--- 端口检查 ---"
echo ""

total=$((total + 1))
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}[!]${NC} 端口 5000 已被占用"
else
    echo -e "${GREEN}[✓]${NC} 端口 5000 可用"
    passed=$((passed + 1))
fi

echo ""
echo "--- 数据库连接 ---"
echo ""

if command -v psql &> /dev/null; then
    total=$((total + 1))
    if psql "postgresql://postgres@localhost:5432/postgres" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}[✓]${NC} 可以连接到 PostgreSQL"
        passed=$((passed + 1))
    else
        echo -e "${RED}[✗]${NC} 无法连接到 PostgreSQL"
    fi
fi

echo ""
echo "--- 检查结果 ---"
echo ""

score=$((passed * 100 / total))
echo "总检查项: $total"
echo -e "通过项: ${GREEN}$passed${NC}"
echo -e "失败项: ${RED}$((total - passed))${NC}"
echo -e "通过率: ${score}%"
echo ""

if [ $score -eq 100 ]; then
    echo -e "${GREEN}[通过]${NC} 环境检查完全通过！"
    echo ""
    echo "下一步："
    echo "  运行: ./quick-start.sh"
    echo ""
    exit 0
elif [ $score -ge 80 ]; then
    echo -e "${YELLOW}[警告]${NC} 环境基本满足，但存在一些问题"
    echo ""
    echo "建议："
    if ! command -v psql &> /dev/null; then
        echo "  1. 安装 PostgreSQL"
    fi
    if [ ! -f .env ]; then
        echo "  2. 配置 .env 文件"
    fi
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  3. 释放端口 5000"
    fi
    echo ""
    exit 0
else
    echo -e "${RED}[失败]${NC} 环境检查不通过"
    echo ""
    echo "请安装缺失的组件后再试"
    echo ""
    exit 1
fi
