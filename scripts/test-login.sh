#!/bin/bash
# 快速测试登录功能

echo "====================================="
echo "登录功能测试脚本"
echo "====================================="
echo ""

BASE_URL="http://localhost:5000"

echo "1. 测试健康检查..."
curl -s -I ${BASE_URL} | grep "HTTP"
echo ""

echo "2. 测试登录API..."
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "响应："
echo "${RESPONSE}" | head -20
echo ""

echo "3. 检查响应状态..."
if echo "${RESPONSE}" | grep -q '"success":true'; then
    echo "✅ 登录成功！"
    TOKEN=$(echo "${RESPONSE}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token: ${TOKEN:0:32}..."
else
    echo "❌ 登录失败"
fi
echo ""

echo "4. 测试获取项目列表（使用token）..."
if [ -n "${TOKEN}" ]; then
    PROJECTS=$(curl -s ${BASE_URL}/api/projects \
      -H "Cookie: token=${TOKEN}")

    if echo "${PROJECTS}" | grep -q '"success":true'; then
        echo "✅ 获取项目列表成功"
        PROJECT_COUNT=$(echo "${PROJECTS}" | grep -o '"id"' | wc -l)
        echo "项目数量：${PROJECT_COUNT}"
    else
        echo "❌ 获取项目列表失败"
        echo "${PROJECTS}" | head -10
    fi
else
    echo "⏭️  跳过（未获取到token）"
fi
echo ""

echo "====================================="
echo "测试完成"
echo "====================================="
