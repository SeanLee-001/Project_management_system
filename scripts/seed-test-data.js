#!/usr/bin/env node

/**
 * 测试数据生成脚本 - 为所有表创建20条测试数据
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');

// 使用 PGDATABASE_URL 环境变量
const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || 'postgresql://project_user:project_pass_2024@localhost:5432/project_management',
});
const db = drizzle(pool);

async function seed() {
  console.log('开始生成测试数据...\n');

  // 生成固定ID便于关联
  const uid = (i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;

  const userIds = Array.from({length: 20}, (_, i) => uid(1000 + i));
  const customerIds = Array.from({length: 20}, (_, i) => uid(2000 + i));
  const departmentIds = Array.from({length: 20}, (_, i) => uid(3000 + i));
  const projectIds = Array.from({length: 20}, (_, i) => uid(4000 + i));
  const contractIds = Array.from({length: 20}, (_, i) => uid(5000 + i));
  const orderIds = Array.from({length: 20}, (_, i) => uid(6000 + i));
  const productIds = Array.from({length: 20}, (_, i) => uid(7000 + i));
  const taskIds = Array.from({length: 20}, (_, i) => uid(8000 + i));
  const deliveryIds = Array.from({length: 20}, (_, i) => uid(9000 + i));
  const ruleIds = Array.from({length: 20}, (_, i) => uid(9100 + i));
  const ruleV2Ids = Array.from({length: 20}, (_, i) => uid(9200 + i));
  const approvalIds = Array.from({length: 20}, (_, i) => uid(9300 + i));
  const approvalRequestIds = Array.from({length: 20}, (_, i) => uid(9400 + i));
  const kbIds = Array.from({length: 20}, (_, i) => uid(9500 + i));

  const roles = ['system_admin','project_manager','mechanical_engineer','electrical_engineer','visual_engineer',
    'software_engineer','project_management','production_planning','quality_management','procurement_management',
    'department_manager','field_supervisor','project_member','business','safety_officer'];

  const names = ['张伟','李娜','王强','赵敏','刘洋','陈静','杨柳','黄明','周丽','吴涛',
    '孙磊','郑芳','钱勇','冯雪','沈鹏','韩冰','杨杰','朱婷','马超','胡波'];

  // 1. 部门 (20条) - 无外键依赖，需先创建
  console.log('  [1/31] 创建部门...');
  const depts = ['技术部','市场部','财务部','人事部','研发一部','研发二部','生产部','质量部','采购部','工程部',
    '销售部','售后部','行政部','法务部','信息部','物流部','仓储部','安环部','项目管理部','总经办'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO departments (id, department_code, department_name, description, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [departmentIds[i], `DEPT${String(i+1).padStart(2,'0')}`, depts[i], `${depts[i]}描述`, 'active']);
  }

  // 2. 用户 (20条) - 依赖部门
  console.log('  [2/31] 创建用户...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO users (id, username, email, password, full_name, role, department_id, is_active, is_first_login, approval_status, employee_number, phone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [userIds[i], `user${i+1}`, `user${i+1}@example.com`, '$2b$10$WRYK44Y7Ugs1d.zkL4JBuOCddL6Zm.FEQhZctxWHmOKYGzrRrbEpK',
        names[i], roles[i % 15], departmentIds[i % 20], true, i > 0, 'approved', `EMP${String(i+1).padStart(4,'0')}`, `1380000${String(i).padStart(4,'0')}`]);
  }

  // 3. 部门权限 (20条) - 依赖部门
  console.log('  [3/31] 创建部门权限...');
  const resources = ['projects','tasks','orders','contracts','customers','products','deliveries','messages','approvals','knowledge_base',
    'users','departments','roles','permissions','system_settings','system_logs','reports','finance','coding_rules','db_config'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO department_permissions (id, department_id, resource, permission) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [uid(3010+i), departmentIds[i], resources[i], i < 5 ? 'admin' : i < 10 ? 'write' : i < 15 ? 'read' : 'none']);
  }

  // 4. 客户 (20条)
  console.log('  [4/31] 创建客户...');
  const companies = ['华为技术','阿里巴巴','腾讯科技','百度在线','京东集团','字节跳动','美团点评','小米科技','网易集团','滴滴出行',
    '中兴通讯','格力电器','海尔集团','比亚迪','联想集团','科大讯飞','商汤科技','大疆创新','蔚来汽车','理想汽车'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO customers (id, customer_code, customer_name, phone, address, customer_type, status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [customerIds[i], `CUST${String(i+1).padStart(4,'0')}`, companies[i], `010-${60000000+i}`, `${['北京','上海','深圳','杭州','广州'][i%5]}市${['朝阳','浦东','南山','西湖','天河'][i%5]}区科技路${i+1}号`, i < 10 ? 'enterprise' : 'government', 'active']);
  }

  // 5. 客户联系人 (20条)
  console.log('  [5/31] 创建客户联系人...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO customer_contacts (id, customer_id, contact_type, contact_name, contact_phone, contact_email, position) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [uid(2100+i), customerIds[i], i % 2 === 0 ? 'purchasing' : 'technical', `联系人${names[i]}`, `1390000${String(i).padStart(4,'0')}`, `contact${i}@company.com`, i % 2 === 0 ? '采购经理' : '技术总监']);
  }

  // 6. 产品 (20条)
  console.log('  [6/31] 创建产品...');
  const products_list = ['工业相机','机械臂','PLC控制器','伺服电机','传感器模块','视觉系统','传送带','检测设备','包装机','激光打标机',
    'AGV小车','工业机器人','变频器','触摸屏','电源模块','减速器','气动元件','液压系统','数控系统','安全光栅'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO products (id, material_code, material_name, project_name, specification, description, status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [productIds[i], `MAT${String(i+1).padStart(5,'0')}`, products_list[i], `项目${String.fromCharCode(65+i%6)}`, `${['小型','中型','大型'][i%3]}-V${(i%5)+1}.0`, `${products_list[i]} - 详细描述`, 'active']);
  }

  // 7. 项目 (20条) - 需要 users, customers
  console.log('  [7/31] 创建项目...');
  const projStatuses = ['planning','in_progress','completed','suspended','cancelled'];
  for (let i = 0; i < 20; i++) {
    const startDate = `2024-${String((i%12)+1).padStart(2,'0')}-01`;
    const endDate = `2025-${String((i%12)+1).padStart(2,'0')}-28`;
    await pool.query(`INSERT INTO projects (id, name, description, status, start_date, end_date, owner_id, project_code, material_code, product_name,
      customer_id, customer_name, project_manager, project_manager_phone, approval_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO NOTHING`,
      [projectIds[i], `${companies[i]}自动化项目${i+1}期`, `${companies[i]}产线自动化改造`, projStatuses[i%5], startDate, endDate,
        userIds[i], `PRJ${String(i+1).padStart(4,'0')}`, productIds[i].replace('000',''), products_list[i],
        customerIds[i], companies[i], userIds[(i+1)%20], `1390000${String((i+1)%20).padStart(4,'0')}`, 'approved']);
  }

  // 8. 合同 (20条)
  console.log('  [8/31] 创建合同...');
  for (let i = 0; i < 20; i++) {
    const amount = (100000 + Math.floor(Math.random() * 900000)).toString();
    await pool.query(`INSERT INTO contracts (id, contract_code, contract_name, contract_date, customer_code, customer_id, customer_name,
      contract_amount, technical_manager, technical_phone, procurement_manager, procurement_phone, status, approval_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
      [contractIds[i], `CT${String(i+1).padStart(5,'0')}`, `${companies[i]}设备采购合同`, `2024-${String((i%12)+1).padStart(2,'0')}-15`,
        `CUST${String(i+1).padStart(4,'0')}`, customerIds[i], companies[i], amount,
        names[(i+2)%20], `1390000${String((i+2)%20).padStart(4,'0')}`, names[(i+3)%20], `1390000${String((i+3)%20).padStart(4,'0')}`,
        i < 15 ? 'active' : i < 18 ? 'completed' : 'terminated', 'approved']);
  }

  // 9. 订单 (20条)
  console.log('  [9/31] 创建订单...');
  for (let i = 0; i < 20; i++) {
    const qty = (i + 1) * 5;
    const unitPrice = 10000 + i * 5000;
    const total = (qty * unitPrice).toString();
    await pool.query(`INSERT INTO orders (id, order_number, order_date, contract_code, customer_code, customer_name,
      material_code, project_name, specification, quantity, delivery_date, status, project_progress,
      payment_terms, order_amount, prepay_ratio, prepay_amount, prepay_received, prepay_date,
      prepay_invoice_amount, prepay_invoice_date, prepay_invoiced,
      arrival_ratio, arrival_amount, arrival_received,
      acceptance_ratio, acceptance_amount, acceptance_received,
      warranty_ratio, warranty_amount, warranty_received,
      approval_status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
      ON CONFLICT (id) DO NOTHING`,
      [orderIds[i], `ORD${String(i+1).padStart(5,'0')}`, `2024-${String((i%12)+1).padStart(2,'0')}-10`,
        `CT${String(i+1).padStart(5,'0')}`, `CUST${String(i+1).padStart(4,'0')}`, companies[i],
        `MAT${String(i+1).padStart(5,'0')}`, `项目${String.fromCharCode(65+i%6)}`, `V${(i%3)+1}.0规格`,
        qty.toString(), `2024-${String(((i+2)%12)+1).padStart(2,'0')}-20`,
        i < 10 ? 'normal' : i < 15 ? 'in_progress' : i < 18 ? 'completed' : 'suspended',
        `${(i+1)*5}%`,
        `预付30%、到货40%、验收20%、质保款10%`, total,
        '30', (parseInt(total)*0.3).toString(), i % 2 === 0, `2024-${String((i%12)+1).padStart(2,'0')}-15`,
        (parseInt(total)*0.3).toString(), `2024-${String((i%12)+1).padStart(2,'0')}-20`, i % 2 === 0,
        '40', (parseInt(total)*0.4).toString(), i > 3,
        '20', (parseInt(total)*0.2).toString(), i > 7,
        '10', (parseInt(total)*0.1).toString(), i > 11,
        'approved', `订单备注${i+1}`]);
  }

  // 10. 任务 (20条)
  console.log('  [10/31] 创建任务...');
  const taskStatuses = ['todo','in_progress','done','cancelled'];
  const priorities = ['low','medium','high','urgent'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO tasks (id, project_id, task_code, title, description, status, priority,
      assignee, assignee_id, due_date, planned_start_date, planned_end_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [taskIds[i], projectIds[i], `TSK${String(i+1).padStart(4,'0')}`,
        `${['机械设计','电气调试','软件开发','视觉标定','系统集成','现场安装','质量检测','文档编写','设备调试','验收测试','方案评审','采购跟进','生产排期','物流协调','培训交付','硬件安装','软件测试','联调测试','试运行','终验收'][i]}`,
        `任务详细描述${i+1}`, taskStatuses[i%4], priorities[i%4],
        names[(i+1)%20], userIds[(i+1)%20], `2024-${String((i%12)+1).padStart(2,'0')}-${String((i%27)+1).padStart(2,'0')}`,
        `2024-${String((i%12)+1).padStart(2,'0')}-01`, `2024-${String(((i+1)%12)+1).padStart(2,'0')}-${String((i%27)+1).padStart(2,'0')}`]);
  }

  // 11. 送货 (20条)
  console.log('  [11/31] 创建送货记录...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO deliveries (id, delivery_number, order_id, order_number, customer_id, customer_name,
      project_id, project_name, contact_person, contact_phone, delivery_address, planned_delivery_date,
      actual_delivery_date, status, items, total_quantity, shipped_by, shipped_by_name, created_by, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) ON CONFLICT (id) DO NOTHING`,
      [deliveryIds[i], `DLV${String(i+1).padStart(5,'0')}`,
        orderIds[i], `ORD${String(i+1).padStart(5,'0')}`, customerIds[i], companies[i],
        projectIds[i], `${companies[i]}自动化项目${i+1}期`, names[(i+5)%20], `1390000${String((i+5)%20).padStart(4,'0')}`,
        `${['北京','上海','深圳','杭州','广州'][i%5]}市某区工厂路${i+1}号`,
        `2024-${String(((i+3)%12)+1).padStart(2,'0')}-01`, i < 12 ? `2024-${String(((i+3)%12)+1).padStart(2,'0')}-05` : null,
        i < 12 ? 'delivered' : i < 16 ? 'in_transit' : 'pending',
        JSON.stringify([{name:`设备${i+1}`, qty: i+1}]), i+1,
        userIds[(i+2)%20], names[(i+2)%20], userIds[i], `备注${i+1}`]);
  }

  // 12. 消息 (20条)
  console.log('  [12/31] 创建消息...');
  const msgTypes = ['personal','announcement','system_document','knowledge_base'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO messages (id, type, title, content, sender_id, receiver_id, is_read, is_pinned)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [uid(9600+i), msgTypes[i%4], `${i < 5 ? '个人' : '系统'}消息标题${i+1}`,
        `这是消息内容${i+1}，包含详细信息。`, userIds[0], i < 5 ? userIds[i+1] : null,
        i % 3 === 0, i < 3]);
  }

  // 13. 项目审批 (20条)
  console.log('  [13/31] 创建项目审批...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO project_approvals (id, project_id, approval_type, applicant_id, applicant_name,
      current_approver_id, current_approver_name, status, current_level, approved_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [approvalIds[i], projectIds[i], i < 10 ? 'project_create' : i < 15 ? 'project_change' : 'project_complete',
        userIds[i], names[i], userIds[(i+1)%20], names[(i+1)%20],
        i < 8 ? 'approved' : i < 12 ? 'pending' : i < 16 ? 'rejected' : 'cancelled',
        'level' + (i%3 + 1), i < 8 ? `2024-${String((i%12)+1).padStart(2,'0')}-${String((i%27)+1).padStart(2,'0')}` : null]);
  }

  // 14. 审批步骤 (20条)
  console.log('  [14/31] 创建审批步骤...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO project_approval_steps (id, approval_id, level, approver_id, approver_name, status, comment, approved_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [uid(9310+i), approvalIds[i], `level${(i%3)+1}`, userIds[(i+1)%20], names[(i+1)%20],
        i < 10 ? 'approved' : 'pending', i < 10 ? `审批意见${i+1}` : null,
        i < 10 ? `2024-${String((i%12)+1).padStart(2,'0')}-${String(((i*3)%27)+1).padStart(2,'0')}` : null]);
  }

  // 15. 审批流程 (20条)
  console.log('  [15/31] 创建审批流程...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO project_approval_flows (id, name, description, department_id, approval_type, is_enabled,
      level_1_approver_id, level_1_approver_role, level_2_approver_id, level_2_approver_role, level_3_approver_id, level_3_approver_role)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [uid(9320+i), `${depts[i]}审批流程`, `${depts[i]}标准审批流程`, departmentIds[i],
        i < 10 ? 'project_create' : i < 15 ? 'project_change' : 'project_complete', true,
        userIds[0], 'system_admin', userIds[(i+1)%20], roles[(i+1)%15], userIds[(i+2)%20], roles[(i+2)%15]]);
  }

  // 16. 审批请求 (20条)
  console.log('  [16/31] 创建审批请求...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO approval_requests (id, request_number, request_type, request_id, title, content,
      status, applicant_id, applicant_name, current_approver_id, current_approver_name, current_step, total_steps)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
      [approvalRequestIds[i], `APR${String(i+1).padStart(5,'0')}`, i < 10 ? 'order' : 'contract',
        i < 10 ? orderIds[i] : contractIds[i],
        `${i < 10 ? '订单' : '合同'}审批申请${i+1}`, JSON.stringify({amount: (i+1)*10000, reason: `测试审批${i+1}`}),
        i < 6 ? 'approved' : i < 10 ? 'pending' : i < 15 ? 'rejected' : 'cancelled',
        userIds[i], names[i], userIds[(i+1)%20], names[(i+1)%20],
        `level${(i%3)+1}`, `level${i < 12 ? 3 : 1}`]);
  }

  // 17. 审批历史 (20条)
  console.log('  [17/31] 创建审批历史...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO approval_history (id, request_id, step, approver_id, approver_name, action, action_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [uid(9410+i), approvalRequestIds[i], `level${(i%3)+1}`, userIds[(i+1)%20], names[(i+1)%20],
        i < 10 ? 'approved' : i < 15 ? 'rejected' : 'pending', `历史意见${i+1}`]);
  }

  // 18. 资产文件 (20条)
  console.log('  [18/31] 创建资产文件...');
  const fileTypes = ['pdf','docx','xlsx','jpg','png','dwg','step','zip','dxf','stp',
    'pdf','xlsx','png','docx','jpg','zip','dwg','pdf','png','xlsx'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO asset_files (id, project_id, file_name, file_key, file_size, file_type, file_path, description, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [uid(9420+i), projectIds[i], `${['技术协议','电气图纸','机械图纸','BOM清单','验收报告','测试记录','操作手册','维护手册','安装说明','培训材料',
        '调试记录','变更申请','进度报告','质量报告','安全评估','设计评审','方案说明','验收标准','交付清单','项目总结'][i]}.${fileTypes[i]}`,
        `projects/${projectIds[i]}/file_${i+1}`, `${(i+1)*1024*100}`, fileTypes[i],
        `/uploads/projects/${projectIds[i]}/file_${i+1}.${fileTypes[i]}`, `${['技术协议','电气图纸','机械图纸'][i%3]}描述${i+1}`, userIds[i]]);
  }

  // 19. 编码规则 (20条)
  console.log('  [19/31] 创建编码规则...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO coding_rules (id, category_name, category_code, first_digit, total_length, description, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [ruleIds[i], `分类${String.fromCharCode(65+i)}`, `CAT${String(i+1).padStart(2,'0')}`, `${(i%9)+1}`, '11', `编码规则描述${i+1}`, true]);
  }

  // 20. 编码分类 (20条)
  console.log('  [20/31] 创建编码分类...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO coding_categories (id, rule_id, category_level, code, name, description, sequence_start, sequence_current, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [uid(9130+i), ruleIds[i], `${(i%3)+1}`, `SUB${String(i+1).padStart(3,'0')}`, `子分类${i+1}`, `子分类描述${i+1}`, '1', `${i+1}`, true]);
  }

  // 21. 生成编码 (20条)
  console.log('  [21/31] 创建生成编码...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO generated_codes (id, code, material_name, rule_id, sequence_number, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [uid(9140+i), `CODE${String(i+1).padStart(8,'0')}`, `物料${String.fromCharCode(65+i)}`, ruleIds[i], `${i+1}`, 'active', userIds[0]]);
  }

  // 22. 编码规则V2 (20条)
  console.log('  [22/31] 创建编码规则V2...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO coding_rules_v2 (rule_id, code, name, description, is_active)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (rule_id) DO NOTHING`,
      [ruleV2Ids[i], `${String.fromCharCode(65+(i%26))}`, `规则${i+1}`, `V2编码规则描述${i+1}`, true]);
  }

  // 23. 编码分类V2 (20条)
  console.log('  [23/31] 创建编码分类V2...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO coding_categories_v2 (category_id, rule_id, category_level, code, name, description, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (category_id) DO NOTHING`,
      [uid(9210+i), ruleV2Ids[i], `${(i%4)+1}`, `${String.fromCharCode(65+(i%26))}`, `V2子分类${i+1}`, `V2子分类描述${i+1}`, true]);
  }

  // 24. 生成编码V2 (20条)
  console.log('  [24/31] 创建生成编码V2...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO generated_codes_v2 (record_id, code, material_name, rule_id, sequence_number, version, project_name, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (record_id) DO NOTHING`,
      [uid(9220+i), `V2C${String(i+1).padStart(5,'0')}`, `物料V2${String.fromCharCode(65+i)}`, ruleV2Ids[i],
        i+1, `${(i%3)+1}`, `项目${String.fromCharCode(65+i%6)}`, userIds[0]]);
  }

  // 25. 知识库 (20条)
  console.log('  [25/31] 创建知识库...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO knowledge_base (id, title, content, project_id, task_id, category, tags, created_by, view_count)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [kbIds[i], `知识库条目${i+1}: ${['机械设计规范','电气安全标准','软件架构指南','视觉算法参考','PLC编程技巧','机器人操作手册','质量管理体系','项目管理方法','供应链管理','成本控制',
        '安全生产规程','环保合规要求','数据管理标准','网络架构设计','技术协议模板','验收流程指南','维护保养手册','故障排查指南','选型参考手册','行业标准汇编'][i]}`,
        `这是知识库条目${i+1}的详细内容。包含了技术规范、操作流程和最佳实践。`, projectIds[i], taskIds[i],
        ['技术规范','操作指南','标准文档','经验总结','培训材料'][i%5],
        JSON.stringify(['自动化','工业','标准', companies[i]]), userIds[i], ((i+1)*37).toString()]);
  }

  // 26. 知识库附件 (20条)
  console.log('  [26/31] 创建知识库附件...');
  const kbFileTypes = ['pdf','docx','xlsx','png','pptx','zip'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO knowledge_base_attachments (id, knowledge_base_id, file_name, file_url, file_size, file_type, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [uid(9510+i), kbIds[i], `附件${i+1}.${kbFileTypes[i%6]}`,
        `https://storage.example.com/kb/${kbIds[i]}/file_${i+1}.${kbFileTypes[i%6]}`,
        `${(i+1)*500}`, kbFileTypes[i%6], userIds[i]]);
  }

  // 27. 登录日志 (20条)
  console.log('  [27/31] 创建登录日志...');
  const devices = ['Desktop','Mobile','Tablet','Desktop','Desktop','Mobile','Desktop','Tablet','Desktop','Mobile',
    'Desktop','Desktop','Mobile','Tablet','Desktop','Mobile','Desktop','Desktop','Tablet','Desktop'];
  const browsers = ['Chrome','Firefox','Safari','Edge','Chrome','Chrome','Firefox','Safari','Edge','Chrome',
    'Chrome','Safari','Edge','Firefox','Chrome','Safari','Chrome','Edge','Safari','Chrome'];
  const oss = ['Windows 11','macOS 14','iOS 17','Android 14','Windows 10','Ubuntu 22.04','macOS 14','iOS 17','Windows 11','Android 14',
    'Windows 10','macOS 13','iOS 16','Android 13','Windows 11','macOS 14','Ubuntu 24.04','Windows 10','iPadOS 17','Android 14'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO login_logs (id, user_id, username, employee_number, full_name, login_time, ip_address,
      user_agent, device_type, browser, os, login_method, login_status, is_sensitive_operation)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
      [uid(9700+i), userIds[i], `user${i+1}`, `EMP${String(i+1).padStart(4,'0')}`, names[i],
        `2024-${String((i%12)+1).padStart(2,'0')}-${String((i%28)+1).padStart(2,'0')} 08:${String((i%24)*2).padStart(2,'0')}:00+08`,
        `192.168.1.${i+1}`, `Mozilla/5.0 (${oss[i]})`, devices[i], browsers[i], oss[i],
        'password', i < 18 ? 'success' : 'failed', false]);
  }

  // 28. 系统日志 (20条)
  console.log('  [28/31] 创建系统日志...');
  const actions = ['create','update','delete','login','logout','export','import','approve','reject','view',
    'create','update','delete','approve','reject','login','logout','export','view','update'];
  const logResources = ['project','task','order','contract','customer','product','user','role','system','delivery',
    'project','task','order','contract','customer','system','approval','message','knowledge','user'];
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO system_logs (id, action, resource, resource_id, user_id, username, full_name, details, ip_address, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [uid(9710+i), actions[i], logResources[i], uid(4000+i), userIds[i%20], `user${(i%20)+1}`, names[i%20],
        `用户执行了${actions[i]}操作`, `192.168.1.${i+1}`, 'success']);
  }

  // 29. 用户权限 (20条)
  console.log('  [29/31] 创建用户权限...');
  for (let i = 0; i < 20; i++) {
    await pool.query(`INSERT INTO user_permissions (id, user_id, resource, permission) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [uid(9720+i), userIds[i], resources[i%20], i < 5 ? 'admin' : i < 10 ? 'write' : i < 15 ? 'read' : 'none']);
  }

  // 30. 系统设置 (已有2条，再补18条)
  console.log('  [30/31] 创建系统设置...');
  const settings = [
    ['company_address','某某市某某区科技园路100号'],
    ['company_phone','400-888-0000'],
    ['company_email','support@company.com'],
    ['watermark_enabled','true'],
    ['watermark_text','内部资料 注意保密'],
    ['auto_logout_minutes','30'],
    ['max_login_attempts','5'],
    ['default_language','zh-CN'],
    ['smtp_host','smtp.company.com'],
    ['smtp_port','587'],
    ['data_backup_enabled','true'],
    ['data_backup_interval','daily'],
    ['notification_enabled','true'],
    ['password_min_length','8'],
    ['session_timeout','1800'],
    ['file_upload_max_size','10485760'],
    ['audit_log_retention','90'],
    ['login_notification','true'],
  ];
  for (let i = 0; i < 18; i++) {
    await pool.query(`INSERT INTO system_settings (id, key, value, description) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [uid(9730+i), settings[i][0], settings[i][1], `系统设置项: ${settings[i][0]}`]);
  }

  // 31. 角色（已有15条，补5条自定义角色）
  console.log('  [31/31] 创建自定义角色...');
  const customRoles = [
    ['external_auditor','外部审计员','外部审计权限',false,true],
    ['intern','实习生','实习岗位权限',false,true],
    ['consultant','顾问','外部顾问权限',false,true],
    ['vendor','供应商','供应商访问权限',false,true],
    ['readonly','只读用户','仅查看权限',false,true],
  ];
  for (let i = 0; i < 5; i++) {
    await pool.query(`INSERT INTO roles (id, role_code, role_name, description, is_system, is_active) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (role_code) DO NOTHING`,
      [uid(9740+i), ...customRoles[i]]);
  }

  console.log('\n全部31张表测试数据生成完毕！');
  console.log(`总计: 约 ${31 * 20} 条记录`);
  await pool.end();
}

seed().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
