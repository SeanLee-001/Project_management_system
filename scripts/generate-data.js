const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// 数据库 URL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('请设置 DATABASE_URL 环境变量');
  process.exit(1);
}

async function generateData() {
  console.log('开始生成测试数据...\n');
  
  const sqlStatements = [];
  
  // 1. 部门 (5 个)
  console.log('生成部门...');
  for (let i = 1; i <= 5; i++) {
    sqlStatements.push(`
      INSERT INTO departments (id, name, code, description, "isActive")
      VALUES (gen_random_uuid(), '测试部门${i}', 'DEPT${String(i).padStart(3, '0')}', '测试部门描述${i}', true)
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 2. 用户 (20 个)
  console.log('生成用户...');
  const userNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '王菲', '马云', '雷军', '马化腾', '李彦宏', '刘强东', '张一鸣', '黄峥', '宿华', '程维', '王小川'];
  for (let i = 1; i <= 20; i++) {
    sqlStatements.push(`
      INSERT INTO users (id, username, email, "fullName", role, "employeeNumber", phone, "isActive")
      VALUES (gen_random_uuid(), 'user${i}', 'user${i}@test.com', '${userNames[i-1]}', 'user', 'EMP${String(i).padStart(5, '0')}', '138${10000000 + i}', true)
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 3. 客户 (20 个)
  console.log('生成客户...');
  const companies = ['华为技术有限公司', '腾讯科技有限公司', '阿里巴巴集团', '百度集团', '字节跳动科技有限公司', '美团科技有限公司', '京东集团', '小米集团', 'OPPO 广东移动通信有限公司', 'VIVO 移动通信有限公司', '比亚迪股份有限公司', '宁德时代新能源科技股份有限公司', '格力电器股份有限公司', '美的集团', '海尔智家股份有限公司', 'TCL 科技集团股份有限公司', '海信集团', '创维集团', '联想集团', '华硕电脑股份有限公司'];
  for (let i = 1; i <= 20; i++) {
    sqlStatements.push(`
      INSERT INTO customers (id, "customerCode", "customerName", industry, level, contact, phone, email, address)
      VALUES (gen_random_uuid(), 'CUST${String(i).padStart(5, '0')}', '${companies[i-1]}', '${['电子', '互联网', '通信', '制造', '能源', '金融', '零售'][i % 7]}', '${['A', 'B', 'C', 'D'][i % 4]}', '${['张三', '李四', '王五', '赵六'][i % 4]}', '0755-${10000000 + i}', 'contact${i}@company.com', '深圳市南山区科技园${i}号楼')
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 4. 项目 (20 个)
  console.log('生成项目...');
  const projectNames = ['智能制造系统', 'ERP 管理系统', 'CRM 客户管理系统', 'OA 办公自动化系统', 'MES 生产执行系统', 'WMS 仓储管理系统', 'PLM 产品生命周期管理', 'SCM 供应链管理系统', 'HR 人力资源系统', 'FMS 财务管理系统', 'BI 商业智能系统', 'IoT 物联网平台', 'AI 人工智能平台', '大数据分析平台', '云计算平台', '移动应用开发', '微信公众号开发', '小程序开发', '电商平台', '官网建设'];
  for (let i = 1; i <= 20; i++) {
    const startDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    sqlStatements.push(`
      INSERT INTO projects (id, "projectCode", "projectName", "customerId", "managerId", "startDate", "endDate", "budget", status, priority, description)
      VALUES (gen_random_uuid(), 'PRO-${100 + i}', '${projectNames[i-1]}', (SELECT id FROM customers OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), (SELECT id FROM users OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), '${startDate.toISOString()}', '${endDate.toISOString()}', ${(Math.random() * 100 + 10).toFixed(2)}, '${['active', 'completed', 'paused'][i % 3]}', '${['low', 'medium', 'high'][i % 3]}', '这是项目描述${i}')
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 5. 任务 (40 个)
  console.log('生成任务...');
  const taskNames = ['需求分析', '系统设计', '数据库设计', '接口开发', '前端开发', '后端开发', '单元测试', '集成测试', '性能优化', 'Bug 修复', '文档编写', '代码审查', '部署上线', '用户培训', '运维支持'];
  for (let i = 1; i <= 40; i++) {
    const dueDate = new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
    sqlStatements.push(`
      INSERT INTO tasks (id, title, description, "projectId", "assignedTo", status, priority, "dueDate", "estimatedHours")
      VALUES (gen_random_uuid(), '${taskNames[i % 15]} - ${i}', '这是任务描述${i}', (SELECT id FROM projects OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), (SELECT id FROM users OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), '${['todo', 'in_progress', 'completed'][i % 3]}', '${['low', 'medium', 'high'][i % 3]}', '${dueDate.toISOString()}', ${(Math.random() * 40 + 4).toFixed(1)})
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 6. 合同 (20 个)
  console.log('生成合同...');
  const contractTypes = ['软件开发合同', '技术服务合同', '系统集成合同', '运维服务合同', '产品采购合同', '销售合同', '合作协议', '保密协议'];
  for (let i = 1; i <= 20; i++) {
    const signDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    sqlStatements.push(`
      INSERT INTO contracts (id, "contractNumber", "contractName", "customerId", "projectId", "contractType", amount, "signDate", "startDate", "endDate", status, "paymentTerms")
      VALUES (gen_random_uuid(), 'CT-${2024000 + i}', '${contractTypes[i % 8]}${i}', (SELECT id FROM customers OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), (SELECT id FROM projects OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), '${['sales', 'purchase', 'service'][i % 3]}', ${(Math.random() * 1000000 + 50000).toFixed(2)}, '${signDate.toISOString()}', '${signDate.toISOString()}', '${new Date(signDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()}', '${['active', 'completed', 'expired'][i % 3]}', '验收合格后 30 天内付款')
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 7. 订单 (40 个)
  console.log('生成订单...');
  const productNames = ['服务器', '交换机', '路由器', '防火墙', '存储设备', 'PC 电脑', '笔记本电脑', '打印机', '扫描仪', '投影仪'];
  for (let i = 1; i <= 40; i++) {
    const orderDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const deliveryDate = new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    sqlStatements.push(`
      INSERT INTO orders (id, "orderNumber", "contractId", "customerId", "projectId", "productName", specifications, quantity, price, amount, "orderDate", "deliveryDate", status)
      VALUES (gen_random_uuid(), 'PO-${10000 + i}', (SELECT id FROM contracts OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), (SELECT id FROM customers OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), (SELECT id FROM projects OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), '${productNames[i % 10]}', '规格型号${i}', ${Math.floor(Math.random() * 100 + 1)}, ${(Math.random() * 10000 + 1000).toFixed(2)}, ${(Math.random() * 1000000 + 10000).toFixed(2)}, '${orderDate.toISOString()}', '${deliveryDate.toISOString()}', '${['pending', 'processing', 'delivered', 'completed'][i % 4]}')
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 8. 产品 (20 个)
  console.log('生成产品...');
  const products = [['服务器', '高性能服务器'], ['交换机', '网络交换机'], ['路由器', '企业路由器'], ['防火墙', '网络安全防火墙'], ['存储设备', 'NAS 存储'], ['PC 电脑', '台式机'], ['笔记本电脑', '商务笔记本'], ['打印机', '激光打印机'], ['扫描仪', '高速扫描仪'], ['投影仪', '商务投影仪'], ['摄像头', '网络摄像头'], ['麦克风', '会议麦克风'], ['显示器', '液晶显示器'], ['键盘', '机械键盘'], ['鼠标', '无线鼠标'], ['耳机', '降噪耳机'], ['音响', '蓝牙音响'], ['UPS', '不间断电源'], ['机柜', '服务器机柜'], ['网线', '六类网线']];
  for (let i = 1; i <= 20; i++) {
    sqlStatements.push(`
      INSERT INTO products (id, "productCode", name, category, specifications, unit, price, stock, description)
      VALUES (gen_random_uuid(), 'PROD${String(i).padStart(5, '0')}', '${products[i-1][0]}', '${products[i-1][1]}', '规格参数${i}', '台', ${(Math.random() * 50000 + 1000).toFixed(2)}, ${Math.floor(Math.random() * 1000)}, '产品描述${i}')
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 9. 消息 (40 个)
  console.log('生成消息...');
  for (let i = 1; i <= 40; i++) {
    sqlStatements.push(`
      INSERT INTO messages (id, "senderId", "receiverId", title, content, type, "isRead")
      VALUES (gen_random_uuid(), (SELECT id FROM users OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), (SELECT id FROM users OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), '测试消息${i}', '这是一条测试消息内容${i}', '${['system', 'approval', 'task', 'order'][i % 4]}', ${Math.random() > 0.5})
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 10. 项目审批 (20 个)
  console.log('生成项目审批...');
  for (let i = 1; i <= 20; i++) {
    const createdAt = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    sqlStatements.push(`
      INSERT INTO project_approvals (id, "projectId", "approvalType", "applicantId", "currentApproverId", status, "currentLevel", "createdAt")
      VALUES (gen_random_uuid(), (SELECT id FROM projects OFFSET ${Math.floor(Math.random() * 20)} LIMIT 1), '${['new_project', 'edit_project', 'delete_project'][i % 3]}', (SELECT id FROM users OFFSET ${Math.floor(Math.random() * 10)} LIMIT 1), (SELECT id FROM users OFFSET ${Math.floor(Math.random() * 10)} LIMIT 1), '${['pending', 'approved', 'rejected'][i % 3]}', '${['level_1', 'level_2', 'level_3'][i % 3]}', '${createdAt.toISOString()}')
      ON CONFLICT DO NOTHING;
    `);
  }
  
  // 执行 SQL
  console.log('\n正在执行 SQL 语句...\n');
  
  const psqlCmd = `psql "${DATABASE_URL}" -c "${sqlStatements.join('')}"`;
  
  try {
    const { stdout, stderr } = await execAsync(psqlCmd);
    console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('\n✅ 测试数据生成完成!\n');
  } catch (error) {
    console.error('执行 SQL 时出错:', error.message);
  }
}

generateData();
