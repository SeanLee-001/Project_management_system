/**
 * 使用 pg 模块直接插入测试数据
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/test-data';

// 从环境变量获取数据库 URL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误：DATABASE_URL 未设置');
  process.exit(1);
}

async function seed() {
  console.log('🚀 开始导入测试数据...\n');
  
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('neon') ? { rejectUnauthorized: false } : false,
    max: 1,
    connectionTimeoutMillis: 10000
  });
  
  let client;
  try {
    client = await pool.connect();
    console.log('✅ 数据库连接成功\n');
    
    const tables = [
      'roles', 'system_settings', 'departments', 'users', 'user_permissions', 'department_permissions',
      'customers', 'customer_contacts', 'projects', 'tasks', 'contracts', 'orders', 'products',
      'messages', 'project_approvals', 'project_approval_steps', 'project_approval_flows',
      'approval_requests', 'approval_history', 'system_logs', 'login_logs', 'asset_files'
    ];
    
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
    
    let totalInserted = 0;
    
    for (const [fileName, tableName] of Object.entries(fileToTableMap)) {
      const filePath = path.join(DATA_DIR, `${fileName}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  跳过：${tableName}`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!data || data.length === 0) continue;
      
      try {
        const columns = Object.keys(data[0]);
        const dbColumns = columns.map(c => c.replace(/([A-Z])/g, '_$1').toLowerCase());
        const columnList = dbColumns.map(c => `"${c}"`).join(', ');
        
        const values = data.map(row => {
          return `(${columns.map((col, i) => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ')})`;
        }).join(',\n');
        
        const sql = `INSERT INTO "${tableName}" (${columnList}) VALUES\n${values}\nON CONFLICT DO NOTHING;`;
        
        await client.query(sql);
        
        console.log(`✅ ${tableName}: ${data.length} 条`);
        totalInserted += data.length;
        
      } catch (err) {
        console.error(`❌ ${tableName}: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ 导入完成！总计：${totalInserted} 条记录`);
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error('\n❌ 错误:', err.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.release();
      await pool.end();
      console.log('\n👋 连接已关闭\n');
    }
  }
}

seed();
