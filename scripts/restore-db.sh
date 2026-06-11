#!/bin/bash
set -Eeuo pipefail

# 数据库恢复脚本
# 该脚本将备份的数据导入到数据库

BACKUP_FILE="${1:-${COZE_WORKSPACE_PATH}/backups/database-backup-latest.json}"
API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"

echo "Starting database restore..."
echo "API Base URL: ${API_BASE_URL}"
echo "Backup file: ${BACKUP_FILE}"

# 检查备份文件是否存在
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# 检查服务是否运行
echo "Checking if service is running..."
if ! curl -s -f "${API_BASE_URL}" > /dev/null 2>&1; then
  echo "Error: Service is not running at ${API_BASE_URL}"
  echo "Please start the service first"
  exit 1
fi

# 导入数据库
echo "Importing database data..."
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/db/import" \
  -H "Content-Type: application/json" \
  -d @"${BACKUP_FILE}")

# 检查响应
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "Database import successful"

  # 获取导入统计
  STATS=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
stats = data['data']['stats']
print(f\"Users: {stats['users']}, Projects: {stats['projects']}, Tasks: {stats['tasks']}, Customers: {stats['customers']}, Contracts: {stats['contracts']}, Orders: {stats['orders']}, Products: {stats['products']}\")
" 2>/dev/null || echo "Statistics unavailable")

  echo "Import statistics: ${STATS}"
  echo "Restore completed successfully"
else
  echo "Error: Failed to import database"
  echo "Response: $RESPONSE"
  exit 1
fi
