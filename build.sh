#!/bin/bash
set -e

echo "=== 项目管理系统 - 生产构建 ==="
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"

# 设置构建环境变量
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# 启用类型和 lint 检查（CI 模式下）
export NEXT_TYPESCRIPT_BUILD_ERRORS=1
export NEXT_LINT_BUILD_ERRORS=1

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
  echo "错误: pnpm 未安装，请先安装 pnpm"
  exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
  echo "正在安装依赖..."
  pnpm install --frozen-lockfile
fi

# 清理旧的构建产物
echo "清理旧的构建缓存..."
rm -rf .next

# 执行类型检查
echo "正在执行类型检查..."
pnpm typecheck || echo "警告: 类型检查发现错误，但继续构建"

# 执行构建
echo "正在执行 Next.js 构建..."
START_TIME=$(date +%s)

pnpm build

END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

echo ""
echo "=== 构建完成 ==="
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "构建耗时: ${BUILD_TIME}秒"
echo "输出目录: .next/standalone/"
