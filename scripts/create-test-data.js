#!/usr/bin/env node
/**
 * 通过 API 创建测试数据
 * 为每个主要表创建 20 组测试数据
 */

const API_BASE = "http://localhost:5000/api";

// 随机生成器
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => 
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// 测试数据
const names = [
  "张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十",
  "郑一", "王二", "李三", "张四", "刘五", "陈六", "杨七", "黄八",
  "徐九", "马十", "朱十一", "胡十二"
];

const companies = [
  "科技有限公司", "信息技术有限公司", "软件有限公司", "网络有限公司",
  "智能技术有限公司", "数据服务有限公司", "创意有限公司", "系统有限公司"
];

const projects = [
  "企业资源规划系统", "客户关系管理系统", "办公自动化系统", "电子商务平台",
  "移动应用开发", "大数据分析平台", "人工智能项目", "云计算平台",
  "物联网系统", "区块链应用", "智慧城市项目", "工业互联网平台",
  "智能制造系统", "数字营销平台", "供应链管理系统", "财务管理系统",
  "人力资源系统", "知识管理系统", "协同办公平台", "数据分析系统"
];

const products = [
  "标准版软件许可", "企业版软件许可", "专业版软件许可", "基础版软件许可",
  "云服务年费", "技术支持服务", "定制开发服务", "培训服务",
  "维护服务", "升级服务", "咨询服务", "实施服务",
  "部署服务", "集成服务", "测试服务", "运维服务",
  "安全服务", "性能优化服务", "数据迁移服务", "接口开发服务"
];

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res.json();
}

async function createCustomers() {
  console.log("\n👥 创建客户数据...");
  
  for (let i = 0; i < 20; i++) {
    const name = names[i % names.length];
    const company = `${name}${randomItem(companies)}`;
    
    const data = {
      customerName: name,
      companyName: company,
      industry: randomItem(["互联网", "金融", "制造", "零售", "教育", "医疗"]),
      scale: randomItem(["大型", "中型", "小型", "微型"]),
      level: randomItem(["A", "B", "C", "D"]),
      source: randomItem(["主动咨询", "客户推荐", "线上推广"]),
      status: "active",
      address: `${randomItem(["北京", "上海", "广州", "深圳", "杭州", "成都"])}市${randomInt(1, 500)}号`,
      website: `www.company${i + 1}.com`,
      email: `contact@company${i + 1}.com`,
      phone: `138${String(randomInt(10000000, 99999999))}`,
    };
    
    const result = await request("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      process.stdout.write(`\r✅ 已创建 ${i + 1}/20 个客户`);
    } else {
      console.error(`\n❌ 创建客户 ${name} 失败:`, result.error);
    }
  }
  console.log();
}

async function createContracts(customers = []) {
  console.log("\n📄 创建合同数据...");
  
  for (let i = 0; i < 20; i++) {
    const customer = customers[i % customers.length] || { id: 1, customerName: names[i % names.length] };
    const signDate = randomDate(new Date(2024, 0, 1), new Date());
    const endDate = new Date(signDate);
    endDate.setFullYear(endDate.getFullYear() + randomInt(1, 3));
    
    const data = {
      contractCode: `CT-${String(i + 1).padStart(6, '0')}`,
      contractName: `${customer.customerName}${randomItem(["开发", "服务", "销售", "采购"])}合同`,
      customerId: customer.id || 1,
      customerName: customer.customerName,
      contractDate: signDate.toISOString().split('T')[0],
      technicalManager: randomItem(names),
      technicalPhone: `138${String(randomInt(10000000, 99999999))}`,
      procurementManager: randomItem(names),
      procurementPhone: `139${String(randomInt(10000000, 99999999))}`,
      contractAmount: randomInt(100000, 3000000),
      status: randomItem(["active", "inactive"]),
      contractType: randomItem(["开发", "服务", "销售"]),
      paymentTerms: randomItem(["一次性", "分期", "按进度"]),
      startDate: signDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
    
    const result = await request("/contracts", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      process.stdout.write(`\r✅ 已创建 ${i + 1}/20 个合同`);
    } else {
      console.error(`\n❌ 创建合同失败:`, result.error);
    }
  }
  console.log();
}

async function createOrders(contracts = []) {
  console.log("\n🛒 创建订单数据...");
  
  for (let i = 0; i < 20; i++) {
    const contract = contracts[i % contracts.length] || { id: 1, contractCode: `CT-${String(i + 1).padStart(6, '0')}`, customerName: names[i % names.length] };
    const orderDate = randomDate(new Date(2024, 0, 1), new Date());
    const deliveryDate = new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const data = {
      orderNumber: `ORD-${String(i + 1).padStart(6, '0')}`,
      contractCode: contract.contractCode,
      customerId: 1,
      customerName: contract.customerName,
      projectName: randomItem(projects),
      productId: randomInt(1, 20),
      productName: randomItem(products),
      productSpecification: "标准版",
      quantity: randomInt(1, 50),
      unitPrice: randomInt(1000, 50000),
      orderAmount: randomInt(10000, 500000),
      orderDate: orderDate.toISOString().split('T')[0],
      deliveryDate: deliveryDate.toISOString().split('T')[0],
      status: randomItem(["pending", "confirmed", "completed"]),
      remarks: `订单备注 ${i + 1}`,
    };
    
    const result = await request("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      process.stdout.write(`\r✅ 已创建 ${i + 1}/20 个订单`);
    } else {
      console.error(`\n❌ 创建订单失败:`, result.error);
    }
  }
  console.log();
}

async function createProjects() {
  console.log("\n📊 创建项目数据...");
  
  for (let i = 0; i < 20; i++) {
    const startDate = randomDate(new Date(2024, 0, 1), new Date(2025, 6, 1));
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + randomInt(3, 12));
    
    const data = {
      projectName: projects[i % projects.length],
      description: `${projects[i % projects.length]} - 专业解决方案`,
      status: randomItem(["active", "completed", "paused"]),
      priority: randomItem(["high", "medium", "low"]),
      budget: randomInt(100000, 5000000),
      manager: randomItem(names),
      technicalManager: randomItem(names),
      startDate: startDate.toISOString().split('T')[0],
      expectedDeliveryDate: endDate.toISOString().split('T')[0],
      progress: randomInt(0, 100),
    };
    
    const result = await request("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      process.stdout.write(`\r✅ 已创建 ${i + 1}/20 个项目`);
    } else {
      console.error(`\n❌ 创建项目失败:`, result.error);
    }
  }
  console.log();
}

