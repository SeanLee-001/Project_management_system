#!/usr/bin/env node
/**
 * 全量测试数据生成 - 20组覆盖所有32张表和业务流程
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: 'postgresql://project_user:project_pass_2024@localhost:5432/project_management' });
const sql = (q, p = []) => pool.query(q, p);

async function main() {
  console.log('=== 生成 20 组全量测试数据 ===\n');
  const hash = bcrypt.hashSync('test123', 10);

  // ===== 1. 部门 (5) =====
  const deptIds = ['d001','d002','d003','d004','d005'];
  await sql(`INSERT INTO departments (id, department_code, department_name, description, status) VALUES
    ('d001','engineering','工程技术部','机械/电气/视觉/软件工程','active'),
    ('d002','production','生产制造部','生产计划与执行','active'),
    ('d003','quality','质量管理部','质量检验与控制','active'),
    ('d004','procurement','采购管理部','物料采购与供应商管理','active'),
    ('d005','business','商务管理部','客户拓展与商务谈判','active')
  ON CONFLICT (department_code) DO NOTHING`);
  console.log('1. 部门: 5');

  // ===== 2. 角色 (10) =====
  const roleCodes = ['system_admin','project_manager','mechanical_engineer','electrical_engineer','visual_engineer','software_engineer','project_management','production_planning','quality_management','procurement_management'];
  const roleNames = ['系统管理员','项目经理','机械工程师','电气工程师','视觉工程师','软件工程师','项目管理','生产计划','质量管理','采购管理'];
  for (let i=0;i<10;i++) {
    await sql(`INSERT INTO roles (id, role_code, role_name, description, is_system, is_active) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (role_code) DO NOTHING`,
      [`r${String(i+1).padStart(2,'0')}`, roleCodes[i], roleNames[i], `${roleNames[i]}角色`, true, true]);
  }
  console.log('2. 角色: 10');

  // ===== 3. 用户 (20) =====
  const userIds=[], us = [
    ['u01','admin','admin@system.local','系统管理员','system_admin','d001'],
    ['u02','zhangwei','zhangwei@test.com','张伟','project_manager','d001'],
    ['u03','liming','liming@test.com','李明','project_manager','d005'],
    ['u04','wangfang','wangfang@test.com','王芳','project_management','d001'],
    ['u05','chenqiang','chenqiang@test.com','陈强','mechanical_engineer','d001'],
    ['u06','liuyang','liuyang@test.com','刘洋','mechanical_engineer','d001'],
    ['u07','zhaomin','zhaomin@test.com','赵敏','electrical_engineer','d001'],
    ['u08','sunlei','sunlei@test.com','孙磊','electrical_engineer','d001'],
    ['u09','zhoujie','zhoujie@test.com','周杰','visual_engineer','d001'],
    ['u10','wuping','wuping@test.com','吴平','software_engineer','d001'],
    ['u11','zhenghua','zhenghua@test.com','郑华','software_engineer','d001'],
    ['u12','huangli','huangli@test.com','黄丽','production_planning','d002'],
    ['u13','xugang','xugang@test.com','徐刚','production_planning','d002'],
    ['u14','linfeng','linfeng@test.com','林峰','quality_management','d003'],
    ['u15','heyun','heyun@test.com','何云','quality_management','d003'],
    ['u16','guowei','guowei@test.com','郭伟','procurement_management','d004'],
    ['u17','maxin','maxin@test.com','马新','procurement_management','d004'],
    ['u18','luojun','luojun@test.com','罗军','department_manager','d005'],
    ['u19','liangyan','liangyan@test.com','梁燕','project_member','d001'],
    ['u20','songrui','songrui@test.com','宋瑞','project_member','d005'],
  ];
  for (const u of us) {
    userIds.push(u[0]);
    await sql(`INSERT INTO users (id, username, email, password, full_name, role, department_id, is_active, is_first_login, approval_status) VALUES ($1,$2,$3,$4,$5,$6,$7,true,false,'approved') ON CONFLICT (username) DO NOTHING`, [u[0],u[1],u[2],hash,u[4],u[5],u[6]]);
  }
  console.log('3. 用户: 20 (密码: test123)');

  // ===== 4. 客户 (20) =====
  const custIds=[], custs = [
    ['c01','CUST-001','深圳华大智造科技股份有限公司','0755-36328888','深圳市盐田区'],
    ['c02','CUST-002','北京新能源汽车股份有限公司','010-88886666','北京市大兴区'],
    ['c03','CUST-003','上海联影医疗科技股份有限公司','021-67076666','上海市嘉定区'],
    ['c04','CUST-004','杭州海康威视数字技术股份有限公司','0571-88075998','杭州市滨江区'],
    ['c05','CUST-005','广州汽车集团股份有限公司','020-36236666','广州市番禺区'],
    ['c06','CUST-006','苏州汇川技术有限公司','0512-69568888','苏州市吴中区'],
    ['c07','CUST-007','武汉华星光电技术有限公司','027-87928888','武汉市东湖高新区'],
    ['c08','CUST-008','成都京东方光电科技有限公司','028-87968888','成都市高新区'],
    ['c09','CUST-009','东莞立讯精密工业股份有限公司','0769-82938888','东莞市松山湖'],
    ['c10','CUST-010','天津力神电池股份有限公司','022-23826666','天津市滨海新区'],
    ['c11','CUST-011','重庆长安汽车股份有限公司','023-67591666','重庆市江北区'],
    ['c12','CUST-012','南京埃斯顿自动化股份有限公司','025-52726666','南京市江宁区'],
    ['c13','CUST-013','青岛海尔生物医疗股份有限公司','0532-88938888','青岛市崂山区'],
    ['c14','CUST-014','厦门亿联网络技术股份有限公司','0592-2636666','厦门市湖里区'],
    ['c15','CUST-015','合肥美亚光电技术股份有限公司','0551-65316666','合肥市高新区'],
    ['c16','CUST-016','株洲中车时代电气股份有限公司','0731-28498888','株洲市石峰区'],
    ['c17','CUST-017','西安陕鼓动力股份有限公司','029-81326666','西安市高新区'],
    ['c18','CUST-018','佛山美的集团股份有限公司','0757-26338888','佛山市顺德区'],
    ['c19','CUST-019','无锡药明康德新药开发股份有限公司','0510-81856666','无锡市滨湖区'],
    ['c20','CUST-020','大连光洋科技集团有限公司','0411-88136666','大连市金普新区'],
  ];
  for (const c of custs) {
    custIds.push(c[0]);
    await sql(`INSERT INTO customers (id, customer_code, customer_name, phone, address, customer_type, status) VALUES ($1,$2,$3,$4,$5,'terminal','active') ON CONFLICT (customer_code) DO NOTHING`, c);
  }
  console.log('4. 客户: 20');

  // ===== 5. 客户联系人 (~30) =====
  const cNames = ['王经理','李工','张总','刘主管','陈先生','赵女士','周经理','吴工','孙总监','钱工'];
  for (let i=0;i<custIds.length;i++) {
    const n = (i%3)+1;
    for (let j=0;j<n;j++) {
      const nm = cNames[(i*2+j)%cNames.length];
      await sql(`INSERT INTO customer_contacts (customer_id, contact_type, contact_name, contact_phone, contact_email) VALUES ($1,$2,$3,$4,$5)`,
        [custIds[i], j===0?'技术联系人':'采购联系人', nm, `138${String(i*2+j+1).padStart(8,'0')}`, `c${nm}@cust${i+1}.com`]);
    }
  }
  console.log('5. 客户联系人: ~30');

  // ===== 6. 产品 (20) =====
  const productIds=[], prods = [
    ['p01','MAT-001','高精度伺服电机','自动化产线','AC220V/1.5KW','用于自动化装配线驱动'],
    ['p02','MAT-002','PLC控制柜','自动化产线','S7-1500系列','产线核心控制单元'],
    ['p03','MAT-003','工业机器人手臂','自动化产线','6轴/负载20KG','搬运与焊接工位'],
    ['p04','MAT-004','视觉检测系统','检测设备','2000万像素/高速','产品外观缺陷检测'],
    ['p05','MAT-005','AGV搬运小车','物流设备','载重500KG','车间物料自动搬运'],
    ['p06','MAT-006','激光打标机','加工设备','光纤/20W','产品标识打标'],
    ['p07','MAT-007','自动包装机','包装设备','速度60包/分钟','成品自动包装线'],
    ['p08','MAT-008','精密轴承','零部件','6205-2RS','旋转部件支撑'],
    ['p09','MAT-009','变频器','电控部件','380V/7.5KW','电机调速控制'],
    ['p10','MAT-010','触摸屏HMI','电控部件','12寸/工业级','人机交互界面'],
    ['p11','MAT-011','气缸组件','气动部件','缸径50/行程200','执行机构驱动'],
    ['p12','MAT-012','传感器模块','检测部件','光电/接近/温度','信号采集'],
    ['p13','MAT-013','线缆总成','电气部件','定制/屏蔽型','电气连接'],
    ['p14','MAT-014','减速机','传动部件','行星/速比50','动力传输'],
    ['p15','MAT-015','联轴器','传动部件','膜片式/夹紧型','轴对中连接'],
    ['p16','MAT-016','导轨滑块','机械部件','HGH25CA','直线运动导向'],
    ['p17','MAT-017','铝型材框架','结构部件','40x40/定制','设备支撑框架'],
    ['p18','MAT-018','安全光栅','安全部件','四级/保护高度900','安全防护'],
    ['p19','MAT-019','散热风扇','辅助部件','AC220V/120CFM','柜体散热'],
    ['p20','MAT-020','密封件套装','辅助部件','氟橡胶/定制','密封防尘'],
  ];
  for (const p of prods) {
    productIds.push(p[0]);
    await sql(`INSERT INTO products (id, material_code, material_name, project_name, specification, description, status) VALUES ($1,$2,$3,$4,$5,$6,'active') ON CONFLICT (material_code) DO NOTHING`, p);
  }
  console.log('6. 产品: 20');

  // ===== 7. 项目 (20) =====
  const projectIds=[], pStatuses = ['active','active','active','active','active','in_progress','in_progress','in_progress','in_progress','in_progress','completed','completed','completed','planning','planning','planning','planning','on_hold','on_hold','active'];
  const pNames = ['BYD汽车焊装自动化产线','华大智造基因测序仪装配线','联影医疗CT机组装产线','海康威视摄像头自动化产线','广汽新能源电池PACK线','汇川技术伺服驱动器组装线','华星光电面板搬运系统','京东方OLED模组线','立讯精密连接器产线','力神电池分容化成线','长安汽车总装自动化','埃斯顿机器人测试线','海尔生物医疗设备线','亿联网络通讯设备线','美亚光电色选机组装线','中车时代IGBT模块线','陕鼓动力压缩机产线','美的集团智能家电线','药明康德实验自动化站','光洋科技五轴机床线'];
  const now = new Date();
  const nIso = (m) => new Date(now.getFullYear(), now.getMonth()+m, 1).toISOString();
  for (let i=0;i<20;i++) {
    const pid = 'proj'+String(i+1).padStart(2,'0');
    projectIds.push(pid);
    const start = nIso(-(20-i));
    const end = nIso(i<10 ? (i+1) : -(10-i));
    const uidIdx = i % userIds.length;
    await sql(`INSERT INTO projects (id, name, status, start_date, end_date, owner_id, customer_id, customer_name, project_code, project_manager, mechanical_lead, electrical_lead, visual_lead, software_lead, procurement, planning, production, quality, field_project_lead, business, safety) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [pid,pNames[i],pStatuses[i],start,end,'u02',custIds[i],custs[i][2],`PRJ-2025-${String(i+1).padStart(3,'0')}`,'u02','u05','u07','u09',i%2===0?'u10':'u11','u16','u12','u13','u14','u18','u18','u18']);
  }
  console.log('7. 项目: 20');

  // ===== 8. 任务 (每个项目 5~10) =====
  const tStatuses = ['todo','todo','in_progress','in_progress','done','done','done','review'];
  const tPris = ['high','high','medium','medium','medium','low','low'];
  const tTitles = ['需求分析','方案设计','详细设计','物料采购','机械装配','电气接线','程序开发','调试测试','验收交付','文档归档'];
  let taskCount=0;
  for (let i=0;i<projectIds.length;i++) {
    const num = 5 + Math.floor(Math.random()*6);
    for (let j=0;j<num;j++) {
      taskCount++;
      const due = new Date(now.getFullYear(), now.getMonth()+1, Math.min((j+1)*3,28)).toISOString();
      const uid = userIds[Math.floor(Math.random()*userIds.length)];
      const uName = us.find(x=>x[0]===uid)[3];
      await sql(`INSERT INTO tasks (id, project_id, title, status, priority, assignee_id, assignee, due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [`task${String(taskCount).padStart(4,'0')}`, projectIds[i], tTitles[j%10], tStatuses[Math.floor(Math.random()*tStatuses.length)], tPris[Math.floor(Math.random()*tPris.length)], uid, uName, due]);
    }
  }
  console.log(`8. 任务: ${taskCount}`);

  // ===== 9. 合同 (20) =====
  for (let i=0;i<20;i++) {
    const amt = ((Math.floor(Math.random()*500)+50)*10000).toString();
    await sql(`INSERT INTO contracts (id, contract_code, contract_name, contract_date, customer_code, customer_id, customer_name, contract_amount, technical_manager, procurement_manager, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (contract_code) DO NOTHING`,
      [`ctr${String(i+1).padStart(2,'0')}`, `CT-2025-${String(i+1).padStart(3,'0')}`, `${pNames[i]}供货合同`, nIso(-3), custs[i][1], custIds[i], custs[i][2], amt, us[i%20][3], us[(i+5)%20][3], 'active']);
  }
  console.log('9. 合同: 20');

  // ===== 10. 订单 (20) =====
  for (let i=0;i<20;i++) {
    const amt = ((Math.floor(Math.random()*300)+20)*10000).toString();
    await sql(`INSERT INTO orders (id, order_number, order_date, contract_code, customer_code, customer_name, material_code, project_name, specification, quantity, delivery_date, status, order_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [`ord${String(i+1).padStart(2,'0')}`, `ORD-2025-${String(i+1).padStart(4,'0')}`, nIso(-2), `CT-2025-${String(i+1).padStart(3,'0')}`, custs[i][1], custs[i][2], prods[i][1], pNames[i], prods[i][4], String(Math.floor(Math.random()*50)+1), nIso(3), 'processing', amt]);
  }
  console.log('10. 订单: 20');

  // ===== 11. 送货单 (20) =====
  for (let i=0;i<20;i++) {
    const st = i<8 ? 'delivered' : i<14 ? 'shipped' : 'pending';
    const actDate = i<8 ? nIso(0) : null;
    const qty = Math.floor(Math.random()*20)+1;
    await sql(`INSERT INTO deliveries (id, delivery_number, order_id, order_number, customer_id, customer_name, project_id, project_name, contact_person, contact_phone, delivery_address, planned_delivery_date, actual_delivery_date, status, total_quantity, shipped_by, shipped_by_name, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [`del${String(i+1).padStart(2,'0')}`, `DEL-2025-${String(i+1).padStart(3,'0')}`, `ord${String(i+1).padStart(2,'0')}`, `ORD-2025-${String(i+1).padStart(4,'0')}`, custIds[i], custs[i][2], projectIds[i], pNames[i], '收货员', `139${String(i+1).padStart(8,'0')}`, custs[i][3], nIso(0), actDate, st, qty, userIds[i%20], us[i%20][3], 'u01']);
  }
  console.log('11. 送货单: 20');

  // ===== 12. 审批流程 (5) + 项目审批 (10) =====
  const aTypes = ['new_project','new_contract','new_order','edit_project','status_change'];
  const flowIds=[];
  for (let i=0;i<5;i++) {
    const fid = `flow${String(i+1).padStart(2,'0')}`;
    flowIds.push(fid);
    await sql(`INSERT INTO project_approval_flows (id, name, description, department_id, approval_type, is_enabled, level_1_approver_id, level_1_approver_role, level_2_approver_id, level_2_approver_role) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [fid, `${['新项目','合同','订单','项目编辑','状态变更'][i]}审批流程`, `${['新项目','合同','订单','项目编辑','状态变更'][i]}标准审批`, deptIds[i%5], aTypes[i], true, 'u02', 'project_manager', 'u01', 'system_admin']);
  }
  console.log('12. 审批流程: 5');

  // 项目审批记录
  for (let i=0;i<10;i++) {
    const aid = `appr${String(i+1).padStart(2,'0')}`;
    const st = i<7 ? 'approved' : 'pending';
    await sql(`INSERT INTO project_approvals (id, project_id, approval_type, applicant_id, applicant_name, status, current_level) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [aid, projectIds[i], aTypes[i%5], 'u02', us[1][3], st, i<7 ? 'level_2' : 'level_1']);
    if (i<7) {
      await sql(`INSERT INTO project_approval_steps (approval_id, level, approver_id, approver_name, status, comment, approved_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [aid, 'level_1', 'u02', us[1][3], 'approved', '同意立项', new Date().toISOString()]);
    }
  }
  console.log('   项目审批: 10 / 步骤: 7');

  // ===== 13. 通用审批请求 (15) + 历史 =====
  for (let i=0;i<15;i++) {
    const rid = `req${String(i+1).padStart(2,'0')}`;
    const st = i<8 ? 'approved' : i<12 ? 'pending' : 'rejected';
    await sql(`INSERT INTO approval_requests (id, request_number, request_type, request_id, title, status, applicant_id, applicant_name, current_step, total_steps) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (request_number) DO NOTHING`,
      [rid, `REQ-2025-${String(i+1).padStart(4,'0')}`, aTypes[i%5], projectIds[i%20], `${pNames[i%20]}审批`, st, userIds[(i+1)%20], us[(i+1)%20][3], i<8 ? 'level2' : 'level1', 'level2']);
    if (i<8) {
      await sql(`INSERT INTO approval_history (request_id, step, approver_id, approver_name, action, action_note) VALUES ($1,$2,$3,$4,$5,$6)`,
        [rid, 'level1', userIds[(i+2)%20], us[(i+2)%20][3], 'approve', '审批通过']);
    }
  }
  console.log('13. 审批请求: 15 / 历史: 8');

  // ===== 14. 消息 (50) =====
  const mTypes = ['personal','announcement','system_document','knowledge_base'];
  const mTitles = ['项目进度通知','会议邀请','审批结果通知','系统维护公告','新功能上线','安全提醒','培训通知','节假日安排'];
  for (let i=0;i<50;i++) {
    const isRead = i<35;
    await sql(`INSERT INTO messages (type, title, content, sender_id, receiver_id, is_read, read_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [mTypes[i%4], mTitles[i%8], `第${i+1}条消息内容。关于${pNames[i%20]}项目的重要通知。`, userIds[(i+1)%20], i<30 ? 'u01' : userIds[(i+3)%20], isRead, isRead ? new Date().toISOString() : null]);
  }
  console.log('14. 消息: 50');

  // ===== 15. 系统日志 (100) =====
  const actions = ['create','update','delete','login','logout','export','import','approve','reject'];
  const resources = ['project','task','user','contract','order','product','customer','delivery'];
  for (let i=0;i<100;i++) {
    await sql(`INSERT INTO system_logs (action, resource, resource_id, user_id, username, details, ip_address, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [actions[i%9], resources[i%8], projectIds[i%20], userIds[i%20], us[i%20][1], `执行了${actions[i%9]}操作`, `192.168.1.${i+1}`, 'success']);
  }
  console.log('15. 系统日志: 100');

  // ===== 16. 登录日志 (30) =====
  for (let i=0;i<30;i++) {
    await sql(`INSERT INTO login_logs (user_id, username, login_time, ip_address, login_status, browser, os, login_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userIds[i%20], us[i%20][1], new Date(Date.now()-(30-i)*3600000).toISOString(), `192.168.1.${Math.floor(Math.random()*254)+1}`, 'success', ['Chrome','Firefox','Edge','Safari'][i%4], ['Windows','macOS','Linux'][i%3], 'password']);
  }
  console.log('16. 登录日志: 30');

  // ===== 17. 知识库 (20) =====
  const kbCats = ['general','mechanical','electrical','software','quality','safety','procurement','management'];
  for (let i=0;i<20;i++) {
    await sql(`INSERT INTO knowledge_base (title, content, project_id, category, tags, created_by, view_count) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [`${['机械设计规范','电气布线标准','软件架构指南','质量控制手册','安全生产规程','采购管理流程','项目管理方法','工艺文件模板'][i%8]} v${i+1}`, `知识库第${i+1}条详实内容。技术规范与操作流程。`, projectIds[i%20], kbCats[i%8], `["tag${i+1}","技术文档","规范"]`, userIds[(i+1)%20], String(Math.floor(Math.random()*100))]);
  }
  console.log('17. 知识库: 20');

  // ===== 18. 编码规则 V1 (4) =====
  const v1ruleIds=[];
  const v1rules = [
    ['vr01','1','机械设备类','1','机械零部件及设备',true],
    ['vr02','2','电气设备类','2','电气零部件及设备',true],
    ['vr03','3','软件系统类','3','软件产品及系统',true],
    ['vr04','4','辅助材料类','4','辅助材料及耗材',true],
  ];
  for (const r of v1rules) {
    v1ruleIds.push(r[0]);
    await sql(`INSERT INTO coding_rules (id, category_code, category_name, first_digit, description, is_active) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (category_code) DO NOTHING`, r);
  }
  console.log('18. 编码规则 V1: 4');

  // ===== 19. 编码规则 V2 (4) =====
  const v2ruleIds=[];
  const v2rules = [
    ['v2r01','1','机械设备类','机械类产品'],
    ['v2r02','2','电气设备类','电气类产品'],
    ['v2r03','3','软件系统类','软件类产品'],
    ['v2r04','4','辅助材料类','辅助材料'],
  ];
  for (const [id,code,name,desc] of v2rules) {
    v2ruleIds.push(id);
    await sql(`INSERT INTO coding_rules_v2 (rule_id, code, name, description, is_active) VALUES ($1,$2,$3,$4,true) ON CONFLICT (code) DO NOTHING`, [id,code,name,desc]);
  }
  console.log('19. 编码规则 V2: 4');

  // ===== 20. 编码分类 V1 (12) + V2 (4) =====
  const levels = ['sub','material','process'];
  for (let i=0;i<v1ruleIds.length;i++) {
    for (let j=0;j<3;j++) {
      await sql(`INSERT INTO coding_categories (rule_id, category_level, code, name, description) VALUES ($1,$2,$3,$4,$5)`,
        [v1ruleIds[i], levels[j], `C${i}${j}`, `${['子类','材质','工艺'][j]}_${i}`, `V1编码规则${i+1}的${levels[j]}分类`]);
    }
  }
  const v2levs = ['second','third','process'];
  for (let i=0;i<v2ruleIds.length;i++) {
    for (let j=0;j<1;j++) {
      await sql(`INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description) VALUES ($1,$2,$3,$4,$5)`,
        [v2ruleIds[i], v2levs[i%3], `V${i}0`, `V2分类_${i}`, `V2编码规则${i+1}的第二阶分类`]);
    }
  }
  console.log('20. 编码分类: V1(12) + V2(4)');

  // ===== 21. 生成编码 V1 (20) + V2 (20) =====
  for (let i=0;i<20;i++) {
    const code = `1${String(i+1).padStart(2,'0')}${String(Math.floor(Math.random()*100)).padStart(3,'0')}${i+1}`;
    await sql(`INSERT INTO generated_codes (code, material_name, rule_id, status) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING`,
      [code, prods[i][2], v1ruleIds[0], 'active']);
    const codeV2 = `2${String(i+1).padStart(4,'0')}${String(Math.floor(Math.random()*10000)).padStart(8,'0')}`;
    await sql(`INSERT INTO generated_codes_v2 (code, material_name, rule_id, sequence_number, version, project_name) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (code) DO NOTHING`,
      [codeV2, prods[i][2], v2ruleIds[0], i+1, String.fromCharCode(65+(i%26)), pNames[i]]);
  }
  console.log('21. 生成编码: V1(20) + V2(20)');

  // ===== 22. 用户权限 (15) =====
  for (let i=0;i<15;i++) {
    await sql(`INSERT INTO user_permissions (user_id, resource, permission) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [userIds[(i+2)%20], resources[i%8], ['view','edit','delete'][i%3]]);
  }
  console.log('22. 用户权限: 15');

  // ===== 23. 部门权限 (10) =====
  for (let i=0;i<5;i++) {
    for (let j=0;j<2;j++) {
      await sql(`INSERT INTO department_permissions (department_id, resource, permission) VALUES ($1,$2,$3)`,
        [deptIds[i], resources[(i+j)%8], j===0?'view':'edit']);
    }
  }
  console.log('23. 部门权限: 10');

  // ===== 24. 资产文件 (20) =====
  const fTypes = ['pdf','docx','xlsx','dwg','png'];
  for (let i=0;i<20;i++) {
    await sql(`INSERT INTO asset_files (project_id, file_name, file_key, file_size, file_type, file_path, description, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [projectIds[i%20], `${['技术方案','电气图纸','机械图纸','测试报告','BOM清单'][i%5]}.${fTypes[i%5]}`, `s3/projects/${projectIds[i%20]}/file_${i}`, `${1024*(i+1)}`, fTypes[i%5], `/projects/${projectIds[i%20]}/files/file_${i}.${fTypes[i%5]}`, `项目${projectIds[i%20]}的${['技术','电气','机械','测试','BOM'][i%5]}文件`, userIds[i%20]]);
  }
  console.log('24. 资产文件: 20');

  // ===== 25. 委托设置 (5) =====
  for (let i=0;i<5;i++) {
    await sql(`INSERT INTO delegation_settings (delegator_id, proxy_id, approval_types, start_date, end_date, is_active) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userIds[i+1], userIds[(i+5)%20], JSON.stringify([aTypes[i]]), new Date().toISOString().split('T')[0], new Date(Date.now()+30*86400000).toISOString().split('T')[0], true]);
  }
  console.log('25. 委托设置: 5');

  // ===== 26. 系统设置 (3) =====
  await sql(`INSERT INTO system_settings (key, value, description) VALUES ($1,$2,$3) ON CONFLICT (key) DO NOTHING`, ['companyName','智能装备科技有限公司','公司名称']);
  await sql(`INSERT INTO system_settings (key, value, description) VALUES ($1,$2,$3) ON CONFLICT (key) DO NOTHING`, ['systemVersion','2.0.0','系统版本']);
  await sql(`INSERT INTO system_settings (key, value, description) VALUES ($1,$2,$3) ON CONFLICT (key) DO NOTHING`, ['loginTimeout','30','登录超时(分钟)']);
  console.log('26. 系统设置: 3');

  console.log(`\n=== 全量测试数据生成完毕 ===`);
  console.log(`覆盖: 部门5/角色10/用户20/客户20(+联系人)/产品20/项目20/任务${taskCount}/合同20/订单20/送货20`);
  console.log(`覆盖: 审批流程5/项目审批10/审批请求15(+历史)/消息50/系统日志100/登录日志30/知识库20`);
  console.log(`覆盖: 编码规则V1+V2/分类/生成编码/权限/资产文件/委托/系统设置`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
