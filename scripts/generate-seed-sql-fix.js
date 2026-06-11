const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/test-data';
const OUTPUT_FILE = '/workspace/scripts/seed-data-fixed.sql';

function generateSQL() {
  let sql = '-- 测试数据 Seed SQL (修正版)\n';
  sql += '-- 执行：psql postgresql://postgres:admin123@localhost:5432/project_management -f seed-data-fixed.sql\n\n';
  sql += 'BEGIN;\n\n';
  
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
    
    if (!fs.existsSync(filePath)) continue;
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!data || data.length === 0) continue;
    
    sql += `-- ${tableName} (${data.length} 条)\n`;
    
    const columns = Object.keys(data[0]);
    const dbColumns = columns.map(c => {
      const snakeCase = c.replace(/([A-Z])/g, '_$1').toLowerCase();
      // 修正 login_i_p -> login_ip
      return snakeCase === 'login_i_p' ? 'login_ip' : snakeCase;
    });
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
  }
  
  sql += 'COMMIT;\n';
  
  fs.writeFileSync(OUTPUT_FILE, sql);
  
  console.log('✅ 修正版 SQL 文件生成完成');
  console.log(`📊 总计：${totalRecords} 条记录`);
  console.log(`📁 文件：${OUTPUT_FILE}`);
}

generateSQL();
