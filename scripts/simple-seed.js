const https = require('https');
const http = require('http');

const API_BASE = "http://localhost:5000/api";

const fetch = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, json: () => JSON.parse(data) });
        } catch {
          resolve({ ok: true, status: res.statusCode, json: () => ({}) });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
};

async function createTestData() {
  console.log("🚀 开始创建测试数据...\n");
  
  // 产品
  console.log("📦 创建产品...");
  for (let i = 1; i <= 20; i++) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `测试产品${i}`,
        code: `PROD-${String(i).padStart(4, '0')}`,
        category: '软件',
        unitPrice: i * 1000,
        unit: '套',
        specification: '标准版',
        status: 'active'
      })
    });
    if (res.ok) process.stdout.write(`\r✓ 产品 ${i}/20`);
  }
  console.log(" 完成");
  
  // 客户  
  console.log("\n👥 创建客户...");
  for (let i = 1; i <= 20; i++) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerCode: `CUST-${String(i).padStart(4, '0')}`,
        customerName: `测试客户${i}`,
        customerType: '企业',
        status: 'active',
        address: `北京市朝阳区${i}大街`,
        phone: `1380013${String(i).padStart(4, '0')}`
      })
    });
    if (res.ok) process.stdout.write(`\r✓ 客户 ${i}/20`);
  }
  console.log(" 完成");
  
  // 项目
  console.log("\n📊 创建项目...");
  const names = ["张三","李四","王五","赵六","钱七","孙八","周九","吴十","郑一","王二","李三","张四","刘五","陈六","杨七","黄八","徐九","马十","朱十一","胡十二"];
  for (let i = 1; i <= 20; i++) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: `测试项目${i}`,
        description: `项目${i}描述`,
        customerName: `测试客户${i}`,
        status: 'active',
        priority: 'high',
        budget: i * 100000,
        manager: names[i-1],
        startDate: '2024-01-01',
        progress: i * 5
      })
    });
    if (res.ok) process.stdout.write(`\r✓ 项目 ${i}/20`);
  }
  console.log(" 完成");
  
  // 订单
  console.log("\n🛒 创建订单...");
  for (let i = 1; i <= 20; i++) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: `ORD-${String(i).padStart(6, '0')}`,
        customerName: `测试客户${i}`,
        projectName: `测试项目${i}`,
        productName: `测试产品${i}`,
        quantity: i,
        unitPrice: i * 1000,
        orderAmount: i * i * 1000,
        orderDate: '2024-01-15',
        status: 'pending'
      })
    });
    if (res.ok) process.stdout.write(`\r✓ 订单 ${i}/20`);
  }
  console.log(" 完成");
  
  console.log("\n✅ 测试数据创建完成！\n");
}

createTestData().catch(console.error);
