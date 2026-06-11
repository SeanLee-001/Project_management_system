#!/bin/bash

API="http://localhost:5000/api"

echo "🚀 快速创建测试数据..."

# 产品 (products)
echo -e "\n📦 创建 20 个产品..."
for i in {1..20}; do
  curl -s -X POST "$API/products" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"测试产品$i\", \"code\": \"PROD-$(printf '%04d' $i)\", \"category\": \"软件\", \"unitPrice\": $((i * 1000)), \"unit\": \"套\", \"specification\": \"标准版\", \"status\": \"active\"}" >/dev/null 2>&1 && echo -ne "\r✓ #$i" || echo -ne "\r✗ #$i"
done
echo " 完成"

# 客户 (customers)  
echo -e "\n👥 创建 20 个客户..."
for i in {1..20}; do
  curl -s -X POST "$API/customers" \
    -H "Content-Type: application/json" \
    -d "{\"customerCode\": \"CUST-$(printf '%04d' $i)\", \"customerName\": \"测试客户$i\", \"phone\": \"138001380$(printf '%02d' $i)\", \"address\": \"北京市朝阳区$i大街\", \"customerType\": \"企业\", \"status\": \"active\"}" >/dev/null 2>&1 && echo -ne "\r✓ #$i" || echo -ne "\r✗ #$i"
done
echo " 完成"

# 项目 (projects)
echo -e "\n📊 创建 20 个项目..."
for i in {1..20}; do
  curl -s -X POST "$API/projects" \
    -H "Content-Type: application/json" \
    -d "{\"projectName\": \"测试项目$i\", \"customerName\": \"测试客户$i\", \"description\": \"项目$i描述\", \"status\": \"active\", \"priority\": \"high\", \"budget\": $((i * 100000)), \"manager\": \"项目经理$i\", \"startDate\": \"2024-01-01\", \"expectedDeliveryDate\": \"2025-12-31\", \"progress\": $((i * 5))}" >/dev/null 2>&1 && echo -ne "\r✓ #$i" || echo -ne "\r✗ #$i"
done
echo " 完成"

# 订单 (orders)
echo -e "\n🛒 创建 20 个订单..."
for i in {1..20}; do
  curl -s -X POST "$API/orders" \
    -H "Content-Type: application/json" \
    -d "{\"orderNumber\": \"ORD-$(printf '%06d' $i)\", \"customerName\": \"测试客户$i\", \"projectName\": \"测试项目$i\", \"productName\": \"测试产品$i\", \"productSpecification\": \"标准版\", \"quantity\": $i, \"unitPrice\": $((i * 1000)), \"orderAmount\": $((i * i * 1000)), \"orderDate\": \"2024-01-15\", \"deliveryDate\": \"2024-02-15\", \"status\": \"pending\"}" >/dev/null 2>&1 && echo -ne "\r✓ #$i" || echo -ne "\r✗ #$i"
done
echo " 完成"

# 合同 (contracts)
echo -e "\n📄 创建 20 个合同..."
for i in {1..20}; do
  curl -s -X POST "$API/contracts" \
    -H "Content-Type: application/json" \
    -d "{\"contractCode\": \"CT-$(printf '%06d' $i)\", \"contractName\": \"测试合同$i\", \"customerName\": \"测试客户$i\", \"contractDate\": \"2024-01-01\", \"technicalManager\": \"技术$i\", \"technicalPhone\": \"138001380$(printf '%02d' $i)\", \"procurementManager\": \"采购$i\", \"procurementPhone\": \"139001390$(printf '%02d' $i)\", \"contractAmount\": $((i * 50000)), \"status\": \"active\", \"contractType\": \"开发\"}" >/dev/null 2>&1 && echo -ne "\r✓ #$i" || echo -ne "\r✗ #$i"
done
echo " 完成"

# 任务 (tasks)
echo -e "\n✅ 创建 20 个任务..."
for i in {1..20}; do
  curl -s -X POST "$API/tasks" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\": 1, \"title\": \"任务$i - 功能开发\", \"description\": \"任务$i描述\", \"status\": \"todo\", \"priority\": \"high\", \"assignee\": \"开发$i\", \"startDate\": \"2024-01-01\", \"dueDate\": \"2024-12-31\", \"estimatedHours\": $((i * 4))}" >/dev/null 2>&1 && echo -ne "\r✓ #$i" || echo -ne "\r✗ #$i"
done
echo " 完成"

echo -e "\n✅ 批量创建测试数据完成！"
