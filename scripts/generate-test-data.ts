/**
 * 批量生成测试数据脚本
 * 为系统每个主要表格生成 20 条测试数据
 */

import { neon } from '@neondatabase/serverless';

// 数据库连接
const DATABASE_URL = process.env.DATABASE_URL || '';

// 测试数据配置
const TEST_CONFIG = {
  users: 20,
  departments: 5,
  customers: 20,
  projects: 20,
  tasks: 40, // 每个项目 2 个任务
  contracts: 20,
  orders: 40, // 每个合同 2 个订单
  products: 20,
  messages: 40,
  projectApprovals: 20,
};

// 辅助函数：生成随机 ID
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 辅助函数：随机选择
const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// 辅助函数：随机日期
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// 测试数据生成器
class TestDataGenerator {
  private sql: any;
  private userIds: string[] = [];
  private departmentIds: string[] = [];
  private customerIds: string[] = [];
  private projectIds: string[] = [];
  private contractIds: string[] = [];
  private productIds: string[] = [];

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  // 生成部门
  async generateDepartments(count: number) {
    console.log(`生成 ${count} 个部门...`);
    const depts = [
      '研发部', '销售部', '市场部', '生产部', '质量部',
      '采购部', '财务部', '人力资源部', '行政部', '客服部'
    ];

    for (let i = 0; i < count; i++) {
      const id = generateId();
      await this.sql`
        INSERT INTO departments (id, name, code, description, "isActive")
        VALUES (${id}, ${`测试部门${i + 1}`}, ${`DEPT${String(i + 1).padStart(3, '0')}`}, ${`测试部门描述${i + 1}`}, true)
        ON CONFLICT (id) DO NOTHING
      `;
      this.departmentIds.push(id);
    }
    console.log(`✓ 部门生成完成`);
  }

  // 生成用户
  async generateUsers(count: number) {
    console.log(`生成 ${count} 个用户...`);
    const names = [
      '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
      '郑一', '王菲', '马云', '雷军', '周鸿祎', '刘强东', '张一鸣',
      '黄峥', '宿华', '程维', '王小川', '李彦宏'
    ];

    for (let i = 0; i < count; i++) {
      const id = generateId();
      const name = names[i % names.length];
      await this.sql`
        INSERT INTO users (id, username, email, "fullName", role, "employeeNumber", phone, "isActive")
        VALUES (
          ${id},
          ${`user${i + 1}`},
          ${`user${i + 1}@test.com`},
          ${name},
          'user',
          ${`EMP${String(i + 1).padStart(5, '0')}`},
          ${`138${String(10000000 + i)}`},
          true
        )
        ON CONFLICT (id) DO NOTHING
      `;
      this.userIds.push(id);
    }
    console.log(`✓ 用户生成完成`);
  }

