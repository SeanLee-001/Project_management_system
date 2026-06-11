/**
 * 生成所有表格的测试数据
 * 每个表格生成 20 条记录
 */

const crypto = require('crypto');
const fs = require('fs');

function uuid() {
  return crypto.randomUUID();
}

function randomDate(startYear = 2024, endYear = 2025) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const data = {
  roles: [],
  departments: [],
  systemSettings: [],
  users: [],
  userPermissions: [],
  departments: [],
  departmentPermissions: [],
  customers: [],
  customerContacts: [],
  projects: [],
  tasks: [],
  contracts: [],
  orders: [],
  products: [],
  messages: [],
  projectApprovals: [],
  projectApprovalSteps: [],
  projectApprovalFlows: [],
  approvalRequests: [],
  approvalHistory: [],
  systemLogs: [],
  loginLogs: [],
  assetFiles: []
};

const userNames = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '王菲',
  '马云', '雷军', '马化腾', '李彦宏', '刘强东', '张一鸣', '黄峥', '宿华', '程维', '王小川'
];
const roles = ['system_admin', 'project_manager', 'mechanical_engineer', 'electrical_engineer', 'visual_engineer', 'software_engineer', 'project_management', 'quality_management'];
const companies = [
  '华为技术有限公司', '腾讯科技有限公司', '阿里巴巴集团', '百度集团', '字节跳动科技有限公司',
  '美团科技有限公司', '京东集团', '小米集团', 'OPPO 广东移动通信有限公司', 'VIVO 移动通信有限公司',
  '比亚迪股份有限公司', '宁德时代新能源科技股份有限公司', '格力电器股份有限公司', '美的集团', '海尔智家股份有限公司',
  'TCL 科技集团股份有限公司', '海信集团', '创维集团', '联想集团', '华硕电脑股份有限公司'
];

