const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/test-data';
const OUTPUT_FILE = '/workspace/scripts/seed-final.sql';

// 特殊列名映射（驼峰转下划线的特殊情况）
const specialColumnMap = {
  'loginIP': 'login_ip',
  'loginDuration': 'login_duration',
  'loginDevice': 'login_device',
  'level1ApproverId': 'level_1_approver_id',
  'level1ApproverRole': 'level_1_approver_role',
  'level2ApproverId': 'level_2_approver_id',
  'level2ApproverRole': 'level_2_approver_role',
  'level3ApproverId': 'level_3_approver_id',
  'level3ApproverRole': 'level_3_approver_role',
  'employeeNumber': 'employee_number',
  'fullName': 'full_name',
  'isActive': 'is_active',
  'isFirstLogin': 'is_first_login',
  'passwordExpireAt': 'password_expire_at',
  'approvalStatus': 'approval_status',
  'approvedBy': 'approved_by',
  'approvedAt': 'approved_at',
  'rejectReason': 'reject_reason',
  'macAddress': 'mac_address',
  'lastLoginTime': 'last_login_time',
  'loginDuration': 'login_duration',
  'menuConfiguration': 'menu_configuration'
};

function toDbColumn(col) {
  if (specialColumnMap[col]) return specialColumnMap[col];
  return col.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function generateSQL() {
  let sql = '-- 测试数据 Seed SQL (最终版)\n';
  sql += '-- 执行：psql postgresql://postgres:admin123@localhost:5432/project_management -f seed-final.sql\n\n';
  
  const fileToTableMap = {
    'roles': 'roles',
    'systemSettings': 'system_settings',
    'departments': 'departments',
    'users': 'users',
    'userPermissions': 'user_permissions',
    'departmentPermissions': 'department_permissions',
    'customers': 'customers',
    'customerContacts': 'customer_contacts',
    'projects': 'projects',
    'tasks': 'tasks',
    'contracts': 'contracts',
    'orders': 'orders',
    'products': 'products',
    'messages': 'messages',
    'projectApprovals': 'project_approvals',
    'projectApprovalSteps': 'project_approval_steps',
    'projectApprovalFlows': 'project_approval_flows',
    'approvalRequests': 'approval_requests',
    'approvalHistory': 'approval_history',
    'systemLogs': 'system_logs',
    'loginLogs': 'login_logs',
    'assetFiles': 'asset_files'
  };
  
  let totalRecords = 0;
  
  for (const [fileName, tableName] of Object.entries(fileToTableMap)) {
    const filePath = path.join(DATA_DIR, `${fileName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️ 跳过：${tableName} (文件不存在)`);
      continue;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!data || data.length === 0) {
      console.log(`⏭️ 跳过：${tableName} (数据为空)`);
      continue;
    }
    
    try {
      const columns = Object.keys(data[0]);
      const dbColumns = columns.map(c => toDbColumn(c));
      const columnList = dbColumns.map(c => `"${c}"`).join(', ');
      
      const values = data.map(row => {
        return `  (${columns.map((col, i) => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ')})`;
      }).join(',\n');
      
      sql += `INSERT INTO "${tableName}" (${columnList}) VALUES\n${values}\nON CONFLICT (id) DO NOTHING;\n\n`;
      
      totalRecords += data.length;
      console.log(`✅ ${tableName}: ${data.length} 条`);
    } catch (err) {
      console.error(`❌ ${tableName}: ${err.message}`);
    }
  }
  
  sql += 'COMMIT;\n';
  
  fs.writeFileSync(OUTPUT_FILE, sql);
  
  console.log('\n✅ SQL 文件生成完成');
  console.log(`📊 总计：${totalRecords} 条记录`);
  console.log(`📁 文件：${OUTPUT_FILE}`);
  console.log(`📄 大小：${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

generateSQL();