  // 生成客户
  async generateCustomers(count: number) {
    console.log(`生成 ${count} 个客户...`);
    const companies = [
      '华为技术有限公司', '腾讯科技有限公司', '阿里巴巴集团', '百度集团',
      '字节跳动科技有限公司', '美团科技有限公司', '京东集团', '小米集团',
      'OPPO 广东移动通信有限公司', 'VIVO 移动通信有限公司', '比亚迪股份有限公司',
      '宁德时代新能源科技股份有限公司', '格力电器股份有限公司', '美的集团',
      '海尔智家股份有限公司', 'TCL 科技集团股份有限公司', '海信集团',
      '创维集团', '联想集团', '华硕电脑股份有限公司'
    ];

    for (let i = 0; i < count; i++) {
      const id = generateId();
      await this.sql`
        INSERT INTO customers (id, "customerCode", "customerName", industry, level, contact, phone, email, address)
        VALUES (
          ${id},
          ${`CUST${String(i + 1).padStart(5, '0')}`},
          ${companies[i % companies.length]},
          ${randomPick(['电子', '互联网', '通信', '制造', '能源', '金融', '零售'])},
          ${randomPick(['A', 'B', 'C', 'D'])},
          ${randomPick(['张三', '李四', '王五', '赵六'])},
          ${`0755-${String(10000000 + i)}`},
          ${`contact${i + 1}@company.com`},
          ${`深圳市南山区科技园${i + 1}号楼`}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      this.customerIds.push(id);
    }
    console.log(`✓ 客户生成完成`);
  }

  // 生成项目
  async generateProjects(count: number) {
    console.log(`生成 ${count} 个项目...`);
    const projectNames = [
      '智能制造系统', 'ERP 管理系统', 'CRM 客户管理系统', 'OA 办公自动化系统',
      'MES 生产执行系统', 'WMS 仓储管理系统', 'PLM 产品生命周期管理', 'SCM 供应链管理系统',
      'HR 人力资源系统', 'FMS 财务管理系统', 'BI 商业智能系统', 'IoT 物联网平台',
      'AI 人工智能平台', '大数据分析平台', '云计算平台', '移动应用开发',
      '微信公众号开发', '小程序开发', '电商平台', '官网建设'
    ];

    for (let i = 0; i < count; i++) {
      const id = generateId();
      const startDate = randomDate(new Date(2024, 0, 1), new Date());
      const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      await this.sql`
        INSERT INTO projects (
          id, "projectCode", "projectName", "customerId", "managerId",
          "startDate", "endDate", "budget", "status", "priority", description
        ) VALUES (
          ${id},
          ${`PRO-${String(100 + i)}`},
          ${projectNames[i % projectNames.length]},
          ${randomPick(this.customerIds)},
          ${randomPick(this.userIds)},
          ${startDate.toISOString()},
          ${endDate.toISOString()},
          ${(Math.random() * 100 + 10).toFixed(2)},
          ${randomPick(['active', 'completed', 'paused'])},
          ${randomPick(['low', 'medium', 'high'])},
          ${`这是项目描述${i + 1}`}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      this.projectIds.push(id);
    }
    console.log(`✓ 项目生成完成`);
  }

  // 生成任务
  async generateTasks(count: number) {
    console.log(`生成 ${count} 个任务...`);
    const taskNames = [
      '需求分析', '系统设计', '数据库设计', '接口开发', '前端开发',
      '后端开发', '单元测试', '集成测试', '性能优化', 'Bug 修复',
      '文档编写', '代码审查', '部署上线', '用户培训', '运维支持'
    ];

    const usedProjectIds = this.projectIds.slice(0, 20);
    for (let i = 0; i < count; i++) {
      const id = generateId();
      const dueDate = randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      
      await this.sql`
        INSERT INTO tasks (
          id, title, description, "projectId", "assignedTo",
          status, priority, "dueDate", "estimatedHours"
        ) VALUES (
          ${id},
          ${`${randomPick(taskNames)} - ${i + 1}`},
          ${`这是任务描述${i + 1}`},
          ${randomPick(usedProjectIds)},
          ${randomPick(this.userIds)},
          ${randomPick(['todo', 'in_progress', 'completed'])},
          ${randomPick(['low', 'medium', 'high'])},
          ${dueDate.toISOString()},
          ${(Math.random() * 40 + 4).toFixed(1)}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ 任务生成完成`);
  }

  // 生成合同
  async generateContracts(count: number) {
    console.log(`生成 ${count} 个合同...`);
    const contractNames = [
      '软件开发合同', '技术服务合同', '系统集成合同', '运维服务合同',
      '产品采购合同', '销售合同', '合作协议', '保密协议'
    ];

    for (let i = 0; i < count; i++) {
      const id = generateId();
      const signDate = randomDate(new Date(2024, 0, 1), new Date());
      
      await this.sql`
        INSERT INTO contracts (
          id, "contractNumber", "contractName", "customerId", "projectId",
          "contractType", "amount", "signDate", "startDate", "endDate",
          status, "paymentTerms"
        ) VALUES (
          ${id},
          ${`CT-${String(2024000 + i)}`},
          ${`${randomPick(contractNames)}${i + 1}`},
          ${randomPick(this.customerIds)},
          ${randomPick(this.projectIds)},
          ${randomPick(['sales', 'purchase', 'service'])},
          ${(Math.random() * 1000000 + 50000).toFixed(2)},
          ${signDate.toISOString()},
          ${signDate.toISOString()},
          ${new Date(signDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()},
          ${randomPick(['active', 'completed', 'expired'])},
          '验收合格后 30 天内付款'
        )
        ON CONFLICT (id) DO NOTHING
      `;
      this.contractIds.push(id);
    }
    console.log(`✓ 合同生成完成`);
  }

  // 生成订单
  async generateOrders(count: number) {
    console.log(`生成 ${count} 个订单...`);
    const productNames = [
      '服务器', '交换机', '路由器', '防火墙', '存储设备',
      'PC 电脑', '笔记本电脑', '打印机', '扫描仪', '投影仪'
    ];

    const usedContractIds = this.contractIds.slice(0, 20);
    for (let i = 0; i < count; i++) {
      const id = generateId();
      const orderDate = randomDate(new Date(2024, 0, 1), new Date());
      
      await this.sql`
        INSERT INTO orders (
          id, "orderNumber", "contractId", "customerId", "projectId",
          "productName", specifications, quantity, price, amount,
          "orderDate", "deliveryDate", status
        ) VALUES (
          ${id},
          ${`PO-${String(10000 + i)}`},
          ${randomPick(usedContractIds)},
          ${randomPick(this.customerIds)},
          ${randomPick(this.projectIds)},
          ${randomPick(productNames)},
          ${`规格型号${i + 1}`},
          ${Math.floor(Math.random() * 100 + 1)},
          ${(Math.random() * 10000 + 1000).toFixed(2)},
          ${(Math.random() * 1000000 + 10000).toFixed(2)},
          ${orderDate.toISOString()},
          ${new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()},
          ${randomPick(['pending', 'processing', 'delivered', 'completed'])}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ 订单生成完成`);
  }

  // 生成产品
  async generateProducts(count: number) {
    console.log(`生成 ${count} 个产品...`);
    const products = [
      ['服务器', '高性能服务器'], ['交换机', '网络交换机'], ['路由器', '企业路由器'],
      ['防火墙', '网络安全防火墙'], ['存储设备', 'NAS 存储'], ['PC 电脑', '台式机'],
      ['笔记本电脑', '商务笔记本'], ['打印机', '激光打印机'], ['扫描仪', '高速扫描仪'],
      ['投影仪', '商务投影仪'], ['摄像头', '网络摄像头'], ['麦克风', '会议麦克风'],
      ['显示器', '液晶显示器'], ['键盘', '机械键盘'], ['鼠标', '无线鼠标'],
      ['耳机', '降噪耳机'], ['音响', '蓝牙音响'], ['UPS', '不间断电源'],
      ['机柜', '服务器机柜'], ['网线', '六类网线']
    ];

    for (let i = 0; i < count; i++) {
      const id = generateId();
      await this.sql`
        INSERT INTO products (
          id, "productCode", name, category, specifications,
          unit, price, stock, description
        ) VALUES (
          ${id},
          ${`PROD${String(i + 1).padStart(5, '0')}`},
          ${products[i][0] + (i + 1)},
          ${products[i][1]},
          ${`规格参数${i + 1}`},
          '台',
          ${(Math.random() * 50000 + 1000).toFixed(2)},
          ${Math.floor(Math.random() * 1000)},
          ${`产品描述${i + 1}`}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      this.productIds.push(id);
    }
    console.log(`✓ 产品生成完成`);
  }

  // 生成消息
  async generateMessages(count: number) {
    console.log(`生成 ${count} 条消息...`);
    const usedUserIds = this.userIds;

    for (let i = 0; i < count; i++) {
      const id = generateId();
      await this.sql`
        INSERT INTO messages (
          id, "senderId", "receiverId", title, content, type, "isRead"
        ) VALUES (
          ${id},
          ${randomPick(usedUserIds)},
          ${randomPick(usedUserIds)},
          ${`测试消息${i + 1}`},
          ${`这是一条测试消息内容${i + 1}`},
          ${randomPick(['system', 'approval', 'task', 'order'])},
          ${Math.random() > 0.5}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ 消息生成完成`);
  }

  // 生成项目审批
  async generateProjectApprovals(count: number) {
    console.log(`生成 ${count} 个审批记录...`);
    const usedProjectIds = this.projectIds.slice(0, 20);
    const usedUserIds = this.userIds.slice(0, 10);
    const approvalTypes = ['new_project', 'edit_project', 'delete_project'];

    for (let i = 0; i < count; i++) {
      const id = generateId();
      const createdAt = randomDate(new Date(2024, 0, 1), new Date());
      
      await this.sql`
        INSERT INTO project_approvals (
          id, "projectId", "approvalType", "applicantId", "currentApproverId",
          status, "currentLevel", "createdAt"
        ) VALUES (
          ${id},
          ${randomPick(usedProjectIds)},
          ${randomPick(approvalTypes)},
          ${randomPick(usedUserIds)},
          ${randomPick(usedUserIds)},
          ${randomPick(['pending', 'approved', 'rejected'])},
          ${randomPick(['level_1', 'level_2', 'level_3'])},
          ${createdAt.toISOString()}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ 审批记录生成完成`);
  }

  // 执行所有生成器
  async run() {
    console.log('\n=== 开始生成测试数据 ===\n');
    
    // 按顺序生成，确保外键依赖
    await this.generateDepartments(5);
    await this.generateUsers(20);
    await this.generateCustomers(20);
    await this.generateProjects(20);
    await this.generateTasks(40);
    await this.generateContracts(20);
    await this.generateOrders(40);
    await this.generateProducts(20);
    await this.generateMessages(40);
    await this.generateProjectApprovals(20);

    console.log('\n=== 测试数据生成完成 ===\n');
    console.log('生成的数据量:');
    console.log(`  部门：${this.departmentIds.length}`);
    console.log(`  用户：${this.userIds.length}`);
    console.log(`  客户：${this.customerIds.length}`);
    console.log(`  项目：${this.projectIds.length}`);
    console.log(`  任务：40`);
    console.log(`  合同：20`);
    console.log(`  订单：40`);
    console.log(`  产品：20`);
    console.log(`  消息：40`);
    console.log(`  审批：20`);
  }
}

// 执行脚本
if (process.env.DATABASE_URL) {
  const generator = new TestDataGenerator(process.env.DATABASE_URL);
  generator.run().catch(console.error);
} else {
  console.error('请设置 DATABASE_URL 环境变量');
  process.exit(1);
}
