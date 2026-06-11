/**
 * 使用 Drizzle ORM 将测试数据插入数据库
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// 从环境变量获取数据库 URL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误：请设置 DATABASE_URL 环境变量');
  console.error('用法：DATABASE_URL="postgresql://..." node scripts/seed-database.js');
  process.exit(1);
}

// 检查数据库 URL 是否包含敏感信息
if (DATABASE_URL.includes('password=') || DATABASE_URL.includes('@')) {
  console.log('🔐 使用远程数据库连接...');
}

const DATA_DIR = '/tmp/test-data';

async function seed() {
  console.log('🚀 开始导入测试数据到数据库...\n');
  
  let client;
  try {
    // 创建数据库连接
    client = postgres(DATABASE_URL, { max: 1, idle_timeout: 0, max_lifetime: 0 });
    const db = drizzle(client);
    
    console.log('✅ 数据库连接成功\n');
    
    // 按顺序导入表（考虑外键依赖）
    const tableOrder = [
      'roles',
      'systemSettings', 
      'departments',
      'users',
      'customers',
      'customerContacts',
      'projects',
      'tasks',
      'contracts',
      'orders',
      'products',
      'messages',
      'projectApprovals',
      'projectApprovalSteps',
      'projectApprovalFlows',
      'approvalRequests',
      'approvalHistory',
      'systemLogs',
      'loginLogs',
      'assetFiles',
      'userPermissions',
      'departmentPermissions'
    ];
    
    let totalInserted = 0;
    
    for (const tableName of tableOrder) {
      const filePath = path.join(DATA_DIR, `${tableName}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  跳过：${tableName} (文件不存在)`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!data || data.length === 0) {
        console.log(`⏭️  跳过：${tableName} (数据为空)`);
        continue;
      }
      
      try {
        // 转换驼峰名为数据库列名
        const convertedData = data.map(row => {
          const converted = {};
          for (const [key, value] of Object.entries(row)) {
            // 驼峰转下划线
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            converted[dbKey] = value;
          }
          return converted;
        });
        
        // 批量插入
        const tableNameCamel = tableName.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
        
        // 使用 INSERT ... ON CONFLICT DO NOTHING 避免重复
        let insertSQL = '';
        let valuesSQL = '';
        
        if (data.length > 0) {
          const columns = Object.keys(convertedData[0]);
          const columnList = columns.map(c => `"${c}"`).join(', ');
          
          valuesSQL = convertedData.map(row => {
            return `(${columns.map(col => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (typeof val === 'number') return val.toString();
              // 字符串转义
              return `'${val.toString().replace(/'/g, "''")}'`;
            }).join(', ')})`;
          }).join(',\n');
          
          insertSQL = `INSERT INTO "${tableName}" (${columnList}) VALUES\n${valuesSQL} ON CONFLICT DO NOTHING;`;
        }
        
        await client.unsafe(insertSQL);
        
        console.log(`✅ ${tableName}: 插入 ${data.length} 条记录`);
        totalInserted += data.length;
        
      } catch (err) {
        console.error(`❌ ${tableName}: 插入失败 - ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 数据库导入完成！');
    console.log(`📊 总计插入：${totalInserted} 条记录`);
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error('\n❌ 数据库操作失败:', err.message);
    console.error('请检查 DATABASE_URL 是否正确配置');
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('\n👋 数据库连接已关闭\n');
    }
  }
}

seed();
