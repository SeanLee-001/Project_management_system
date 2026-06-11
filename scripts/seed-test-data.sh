#!/bin/bash
# 创建测试数据的 Shell 脚本

API_BASE="http://localhost:5000/api"

echo "============================================"
echo "🚀 开始创建测试数据（每类 20 组）"
echo "============================================"

# 创建 20 个产品
echo -e "\n📦 创建 20 个产品..."
for i in {1..20}; do
  code=$(printf "PROD-%04d" $i)
  response=$(curl -s -X POST "$API_BASE/products" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"测试产品$i\",
      \"code\": \"$code\",
      \"description\": \"产品$i的专业描述\",
      \"category\": \"软件\",
      \"unitPrice\": $((i * 1000 + 1000)),
      \"unit\": \"套\",
      \"specification\": \"标准版\",
      \"status\": \"active\"
    }")
  
  if echo "$response" | grep -q '"success":true'; then
    echo -ne "\r✅ 已创建 $i/20 个产品"
  else
    echo -ne "\r⚠️  产品$i (可能已存在)"
  fi
done
echo ""
echo "✅ 产品创建完成"

# 创建 20 个客户
echo -e "\n👥 创建 20 个客户..."
for i in {1..20}; do
  code=$(printf "CUST-%04d" $i)
  email="customer$i@example.com"
  phone="1380013$(printf "%04d" $i)"
  
  response=$(curl -s -X POST "$API_BASE/customers" \
    -H "Content-Type: application/json" \
    -d "{
      \"customerCode\": \"$code\",
      \"customerName\": \"测试客户$i\",
      \"customerType\": \"企业\",
      \"status\": \"active\",
      \"address\": \"北京市朝阳区$i大街$i号\",
      \"email\": \"$email\",
      \"phone\": \"$phone\",
      \"industry\": \"互联网\",
      \"scale\": \"中型\",
      \"level\": \"A\",
      \"source\": \"主动咨询\"
    }")
  
  if echo "$response" | grep -q '"success":true\|"客户编号已存在"'; then
    echo -ne "\r✅ 已创建 $i/20 个客户"
  else
    echo -ne "\r⚠️  客户$i"
  fi
done
echo ""
echo "✅ 客户创建完成"

# 创建 20 个项目
echo -e "\n📊 创建 20 个项目..."
names=("张三" "李四" "王五" "赵六" "钱七" "孙八" "周九" "吴十" "郑一" "王二" "李三" "张四" "刘五" "陈六" "杨七" "黄八" "徐九" "马十" "朱十一" "胡十二")
for i in {1..20}; do
  manager=${names[$((i-1))]}
  response=$(curl -s -X POST "$API_BASE/projects" \
    -H "Content-Type: application/json" \
    -d "{
      \"projectName\": \"测试项目$i\",
      \"description\": \"这是测试项目$i的详细描述，包含重要的业务需求\",
      \"customerName\": \"测试客户$i\",
      \"status\": \"active\",
      \"priority\": \"high\",
      \"budget\": $((i * 100000 + 100000)),
      \"manager\": \"$manager\",
      \"technicalManager\": \"技术负责人$i\",
      \"startDate\": \"2024-01-01\",
      \"expectedDeliveryDate\": \"2025-12-31\",
      \"progress\": $((i * 5)),
      \"actualCost\": $((i * 50000))
    }")
  
  if echo "$response" | grep -q '"success":true'; then
    echo -ne "\r✅ 已创建 $i/20 个项目"
  else
    echo -ne "\r⚠️  项目$i"
  fi
done
echo ""
echo "✅ 项目创建完成"