// 1. 角色 (5 个)
const roleData = [
  { code: 'ADMIN', name: '系统管理员', isSystem: true },
  { code: 'MANAGER', name: '项目经理', isSystem: false },
  { code: 'DEV', name: '开发工程师', isSystem: false },
  { code: 'TEST', name: '测试工程师', isSystem: false },
  { code: 'USER', name: '普通用户', isSystem: false }
];
for (let i = 0; i < 5; i++) {
  data.roles.push({
    id: uuid(), roleCode: `ROLE${String(i + 1).padStart(3, '0')}`, roleName: roleData[i].name,
    description: `角色描述${i + 1}`, isSystem: roleData[i].isSystem, isActive: true,
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 角色：' + data.roles.length + ' 条');

// 2. 部门 (5 个)
const deptNames = [
  { code: 'RD', name: '研发部', desc: '负责产品研发' },
  { code: 'MK', name: '市场部', desc: '负责市场开拓' },
  { code: 'SL', name: '销售部', desc: '负责产品销售' },
  { code: 'CS', name: '客服部', desc: '负责客户服务' },
  { code: 'HR', name: '人事部', desc: '负责人事管理' }
];
for (let i = 0; i < 5; i++) {
  data.departments.push({
    id: uuid(), departmentCode: `${deptNames[i].code}${String(i + 1).padStart(3, '0')}`,
    departmentName: deptNames[i].name, description: deptNames[i].desc, status: 'active',
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 部门：' + data.departments.length + ' 条');

// 3. 系统设置 (5 个)
const settings = [
  { key: 'database_url', value: 'postgresql://***', desc: '数据库连接地址' },
  { key: 'session_timeout', value: '1800', desc: '会话超时时间 (秒)' },
  { key: 'max_login_attempts', value: '5', desc: '最大登录尝试次数' },
  { key: 'password_expiry_days', value: '90', desc: '密码过期天数' },
  { key: 'file_upload_max_size', value: '52428800', desc: '文件上传最大大小 (字节)' }
];
for (let i = 0; i < 5; i++) {
  data.systemSettings.push({
    id: uuid(), key: settings[i].key, value: settings[i].value, description: settings[i].desc,
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 系统设置：' + data.systemSettings.length + ' 条');

// 4. 用户 (20 个)
for (let i = 0; i < 20; i++) {
  data.users.push({
    id: uuid(), username: `user${i + 1}`, email: `user${i + 1}@company.com`,
    password: '$2b$10$dummy.hash', fullName: userNames[i], role: randomElement(roles),
    departmentId: randomElement(data.departments).id, isActive: true, isFirstLogin: false,
    approvalStatus: 'approved', macAddress: `00:11:22:33:${String(i).padStart(2, '0')}:AA`,
    lastLoginTime: randomDate().toISOString(), loginDuration: String(Math.floor(Math.random() * 28800)),
    loginDevice: 'Chrome', loginIP: `192.168.1.${i + 1}`, employeeNumber: `EMP${String(i + 1).padStart(5, '0')}`,
    phone: `138${10000000 + i}`, createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 用户：' + data.users.length + ' 条');

// 5. 客户 (20 个)
for (let i = 0; i < 20; i++) {
  data.customers.push({
    id: uuid(), customerCode: `CUST${String(i + 1).padStart(5, '0')}`, customerName: companies[i],
    phone: `0755-${10000000 + i}`, address: `深圳市南山区科技园${i + 1}号楼`,
    customerType: randomElement(['terminal', 'agent']), status: randomElement(['active', 'inactive']),
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 客户：' + data.customers.length + ' 条');

// 6. 客户联系人 (20 个)
for (let i = 0; i < 20; i++) {
  data.customerContacts.push({
    id: uuid(), customerId: randomElement(data.customers).id, contactType: randomElement(['procurement', 'technical']),
    contactName: randomElement(userNames), contactPhone: `139${10000000 + i}`,
    contactEmail: `contact${i + 1}@company.com`, position: randomElement(['采购经理', '技术总监', '项目经理']),
    createdAt: randomDate().toISOString()
  });
}
console.log('✅ 客户联系人：' + data.customerContacts.length + ' 条');

// 7. 项目 (20 个)
const projectNames = [
  '智能制造系统', 'ERP 管理系统', 'CRM 客户管理系统', 'OA 办公自动化系统', 'MES 生产执行系统',
  'WMS 仓储管理系统', 'PLM 产品生命周期管理', 'SCM 供应链管理系统', 'HR 人力资源系统', 'FMS 财务管理系统',
  'BI 商业智能系统', 'IoT 物联网平台', 'AI 人工智能平台', '大数据分析平台', '云计算平台',
  '移动应用开发', '微信公众号开发', '小程序开发', '电商平台', '官网建设'
];
for (let i = 0; i < 20; i++) {
  const startDate = randomDate();
  const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const customer = randomElement(data.customers);
  data.projects.push({
    id: uuid(), name: projectNames[i], description: `这是项目${i + 1}的详细描述`,
    status: randomElement(['active', 'completed', 'paused']), startDate: startDate.toISOString(),
    endDate: endDate.toISOString(), ownerId: randomElement(data.users).id, iconUrl: null,
    projectCode: `PRJ${String(i + 1).padStart(5, '0')}`, materialCode: `MAT${String(i + 1).padStart(5, '0')}`,
    productName: `产品${i + 1}`, specification: `规格${i + 1}`, productImageUrl: null,
    customerId: customer.id, customerName: customer.customerName,
    technicalContactName: randomElement(userNames), technicalContactPhone: `138${20000000 + i}`,
    technicalContactEmail: `tech${i + 1}@company.com`,
    projectManager: randomElement(data.users).id, projectManagerPhone: `138${30000000 + i}`,
    projectManagement: randomElement(data.users).id, mechanicalLead: randomElement(data.users).id,
    electricalLead: randomElement(data.users).id, visualLead: randomElement(data.users).id,
    softwareLead: randomElement(data.users).id, procurement: randomElement(data.users).id,
    planning: randomElement(data.users).id, production: randomElement(data.users).id,
    quality: randomElement(data.users).id, fieldProjectLead: randomElement(data.users).id,
    business: randomElement(data.users).id, safety: randomElement(data.users).id,
    orderNumber: `ORD${String(i + 1).padStart(5, '0')}`, orderDate: randomDate().toISOString(),
    deliveryDate: randomDate(2025, 2026).toISOString(), quantity: String(Math.floor(Math.random() * 100) + 1),
    contractCode: `CT${String(i + 1).padStart(5, '0')}`, contractName: `合同${i + 1}`,
    contractDate: randomDate().toISOString(), technicalProtocolUrl: null, progressPlan: null,
    customMembers: null, approvalStatus: 'none', approvalRequestId: null,
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 项目：' + data.projects.length + ' 条');

// 8. 任务 (40 个)
const taskTitles = ['需求分析', '系统设计', '数据库设计', '接口开发', '前端开发', '后端开发', '单元测试', '集成测试', '性能优化', 'Bug 修复', '文档编写', '代码审查', '部署上线', '用户培训', '运维支持'];
for (let i = 0; i < 40; i++) {
  data.tasks.push({
    id: uuid(), projectId: randomElement(data.projects).id, taskCode: `TSK${String(i + 1).padStart(5, '0')}`,
    title: `${randomElement(taskTitles)} - 任务${i + 1}`, description: `任务描述${i + 1}`,
    status: randomElement(['todo', 'in_progress', 'completed']), priority: randomElement(['low', 'medium', 'high']),
    assignee: randomElement(userNames), assigneeId: randomElement(data.users).id, assignees: null, taskMembers: null,
    dueDate: randomDate(2025, 2026).toISOString(), plannedStartDate: randomDate().toISOString(),
    actualStartDate: randomDate().toISOString(), plannedEndDate: randomDate(2025, 2026).toISOString(),
    actualEndDate: randomDate(2025, 2026).toISOString(), createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 任务：' + data.tasks.length + ' 条');

// 9. 合同 (20 个)
for (let i = 0; i < 20; i++) {
  const customer = randomElement(data.customers);
  data.contracts.push({
    id: uuid(), contractCode: `CT${String(i + 1).padStart(5, '0')}`, contractName: `合同${i + 1}`,
    contractDate: randomDate().toISOString(), customerCode: customer.customerCode, customerId: customer.id,
    customerName: customer.customerName, contractAmount: String((Math.random() * 1000000 + 50000).toFixed(2)),
    technicalManager: randomElement(userNames), technicalPhone: `138${40000000 + i}`,
    procurementManager: randomElement(userNames), procurementPhone: `138${50000000 + i}`,
    attachment1Url: null, attachment2Url: null, attachment3Url: null,
    status: randomElement(['active', 'expired', 'terminated']), approvalStatus: 'none', approvalRequestId: null,
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 合同：' + data.contracts.length + ' 条');

// 10. 订单 (40 个)
for (let i = 0; i < 40; i++) {
  const customer = randomElement(data.customers);
  const orderDate = randomDate();
  const deliveryDate = new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  data.orders.push({
    id: uuid(), orderNumber: `PO${String(10000 + i + 1)}`, orderDate: orderDate.toISOString(),
    contractCode: randomElement(data.contracts).contractCode, customerCode: customer.customerCode,
    customerName: customer.customerName, materialCode: randomElement(data.projects).materialCode,
    projectName: randomElement(data.projects).name, specification: `规格${i + 1}`,
    quantity: String(Math.floor(Math.random() * 100) + 1), deliveryDate: deliveryDate.toISOString(),
    actualDeliveryDate: null, status: randomElement(['pending', 'processing', 'delivered', 'completed']),
    projectProgress: randomElement(['10%', '30%', '50%', '70%', '90%', '100%']), paymentTerms: '验收合格后 30 天内付款',
    orderAmount: String((Math.random() * 1000000 + 10000).toFixed(2)), prepayRatio: '30%',
    prepayAmount: String((Math.random() * 300000 + 3000).toFixed(2)), prepayReceived: Math.random() > 0.5,
    prepayDate: randomDate().toISOString(), prepayInvoiceAmount: String((Math.random() * 300000 + 3000).toFixed(2)),
    prepayInvoiceDate: randomDate().toISOString(), prepayInvoiced: Math.random() > 0.5,
    arrivalAmount: String((Math.random() * 500000 + 5000).toFixed(2)), arrivalReceived: Math.random() > 0.5,
    arrivalDate: randomDate().toISOString(), arrivalInvoiceAmount: String((Math.random() * 500000 + 5000).toFixed(2)),
    arrivalInvoiceDate: randomDate().toISOString(), arrivalInvoiced: Math.random() > 0.5,
    arrivalRatio: '40%', acceptanceRatio: '20%',
    acceptanceAmount: String((Math.random() * 200000 + 2000).toFixed(2)), acceptanceReceived: Math.random() > 0.5,
    acceptanceDate: randomDate().toISOString(), acceptanceInvoiceAmount: String((Math.random() * 200000 + 2000).toFixed(2)),
    acceptanceInvoiceDate: randomDate().toISOString(), acceptanceInvoiced: Math.random() > 0.5,
    warrantyRatio: '10%', warrantyAmount: String((Math.random() * 100000 + 1000).toFixed(2)),
    warrantyReceived: Math.random() > 0.5, warrantyDate: randomDate(2026, 2027).toISOString(),
    warrantyInvoiceAmount: String((Math.random() * 100000 + 1000).toFixed(2)),
    warrantyInvoiceDate: randomDate(2026, 2027).toISOString(), warrantyInvoiced: Math.random() > 0.5,
    notes: `订单备注${i + 1}`, approvalStatus: 'none', approvalRequestId: null,
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 订单：' + data.orders.length + ' 条');

// 11. 产品 (20 个)
const products = [
  ['服务器', '高性能服务器'], ['交换机', '网络交换机'], ['路由器', '企业路由器'], ['防火墙', '网络安全防火墙'], ['存储设备', 'NAS 存储'],
  ['PC 电脑', '台式机'], ['笔记本电脑', '商务笔记本'], ['打印机', '激光打印机'], ['扫描仪', '高速扫描仪'], ['投影仪', '商务投影仪'],
  ['摄像头', '网络摄像头'], ['麦克风', '会议麦克风'], ['显示器', '液晶显示器'], ['键盘', '机械键盘'], ['鼠标', '无线鼠标'],
  ['耳机', '降噪耳机'], ['音响', '蓝牙音响'], ['UPS', '不间断电源'], ['机柜', '服务器机柜'], ['网线', '六类网线']
];
for (let i = 0; i < 20; i++) {
  data.products.push({
    id: uuid(), materialCode: `MAT${String(i + 1).padStart(5, '0')}`, projectName: products[i][0],
    specification: products[i][1], description: `产品${i + 1}详细描述`, imageUrl: null, status: 'active',
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 产品：' + data.products.length + ' 条');

// 12. 消息 (40 个)
for (let i = 0; i < 40; i++) {
  data.messages.push({
    id: uuid(), type: randomElement(['personal', 'announcement', 'system_document']),
    title: `消息${i + 1}`, content: `这是消息${i + 1}的内容详情`,
    senderId: randomElement(data.users).id, receiverId: randomElement(data.users).id,
    isRead: Math.random() > 0.5, readAt: randomDate().toISOString(), isPinned: Math.random() > 0.8,
    documentUrl: null, relatedId: null, relatedType: null, createdAt: randomDate().toISOString()
  });
}
console.log('✅ 消息：' + data.messages.length + ' 条');

// 13. 项目审批 (20 个)
for (let i = 0; i < 20; i++) {
  const project = randomElement(data.projects);
  data.projectApprovals.push({
    id: uuid(), projectId: project.id, approvalType: randomElement(['new_project', 'edit_project', 'delete_project', 'status_change', 'member_change']),
    applicantId: randomElement(data.users).id, applicantName: randomElement(userNames),
    currentApproverId: randomElement(data.users).id, currentApproverName: randomElement(userNames),
    status: randomElement(['pending', 'approved', 'rejected', 'cancelled']), currentLevel: randomElement(['level_1', 'level_2', 'level_3']),
    rejectReason: null, approvalData: null, createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString(),
    approvedAt: randomDate().toISOString(), rejectedAt: randomDate().toISOString()
  });
}
console.log('✅ 项目审批：' + data.projectApprovals.length + ' 条');

// 14. 审批步骤 (60 个)
for (let i = 0; i < 60; i++) {
  data.projectApprovalSteps.push({
    id: uuid(), approvalId: randomElement(data.projectApprovals).id, level: randomElement(['level_1', 'level_2', 'level_3']),
    approverId: randomElement(data.users).id, approverName: randomElement(userNames),
    status: randomElement(['pending', 'approved', 'rejected']), comment: `审批意见${i + 1}`,
    approvedAt: randomDate().toISOString(), createdAt: randomDate().toISOString()
  });
}
console.log('✅ 审批步骤：' + data.projectApprovalSteps.length + ' 条');

// 15. 审批流程配置 (12 个)
for (let i = 0; i < 12; i++) {
  const dept = randomElement(data.departments);
  data.projectApprovalFlows.push({
    id: uuid(), name: `${dept.departmentName}-审批流程${i + 1}`, description: `审批流程描述${i + 1}`,
    departmentId: dept.id, approvalType: randomElement(['new_project', 'edit_project', 'delete_project', 'new_order', 'edit_order', 'new_contract']),
    isEnabled: true, level1ApproverId: randomElement(data.users).id, level1ApproverRole: randomElement(roles),
    level2ApproverId: randomElement(data.users).id, level2ApproverRole: randomElement(roles),
    level3ApproverId: randomElement(data.users).id, level3ApproverRole: randomElement(roles),
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 审批流程配置：' + data.projectApprovalFlows.length + ' 条');

// 16. 审批申请 (20 个)
for (let i = 0; i < 20; i++) {
  const requestType = randomElement(['order', 'contract']);
  data.approvalRequests.push({
    id: uuid(), requestNumber: `REQ${String(2024000 + i + 1)}`, requestType: requestType,
    requestId: requestType === 'order' ? randomElement(data.orders).id : randomElement(data.contracts).id,
    title: `审批申请${i + 1}`, content: `审批内容详情${i + 1}`, status: randomElement(['pending', 'approved', 'rejected', 'cancelled']),
    applicantId: randomElement(data.users).id, applicantName: randomElement(userNames),
    currentApproverId: randomElement(data.users).id, currentApproverName: randomElement(userNames),
    currentStep: randomElement(['level1', 'level2', 'level3']), totalSteps: 'level3',
    approvalDate: randomDate().toISOString(), approvalNote: `审批意见${i + 1}`, relatedData: null,
    createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 审批申请：' + data.approvalRequests.length + ' 条');

// 17. 审批历史 (60 个)
for (let i = 0; i < 60; i++) {
  data.approvalHistory.push({
    id: uuid(), requestId: randomElement(data.approvalRequests).id, step: randomElement(['level1', 'level2', 'level3']),
    approverId: randomElement(data.users).id, approverName: randomElement(userNames),
    action: randomElement(['approve', 'reject']), actionNote: `审批意见${i + 1}`,
    actionAt: randomDate().toISOString(), createdAt: randomDate().toISOString()
  });
}
console.log('✅ 审批历史：' + data.approvalHistory.length + ' 条');

// 18. 系统日志 (40 个)
for (let i = 0; i < 40; i++) {
  data.systemLogs.push({
    id: uuid(), action: randomElement(['login', 'logout', 'create', 'update', 'delete', 'approve', 'reject']),
    resource: randomElement(['user', 'project', 'task', 'customer', 'contract', 'order', 'message']),
    resourceId: uuid(), userId: randomElement(data.users).id, username: randomElement(data.users).username,
    fullName: randomElement(userNames), details: `操作详情${i + 1}`, ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: randomElement(['success', 'failed']),
    errorMessage: null, createdAt: randomDate().toISOString()
  });
}
console.log('✅ 系统日志：' + data.systemLogs.length + ' 条');

// 19. 登录日志 (40 个)
for (let i = 0; i < 40; i++) {
  const user = randomElement(data.users);
  const loginTime = randomDate();
  const logoutTime = new Date(loginTime.getTime() + Math.floor(Math.random() * 28800000));
  data.loginLogs.push({
    id: uuid(), userId: user.id, username: user.username, employeeNumber: user.employeeNumber,
    fullName: user.fullName, loginTime: loginTime.toISOString(), logoutTime: logoutTime.toISOString(),
    loginDuration: Math.floor((logoutTime - loginTime) / 1000), ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    previousIpAddress: `192.168.1.${Math.floor(Math.random() * 255)}`, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    deviceType: randomElement(['desktop', 'mobile', 'tablet']), browser: randomElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
    os: randomElement(['Windows 10', 'macOS', 'Linux', 'iOS', 'Android']), loginMethod: randomElement(['password', 'mac']),
    loginStatus: randomElement(['success', 'failed']), isSensitiveOperation: Math.random() > 0.8,
    sensitiveOperationType: randomElement(['ip_changed', 'password_changed', 'mac_bound', null]),
    errorMessage: null, createdAt: randomDate().toISOString()
  });
}
console.log('✅ 登录日志：' + data.loginLogs.length + ' 条');

// 20. 项目文件 (20 个)
const fileNames = ['需求文档.pdf', '设计文档.pdf', '测试报告.pdf', '用户手册.pdf', '技术方案.docx', '项目计划.xlsx', '会议纪要.docx', '接口文档.pdf', '部署指南.pdf', '验收报告.pdf'];
for (let i = 0; i < 20; i++) {
  data.assetFiles.push({
    id: uuid(), projectId: randomElement(data.projects).id, fileName: `${randomElement(fileNames)}-${i + 1}`,
    fileKey: `files/${randomElement(data.projects).projectCode}/file${i + 1}`,
    fileSize: String(Math.floor(Math.random() * 10000000) + 10000), fileType: randomElement(['application/pdf', 'image/png', 'application/zip']),
    filePath: `/uploads/${randomElement(data.projects).projectCode}/file${i + 1}`, description: `文件描述${i + 1}`,
    uploadedBy: randomElement(data.users).id, createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 项目文件：' + data.assetFiles.length + ' 条');

// 21. 用户权限 (20 个)
for (let i = 0; i < 20; i++) {
  data.userPermissions.push({
    id: uuid(), userId: randomElement(data.users).id, resource: randomElement(['projects', 'tasks', 'customers', 'contracts', 'orders']),
    permission: randomElement(['view', 'edit', 'delete']), createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 用户权限：' + data.userPermissions.length + ' 条');

// 22. 部门权限 (20 个)
for (let i = 0; i < 20; i++) {
  data.departmentPermissions.push({
    id: uuid(), departmentId: randomElement(data.departments).id, resource: randomElement(['projects', 'tasks', 'users', 'customers', 'contracts']),
    permission: randomElement(['view', 'edit', 'delete']), createdAt: randomDate().toISOString(), updatedAt: randomDate().toISOString()
  });
}
console.log('✅ 部门权限：' + data.departmentPermissions.length + ' 条');

// 保存数据到文件
const outputDir = '/tmp/test-data';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

Object.keys(data).forEach(table => {
  const filePath = `${outputDir}/${table}.json`;
  fs.writeFileSync(filePath, JSON.stringify(data[table], null, 2));
  console.log(`💾 已保存：${table}.json (${data[table].length} 条)`);
});

const summary = {};
Object.keys(data).forEach(table => {
  summary[table] = data[table].length;
});
summary.total = Object.values(summary).reduce((a, b) => a + b, 0);
fs.writeFileSync(`${outputDir}/summary.json`, JSON.stringify(summary, null, 2));

console.log('\n' + '='.repeat(60));
console.log('✅ 所有测试数据生成完成！');
console.log(`📊 数据概览：${Object.keys(data).length} 个表格，总计 ${summary.total} 条记录`);
console.log(`📁 数据文件保存目录：${outputDir}`);
console.log('='.repeat(60));
