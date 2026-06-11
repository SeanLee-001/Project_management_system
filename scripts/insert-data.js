/**
 * 将测试数据插入数据库
 * 通过 API 端点插入数据
 */

const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = '/tmp/test-data';

// 生成 INSERT 语句
function generateInsertSQL(tableName, data) {
  if (!data || data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  const values = data.map(row => {
    return columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      if (typeof val === 'number') return val.toString();
      // 字符串需要转义
      const escaped = val.toString().replace(/'/g, "''");
      return `'${escaped}'`;
    }).join(', ');
  });
  
  const columnList = columns.map(c => {
    // 转换驼峰名为下划线
    const snakeCase = c.replace(/([A-Z])/g, '_$1').toLowerCase();
    return `"${snakeCase}"`;
  }).join(', ');
  
  return values.map(v => 
    `INSERT INTO "${tableName}" (${columnList}) VALUES (${v});`
  ).join('\n');
}

// 读取所有 JSON 文件并生成 SQL
const tables = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'summary.json');

let allSQL = '';
let totalRecords = 0;

tables.forEach(table => {
  const fileName = table.replace('.json', '');
  const filePath = `${DATA_DIR}/${table}`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log(`📝 处理表：${fileName} (${data.length} 条)`);
  
  const sql = generateInsertSQL(fileName, data);
  if (sql) {
    allSQL += `-- ${fileName}\n${sql}\n\n`;
    totalRecords += data.length;
  }
});

// 保存 SQL 文件
const sqlFilePath = '/tmp/insert-all-data.sql';
fs.writeFileSync(sqlFilePath, allSQL);

console.log('\n✅ SQL 文件生成完成');
console.log(`📊 总计：${totalRecords} 条记录`);
console.log(`📁 SQL 文件：${sqlFilePath}`);
console.log(`📄 文件大小：${(fs.statSync(sqlFilePath).size / 1024).toFixed(2)} KB`);
