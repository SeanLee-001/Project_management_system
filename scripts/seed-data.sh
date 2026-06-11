#!/bin/bash
# 批量创建测试数据的 Shell 脚本

API_BASE="http://localhost:5000/api"

echo "============================================"
echo "🚀 开始创建测试数据"
echo "============================================"

# 创建 20 个产品
echo -e "\n📦 创建产品..."
for i in {1..20}; do
  curl -s -X POST "$API_BASE/products" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"产品 $i\",
      \"code\": \"PROD-$(printf '%04d' $i)\",
      \"description\": \"产品$i描述\",
      \"category\": \"软件\",
      \"unitPrice\": $((i * 1000)),
      \"unit\": \"套\",
      \"specification\": \"标准版\",
      \"status\": \"active\"
    }" > /dev/null && echo -ne "\r✅ 已创建 $i/20 个产品" || echo -ne "\r❌ 产品$i失败"
done
echo ""

# 创建 20 个客户
echo -e "\n👥 创建客户..."
for i in {1..20}; do
  curl -s -X POST "$API_BASE/customers" \
    -H "Content-Type: application/json" \
    -d "{
      \"customerName\": \"客户$i\",
      \"companyName\": \"${i}号公司\",
      \"industry\": \"互联网\",
      \"scale\": \"中型\",
      \"level\": \"A\",
      \"source\": \"主动咨询\",
      \"status\": \"active\",
      \"address\": \"北京市朝阳区$i街\",
      \"website\": \"www.company$i.com\",
      \"email\": \"contact@company$i.com\",
      \"phone\": \"138001380$i\"
    }" > /dev/null && echo -ne "\r✅ 已创建 $i/20 个客户" || echo -ne "\r❌ 客户$i失败"
done
echo ""

# 创建 20 个项目
echo -e "\n📊 创建项目..."
for i in {1..20}; do
  curl -s -X POST "$API_BASE/projects" \
    -H "Content-Type: application/json" \
    -d "{
      \"projectName\": \"项目$i\",
      \"description\": \"项目$i的描述\",
      \"status\": \"active\",
      \"priority\": \"high\",
      \"budget\": $((i * 100000)),
      \"manager\": \"经理$i\",
      \"technicalManager\": \"技术负责人$i\",
      \"startDate\": \"2024-0${i}-01\",
      \"expectedDeliveryDate\": \"2025-${i}-31\",
      \"progress\": $((i * 5))
    }" > /dev/null && echo -ne "\r✅ 已创建 $i/20 个项目" || echo -ne "\r❌ 项目$i失败"
done
echo ""

# 创建 20 个合同
echo -e "\n📄 创建合同..."
for i in {1..20}; do
  curl -s -X POST "$API_BASE/contracts" \
    -H "Content-Type: application/json" \
    -d "{
      \"contractCode\": \"CT-$(printf '%06d' $i)\",
      \"contractName\": \"合同$i\",
      \"customerName\": \"客户$i\",
      \"contractDate\": \"2024-0${i}-01\",
      \"technicalManager\": \"技术$i\",
      \"technicalPhone\": \"1380013800$i\",
      \"procurementManager\": \"采购$i\",
      \"procurementPhone\": \"1390013900$i\",
      \"contractAmount\": $((i * 50000)),
      \"status\": \"active\",
      \"contractType\": \"开发\",
      \"paymentTerms\": \"分期\"
    }" > /dev/null && echo -ne "\r✅ 已创建 $i/20 个合同" || echo -ne "\r❌ 合同$i失败"
done
echo ""

# 创建 20 个订单
echo -e "\n🛒 创建订单..."
for i in {1..20}; do
  curl -s -X POST "$API_BASE/orders" \
    -H "Content-Type: application/json" \
    -d "{
      \"orderNumber\": \"ORD-$(printf '%06d' $i)\",
      \"contractCode\": \"CT-$(printf '%06d' $i)\",
      \"customerName\": \"客户$i\",
      \"projectName\": \"项目$i\",
      \"productName\": \"产品$i\",
      \"productSpecification\": \"标准版\",
      \"quantity\": $i,
      \"unitPrice\": $((i * 1000)),
      \"orderAmount\": $((i * i * 1000)),
      \"orderDate\": \"2024-0${i}-15\",
      \"deliveryDate\": \"2024-0${i}-30\",
      \"status\": \"pending\"
    }" > /dev/null && echo -ne "\r✅ 已创建 $i/20 个订单" || echo -ne "\r❌ 订单$i失败"
done
echo ""

echo -e "\n============================================"
echo "✅ 测试数据创建完成！"
echo "============================================"
echo ""
echo "数据汇总:"
echo "  - 产品：20 个"
echo "  - 客户：20 个"
echo "  - 项目：20 个"
echo "  - 合同：20 个"
echo "  - 订单：20 个"
echo "============================================"
