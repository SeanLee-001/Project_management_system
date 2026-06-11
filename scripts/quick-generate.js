const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID();
}

const users = [];
const customers = [];

// 生成用户数据
const userNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '王菲', '马云', '雷军', '马化腾', '李彦宏', '刘强东', '张一鸣', '黄峥', '宿华', '程维', '王小川'];
for (let i = 1; i <= 20; i++) {
  users.push({
    id: generateId(),
    username: `test${i}`,
    email: `test${i}@example.com`,
    fullName: userNames[i - 1],
    role: 'user',
    employeeNumber: `EMP${String(i).padStart(5, '0')}`,
    phone: `138${10000000 + i}`,
    isActive: true
  });
}

// 生成客户数据
const companies = ['华为技术有限公司', '腾讯科技有限公司', '阿里巴巴集团', '百度集团', '字节跳动科技有限公司', '美团科技有限公司', '京东集团', '小米集团', 'OPPO', 'VIVO', '比亚迪', '宁德时代', '格力电器', '美的集团', '海尔智家', 'TCL 科技', '海信集团', '创维集团', '联想集团', '华硕电脑'];
for (let i = 1; i <= 20; i++) {
  customers.push({
    id: generateId(),
    customerCode: `CUST${String(i).padStart(5, '0')}`,
    customerName: companies[i - 1],
    industry: ['电子', '互联网', '通信', '制造', '能源', '金融', '零售'][i % 7],
    level: ['A', 'B', 'C', 'D'][i % 4],
    contact: ['张三', '李四', '王五', '赵六'][i % 4],
    phone: `0755-${10000000 + i}`,
    email: `contact${i}@company.com`,
    address: `深圳市南山区科技园${i}号楼`
  });
}

// 输出为文件
const fs = require('fs');
fs.writeFileSync('/tmp/test-data.json', JSON.stringify({ users, customers }, null, 2));
console.log('✅ 测试数据已生成到 /tmp/test-data.json');
console.log(`用户：${users.length} 个`);
console.log(`客户：${customers.length} 个`);
