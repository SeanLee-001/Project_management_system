#!/bin/bash
# 部署环境检查脚本

echo "====================================="
echo "部署环境诊断工具"
echo "====================================="
echo ""

echo "1. 检查Node.js版本..."
node --version
echo ""

echo "2. 检查pnpm版本..."
pnpm --version
echo ""

echo "3. 检查依赖是否安装..."
if [ -d "node_modules" ]; then
    echo "✓ node_modules 目录存在"
else
    echo "✗ node_modules 目录不存在，正在安装..."
    pnpm install
fi
echo ""

echo "4. 检查环境变量..."
if [ -f ".env" ]; then
    echo "✓ .env 文件存在"
    echo "JWT_SECRET 设置: $(if grep -q 'JWT_SECRET' .env; then echo '已设置'; else echo '未设置'; fi)"
else
    echo "✗ .env 文件不存在，将使用默认配置"
    echo "警告：生产环境建议设置 JWT_SECRET"
fi
echo ""

echo "5. 检查构建产物..."
if [ -d ".next" ]; then
    echo "✓ .next 构建目录存在"
else
    echo "✗ .next 构建目录不存在，正在构建..."
    pnpm run build
fi
echo ""

echo "6. 检查端口配置..."
echo "DEPLOY_RUN_PORT: ${DEPLOY_RUN_PORT:-未设置}"
echo ""

echo "7. 检查Next.js配置..."
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
    echo "✓ Next.js配置文件存在"
else
    echo "✗ Next.js配置文件不存在"
fi
echo ""

echo "====================================="
echo "诊断完成"
echo "====================================="
echo ""
echo "如需测试登录功能，请访问："
echo "http://localhost:${DEPLOY_RUN_PORT:-5000}/test-login"
echo ""