# 创建 20 个合同
echo -e "\n📄 创建 20 个合同..."
for i in {1..20}; do
  code=$(printf "CT-%06d" $i)
  amount=$((i * 50000 + 100000))
  response=$(curl -s -X POST "$API_BASE/contracts" \
    -H "Content-Type: application/json" \
    -d "{
      \"contractCode\": \"$code\",
      \"contractName\": \"测试合同$i\",
      \"contractType\": \"开发\",
      \"customerName\": \"测试客户$i\",
      \"contractDate\": \"2024-01-${printf '%02d' $((i % 28 + 1))}\",
      \"technicalManager\": \"技术$i\",
      \"technicalPhone\": \"1380013$(printf "%04d" $i)\",
      \"procurementManager\": \"采购$i\",
      \"procurementPhone\": \"1390013$(printf "%04d" $i)\",
      \"contractAmount\": $amount,
      \"status\": \"active\",
      \"paymentTerms\": \"分期\"
    }")
  
  if echo "$response" | grep -q '"success":true\|"合同编码已存在"'; then
    echo -ne "\r✅ 已创建 $i/20 个合同"
  else
    echo -ne "\r⚠️  合同$i"
  fi
done
echo ""
echo "✅ 合同创建完成"

# 创建 20 个订单
echo -e "\n🛒 创建 20 个订单..."
for i in {1..20}; do
  code=$(printf "ORD-%06d" $i)
  contract_code=$(printf "CT-%06d" $i)
  amount=$((i * i * 1000 + 10000))
  response=$(curl -s -X POST "$API_BASE/orders" \
    -H "Content-Type: application/json" \
    -d "{
      \"orderNumber\": \"$code\",
      \"contractCode\": \"$contract_code\",
      \"customerName\": \"测试客户$i\",
      \"projectName\": \"测试项目$i\",
      \"productName\": \"测试产品$i\",
      \"productSpecification\": \"标准版\",
      \"quantity\": $i,
      \"unitPrice\": $((i * 1000 + 1000)),
      \"orderAmount\": $amount,
      \"orderDate\": \"2024-01-${printf '%02d' $((i % 28 + 1))}\",
      \"deliveryDate\": \"2024-02-${printf '%02d' $((i % 28 + 1))}\",
      \"status\": \"pending\"
    }")
  
  if echo "$response" | grep -q '"success":true\|"订单编号已存在"'; then
    echo -ne "\r✅ 已创建 $i/20 个订单"
  else
    echo -ne "\r⚠️  订单$i"
  fi
done
echo ""
echo "✅ 订单创建完成"

# 创建 20 个任务
echo -e "\n✅ 创建 20 个任务..."
task_names=("需求分析" "系统设计" "数据库设计" "前端开发" "后端开发" "接口开发" "单元测试" "集成测试" "性能测试" "用户验收" "文档编写" "代码审查" "Bug 修复" "功能优化" "部署上线" "系统培训" "技术支持" "版本更新" "安全加固" "性能调优")
for i in {1..20}; do
  task_name=${task_names[$((i-1))]}
  response=$(curl -s -X POST "$API_BASE/tasks" \
    -H "Content-Type: application/json" \
    -d "{
      \"projectId\": 1,
      \"title\": \"任务$i：$task_name\",
      \"description\": \"这是任务$i的详细描述，需要完成$task_name工作\",
      \"status\": \"todo\",
      \"priority\": \"high\",
      \"assignee\": \"开发$i\",
      \"startDate\": \"2024-01-01\",
      \"dueDate\": \"2024-12-31\",
      \"estimatedHours\": $((i * 4 + 4)),
      \"actualHours\": $((i * 3 + 3))
    }")
  
  if echo "$response" | grep -q '"success":true'; then
    echo -ne "\r✅ 已创建 $i/20 个任务"
  else
    echo -ne "\r⚠️  任务$i"
  fi
done
echo ""
echo "✅ 任务创建完成"

echo -e "\n============================================"
echo "✅ 所有测试数据创建完成！"
echo "============================================"
echo ""
echo "数据汇总:"
echo "  - 📦 产品：20 个"
echo "  - 👥 客户：20 个"
echo "  - 📊 项目：20 个"
echo "  - 📄 合同：20 个"
echo "  - 🛒 订单：20 个"
echo "  - ✅ 任务：20 个"
echo "============================================"
echo ""
echo "💡 提示: 如果提示数据已存在，说明之前已经创建过"
echo "============================================"
