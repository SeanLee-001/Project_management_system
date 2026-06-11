#!/bin/bash
set -Eeuo pipefail

# 数据库备份脚本
# 该脚本从运行中的开发环境导出数据库数据

BACKUP_DIR="${COZE_WORKSPACE_PATH}/backups"
BACKUP_FILE="${BACKUP_DIR}/database-backup-$(date +%Y%m%d-%H%M%S).json"
API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"

echo "Starting database backup..."
echo "API Base URL: ${API_BASE_URL}"
echo "Backup file: ${BACKUP_FILE}"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

# 检查服务是否运行
echo "Checking if service is running..."
if ! curl -s -f "${API_BASE_URL}" > /dev/null 2>&1; then
  echo "Error: Service is not running at ${API_BASE_URL}"
  echo "Please start the development server first"
  exit 1
fi

# 导出数据库
echo "Exporting database data..."
RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/db/export")

# 检查响应
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "Database export successful"
  echo "$RESPONSE" > "${BACKUP_FILE}"

  # 获取数据统计
  STATS=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
users = len(data['data']['users'])
projects = len(data['data']['projects'])
tasks = len(data['data']['tasks'])
customers = len(data['data']['customers'])
contracts = len(data['data']['contracts'])
orders = len(data['data']['orders'])
products = len(data['data']['products'])
print(f'Users: {users}, Projects: {projects}, Tasks: {tasks}, Customers: {customers}, Contracts: {contracts}, Orders: {orders}, Products: {products}')
" 2>/dev/null || echo "Statistics unavailable")

  echo "Backup statistics: ${STATS}"
  echo "Backup completed successfully: ${BACKUP_FILE}"

  # 输出备份文件路径供后续使用
  echo "${BACKUP_FILE}"
else
  echo "Error: Failed to export database"
  echo "Response: $RESPONSE"
  exit 1
fi
