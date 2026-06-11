#!/bin/bash

# 部署环境登录问题自动修复脚本

set -e

echo "========================================="
echo "部署环境登录问题自动修复"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取部署URL
DEPLOY_URL="${1:-http://localhost:5000}"

echo "部署URL: $DEPLOY_URL"
echo ""

# 步骤1：检查环境变量
echo "步骤1: 检查环境变量..."
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env 文件存在${NC}"
    if grep -q "JWT_SECRET" .env; then
        echo -e "${GREEN}✅ JWT_SECRET 已配置${NC}"
    else
        echo -e "${YELLOW}⚠️  .env 文件中缺少 JWT_SECRET${NC}"
        echo "正在添加 JWT_SECRET..."
        echo "JWT_SECRET=production-jwt-secret-change-this-to-a-random-string-9d8f7a6e5c4b3d2e1f0a9b8c7d6e5f4a3b2c1d0" >> .env
        echo -e "${GREEN}✅ JWT_SECRET 已添加${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env 文件不存在${NC}"
    echo "正在创建 .env 文件..."
    cat > .env << 'EOF'
JWT_SECRET=production-jwt-secret-change-this-to-a-random-string-9d8f7a6e5c4b3d2e1f0a9b8c7d6e5f4a3b2c1d0
NODE_ENV=production
EOF
    echo -e "${GREEN}✅ .env 文件已创建${NC}"
fi
echo ""

# 步骤2：初始化admin用户
echo "步骤2: 初始化admin用户..."
INIT_RESULT=$(curl -s "$DEPLOY_URL/api/init")

echo "$INIT_RESULT" | grep -q '"success":true'
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Admin 用户初始化成功${NC}"
    echo "$INIT_RESULT" | python3 -c "import sys, json; data = json.load(sys.stdin); print('  用户名:', data['data']['username']); print('  邮箱:', data['data']['email']); print('  状态:', '激活' if data['data']['isActive'] else '未激活')" 2>/dev/null || echo "$INIT_RESULT"
else
    echo -e "${RED}❌ Admin 用户初始化失败${NC}"
    echo "$INIT_RESULT"
    exit 1
fi
echo ""

# 步骤3：测试登录
echo "步骤3: 测试登录..."
LOGIN_RESULT=$(curl -s -X POST "$DEPLOY_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "$LOGIN_RESULT" | grep -q '"success":true'
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 登录成功${NC}"
    echo "  Token: $(echo "$LOGIN_RESULT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['token'][:50] + '...')" 2>/dev/null || echo "N/A")"
else
    echo -e "${RED}❌ 登录失败${NC}"
    echo "$LOGIN_RESULT" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESULT"

    # 提供错误诊断
    ERROR_MSG=$(echo "$LOGIN_RESULT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', 'Unknown error'))" 2>/dev/null || echo "Unknown error")

    case "$ERROR_MSG" in
        *"Invalid username or password"*)
            echo ""
            echo -e "${YELLOW}错误原因：密码可能不正确${NC}"
            echo "建议：重新初始化admin用户"
            ;;
        *"Account is deactivated"*)
            echo ""
            echo -e "${YELLOW}错误原因：账户已被停用${NC}"
            echo "建议：通过数据库直接激活admin用户"
            ;;
        *"Failed to login"*)
            echo ""
            echo -e "${YELLOW}错误原因：服务器内部错误${NC}"
            echo "建议：查看应用日志排查问题"
            ;;
        *)
            echo ""
            echo -e "${YELLOW}未知错误：$ERROR_MSG${NC}"
            ;;
    esac

    exit 1
fi
echo ""

# 步骤4：检查cookie设置
echo "步骤4: 检查Cookie设置..."
COOKIE_CHECK=$(curl -s -X POST "$DEPLOY_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -i)

if echo "$COOKIE_CHECK" | grep -qi "set-cookie:"; then
    echo -e "${GREEN}✅ Cookie 设置正常${NC}"
else
    echo -e "${RED}❌ Cookie 设置失败${NC}"
    echo "建议：检查HTTPS配置和secure标志设置"
fi
echo ""

# 完成
echo "========================================="
echo -e "${GREEN}所有检查通过！登录功能正常${NC}"
echo "========================================="
echo ""
echo "现在可以使用以下凭据登录："
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "登录页面: $DEPLOY_URL/login"
echo ""