async function createProducts() {
  console.log("\n📦 创建产品数据...");
  
  for (let i = 0; i < 20; i++) {
    const data = {
      name: products[i % products.length],
      code: `PROD-${String(i + 1).padStart(4, '0')}`,
      description: `${products[i % products.length]} - 专业级`,
      category: randomItem(["软件", "服务", "硬件"]),
      unitPrice: randomInt(1000, 100000),
      unit: randomItem(["套", "年", "次"]),
      specification: "标准规格",
      status: "active",
    };
    
    const result = await request("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      process.stdout.write(`\r✅ 已创建 ${i + 1}/20 个产品`);
    } else {
      console.error(`\n❌ 创建产品失败:`, result.error);
    }
  }
  console.log();
}

async function createTasks(projectId = 1) {
  console.log("\n✅ 创建任务数据...");
  
  const taskNames = [
    "需求分析", "系统设计", "数据库设计", "前端开发", "后端开发",
    "接口开发", "单元测试", "集成测试", "性能优化", "部署上线",
    "文档编写", "代码审查", "Bug 修复", "功能优化", "用户培训",
    "系统维护", "技术支持", "版本更新", "安全加固", "架构优化"
  ];
  
  for (let i = 0; i < 20; i++) {
    const data = {
      projectId: projectId,
      title: `${randomItem(projects)} - ${taskNames[i]}`,
      description: `${taskNames[i]}工作内容`,
      status: randomItem(["todo", "in_progress", "completed"]),
      priority: randomItem(["high", "medium", "low"]),
      assignee: randomItem(names),
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedHours: randomInt(4, 80),
    };
    
    const result = await request("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      process.stdout.write(`\r✅ 已创建 ${i + 1}/20 个任务`);
    } else {
      console.error(`\n❌ 创建任务失败:`, result.error);
    }
  }
  console.log();
}

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 开始生成测试数据...\n");
  
  try {
    console.log("📋 创建顺序:");
    console.log("  1. 客户");
    console.log("  2. 产品");
    console.log("  3. 合同");
    console.log("  4. 订单");
    console.log("  5. 项目");
    console.log("  6. 任务");
    console.log("=".repeat(60));
    
    await createCustomers();
    console.log("✅ 客户创建完成");
    
    await createProducts();
    console.log("✅ 产品创建完成");
    
    // 获取合同列表
    const contracts = [];
    await createContracts(contracts);
    console.log("✅ 合同创建完成");
    
    await createOrders(contracts);
    console.log("✅ 订单创建完成");
    
    await createProjects();
    console.log("✅ 项目创建完成");
    
    // 为第一个项目创建任务
    await createTasks(1);
    console.log("✅ 任务创建完成");
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ 所有测试数据生成完成！\n");
    console.log("数据汇总:");
    console.log("  - 客户：20 个");
    console.log("  - 产品：20 个");
    console.log("  - 合同：20 个");
    console.log("  - 订单：20 个");
    console.log("  - 项目：20 个");
    console.log("  - 任务：20 个");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ 生成测试数据失败:", error);
    throw error;
  }
}

// 运行
main().catch(console.error);
