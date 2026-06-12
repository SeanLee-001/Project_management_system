import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 角色管理表
export const roles = pgTable(
  "roles",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roleCode: varchar("role_code", { length: 50 }).notNull().unique(), // 角色代码
    roleName: varchar("role_name", { length: 100 }).notNull(), // 角色名称
    description: text("description"), // 角色描述
    isSystem: boolean("is_system").default(false).notNull(), // 是否为系统角色（不可删除）
    isActive: boolean("is_active").default(true).notNull(), // 是否启用
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    roleCodeIdx: index("roles_role_code_idx").on(table.roleCode),
    isActiveIdx: index("roles_is_active_idx").on(table.isActive),
  })
);

// 用户角色定义（保留用于向后兼容）
export const UserRole = {
  SYSTEM_ADMIN: "system_admin", // 系统管理员
  PROJECT_MANAGER: "project_manager", // 项目经理
  MECHANICAL_ENGINEER: "mechanical_engineer", // 机械工程师
  ELECTRICAL_ENGINEER: "electrical_engineer", // 电气工程师
  VISUAL_ENGINEER: "visual_engineer", // 视觉工程师
  SOFTWARE_ENGINEER: "software_engineer", // 软件工程师
  PROJECT_MANAGEMENT: "project_management", // 项目管理
  PRODUCTION_PLANNING: "production_planning", // 生产计划
  QUALITY_MANAGEMENT: "quality_management", // 质量管理
  PROCUREMENT_MANAGEMENT: "procurement_management", // 采购管理
  DEPARTMENT_MANAGER: "department_manager", // 部门经理
  FIELD_SUPERVISOR: "field_supervisor", // 现场负责人
  PROJECT_MEMBER: "project_member", // 项目成员
  BUSINESS: "business", // 商务
  SAFETY_OFFICER: "safety_officer", // 安全员
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// 审核人信息类型
export interface ApproverInfo {
  id: string;
  username: string;
  fullName: string | null;
}

// 自定义项目成员类型
export interface CustomMember {
  id: string; // 成员ID（用于删除时识别）
  role: string; // 角色
  name: string; // 姓名
  phone: string; // 电话
}

// 扩展User类型，添加可选的审核人信息
export type UserWithApprover = User & {
  approver?: ApproverInfo;
};

// 角色显示名称映射
export const UserRoleDisplayNames: Record<UserRoleType, string> = {
  [UserRole.SYSTEM_ADMIN]: "系统管理员",
  [UserRole.PROJECT_MANAGER]: "项目经理",
  [UserRole.MECHANICAL_ENGINEER]: "机械工程师",
  [UserRole.ELECTRICAL_ENGINEER]: "电气工程师",
  [UserRole.VISUAL_ENGINEER]: "视觉工程师",
  [UserRole.SOFTWARE_ENGINEER]: "软件工程师",
  [UserRole.PROJECT_MANAGEMENT]: "项目管理",
  [UserRole.PRODUCTION_PLANNING]: "生产计划",
  [UserRole.QUALITY_MANAGEMENT]: "质量管理",
  [UserRole.PROCUREMENT_MANAGEMENT]: "采购管理",
  [UserRole.DEPARTMENT_MANAGER]: "部门经理",
  [UserRole.FIELD_SUPERVISOR]: "现场负责人",
  [UserRole.PROJECT_MEMBER]: "项目成员",
  [UserRole.BUSINESS]: "商务",
  [UserRole.SAFETY_OFFICER]: "安全员",
};

// SystemSettings 表 - 系统配置
export const systemSettings = pgTable("system_settings", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(), // 配置键
  value: text("value").notNull(), // 配置值
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Users 表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 100 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password").notNull(),
    fullName: varchar("full_name", { length: 255 }),
    role: varchar("role", { length: 50 })
      .notNull()
      .default("project_member"), // 支持的角色：系统管理员、项目经理、机械工程师、电气工程师、视觉工程师、软件工程师、项目管理、生产计划、质量管理、采购管理、部门经理、现场负责人、项目成员
    departmentId: varchar("department_id", { length: 36 }).references(() => departments.id, { onDelete: "set null" }), // 部门ID
    isActive: boolean("is_active").default(true).notNull(),
    isFirstLogin: boolean("is_first_login").default(true).notNull(), // 是否首次登录（需要修改密码）
    passwordExpireAt: timestamp("password_expire_at", { withTimezone: true }), // 密码过期时间
    approvalStatus: varchar("approval_status", { length: 20 })
      .notNull()
      .default("pending"), // 审核状态：pending-待审核，approved-已通过，rejected-已拒绝
    approvedBy: varchar("approved_by", { length: 36 }), // 审核人ID
    approvedAt: timestamp("approved_at", { withTimezone: true }), // 审核时间
    rejectReason: text("reject_reason"), // 拒绝原因
    macAddress: varchar("mac_address", { length: 17 }), // 绑定的MAC地址（格式：00:11:22:33:44:55）
    lastLoginTime: timestamp("last_login_time", { withTimezone: true }), // 最后登录时间
    loginDuration: varchar("login_duration", { length: 50 }), // 登录时长（秒）
    loginDevice: varchar("login_device", { length: 255 }), // 登录终端（浏览器类型）
    loginIP: varchar("login_ip", { length: 45 }), // 登录IP地址（支持IPv4和IPv6）
    employeeNumber: varchar("employee_number", { length: 50 }), // 用户工号
    phone: varchar("phone", { length: 20 }), // 手机号码
    menuConfiguration: text("menu_configuration"), // 菜单配置（JSON格式，存储用户自定义菜单顺序和显示状态）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    phoneIdx: index("users_phone_idx").on(table.phone),
    departmentIdIdx: index("users_department_id_idx").on(table.departmentId),
  })
);

// Departments 表 - 部门管理
export const departments = pgTable(
  "departments",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    departmentCode: varchar("department_code", { length: 50 }).notNull().unique(), // 部门代码
    departmentName: varchar("department_name", { length: 100 }).notNull(), // 部门名称
    description: text("description"), // 部门描述
    status: varchar("status", { length: 20 }).notNull().default("active"), // 状态：active-启用，inactive-停用
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    departmentCodeIdx: index("departments_code_idx").on(table.departmentCode),
    statusIdx: index("departments_status_idx").on(table.status),
  })
);

// DepartmentPermissions 表 - 部门基础权限管理
export const departmentPermissions = pgTable(
  "department_permissions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    departmentId: varchar("department_id", { length: 36 })
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }), // 部门ID
    resource: varchar("resource", { length: 50 }).notNull(), // 资源类型：projects, tasks, users, customers, customer_contacts, contracts, orders, products, config
    permission: varchar("permission", { length: 50 }).notNull(), // 权限类型：view, edit, delete, use
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    departmentIdIdx: index("department_permissions_department_id_idx").on(table.departmentId),
    resourceIdx: index("department_permissions_resource_idx").on(table.resource),
    uniqueDeptResourcePermission: index("unique_dept_resource_permission").on(table.departmentId, table.resource, table.permission),
  })
);

// Customers 表 - 客户管理
export const customers = pgTable(
  "customers",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    customerCode: varchar("customer_code", { length: 50 }).notNull().unique(), // 客户编号
    customerName: varchar("customer_name", { length: 255 }).notNull(), // 客户名称
    phone: varchar("phone", { length: 50 }), // 联系电话
    address: text("address"), // 地址
    customerType: varchar("customer_type", { length: 50 }).notNull().default("terminal"), // 客户类型：terminal-终端，agent-中介
    status: varchar("status", { length: 50 }).notNull().default("active"), // 状态：active-合作中，inactive-停止合作
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    customerCodeIdx: index("customers_customer_code_idx").on(table.customerCode),
    statusIdx: index("customers_status_idx").on(table.status),
  })
);

// Customer Contacts 表 - 客户联系人
export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    contactType: varchar("contact_type", { length: 50 }).notNull(), // 联系人类型：procurement-采购，technical-技术
    contactName: varchar("contact_name", { length: 255 }).notNull(), // 联系人姓名
    contactPhone: varchar("contact_phone", { length: 50 }), // 联系人电话
    contactEmail: varchar("contact_email", { length: 255 }), // 联系人邮箱
    position: varchar("position", { length: 100 }), // 职位
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    customerIdIdx: index("customer_contacts_customer_id_idx").on(table.customerId),
    contactTypeIdx: index("customer_contacts_contact_type_idx").on(table.contactType),
  })
);

// Projects 表
export const projects = pgTable(
  "projects",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, paused
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    ownerId: varchar("owner_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    iconUrl: text("icon_url"), // 项目图标 URL
    projectCode: varchar("project_code", { length: 100 }), // 项目编码
    materialCode: varchar("material_code", { length: 100 }), // 物料编码
    productName: varchar("product_name", { length: 255 }), // 产品名称（从产品管理自动填充）
    specification: varchar("specification", { length: 255 }), // 规格型号（从产品管理自动填充）
    productImageUrl: text("product_image_url"), // 产品图片URL（从产品管理自动填充）
    customerId: varchar("customer_id", { length: 36 }).references(() => customers.id, { onDelete: "set null" }), // 客户ID
    customerName: varchar("customer_name", { length: 255 }), // 客户名称（冗余存储）
    technicalContactName: varchar("technical_contact_name", { length: 255 }), // 技术联系人姓名
    technicalContactPhone: varchar("technical_contact_phone", { length: 50 }), // 技术联系人电话
    technicalContactEmail: varchar("technical_contact_email", { length: 255 }), // 技术联系人邮箱
    // 项目组成员
    projectManager: varchar("project_manager", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 项目经理
    projectManagerPhone: varchar("project_manager_phone", { length: 50 }), // 项目经理电话
    projectManagement: varchar("project_management", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 项目管理
    mechanicalLead: varchar("mechanical_lead", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 机械负责人
    electricalLead: varchar("electrical_lead", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 电气负责人
    visualLead: varchar("visual_lead", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 视觉负责人
    softwareLead: varchar("software_lead", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 软件负责人
    procurement: varchar("procurement", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 采购
    planning: varchar("planning", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 计划
    production: varchar("production", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 生产
    quality: varchar("quality", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 质量
    fieldProjectLead: varchar("field_project_lead", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 现场项目负责人
    business: varchar("business", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 商务负责人
    safety: varchar("safety", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 安全负责人
    // 项目成员电话
    mechanicalLeadPhone: varchar("mechanical_lead_phone", { length: 50 }), // 机械负责人电话
    electricalLeadPhone: varchar("electrical_lead_phone", { length: 50 }), // 电气负责人电话
    visualLeadPhone: varchar("visual_lead_phone", { length: 50 }), // 视觉负责人电话
    softwareLeadPhone: varchar("software_lead_phone", { length: 50 }), // 软件负责人电话
    algorithmLead: varchar("algorithm_lead", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 算法负责人
    algorithmLeadPhone: varchar("algorithm_lead_phone", { length: 50 }), // 算法负责人电话
    safetyLeadPhone: varchar("safety_lead_phone", { length: 50 }), // 安全负责人电话
    // 订单信息
    orderNumber: varchar("order_number", { length: 100 }), // 订单编码
    orderDate: timestamp("order_date", { withTimezone: true }), // 订单日期
    deliveryDate: timestamp("delivery_date", { withTimezone: true }), // 订单交付日期
    quantity: varchar("quantity", { length: 50 }), // 订单数量
    // 合同信息
    contractCode: varchar("contract_code", { length: 50 }), // 合同编码
    contractName: varchar("contract_name", { length: 255 }), // 合同名称
    contractDate: timestamp("contract_date", { withTimezone: true }), // 合同日期
    technicalProtocolUrl: text("technical_protocol_url"), // 技术协议URL
    progressPlan: text("progress_plan"), // 项目进度计划（JSON格式）
    customMembers: text("custom_members"), // 自定义项目成员（JSON格式）：[{role: "角色", name: "姓名", phone: "电话"}]
    approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("none"), // 审批状态：none-无需审批，pending-待审批，approved-已通过，rejected-已拒绝
    approvalRequestId: varchar("approval_request_id", { length: 36 }), // 关联的项目审批ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("projects_status_idx").on(table.status),
    ownerIdIdx: index("projects_owner_id_idx").on(table.ownerId),
    projectManagerIdx: index("projects_project_manager_idx").on(table.projectManager),
    projectCodeIdx: index("projects_project_code_idx").on(table.projectCode),
    materialCodeIdx: index("projects_material_code_idx").on(table.materialCode),
    approvalStatusIdx: index("projects_approval_status_idx").on(table.approvalStatus),
  })
);

// Tasks 表
export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskCode: varchar("task_code", { length: 100 }), // 任务编码（项目编号+XXX，如：C234001）
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("todo"), // todo, in_progress, completed
    priority: varchar("priority", { length: 50 }).notNull().default("medium"), // low, medium, high
    assignee: varchar("assignee", { length: 255 }),
    assigneeId: varchar("assignee_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "set null" }
    ),
    assignees: text("assignees"), // 指派人（JSON格式：[{id, name, role}]）
    taskMembers: text("task_members"), // 负责人（JSON格式：[{id, name, role}]）
    dueDate: timestamp("due_date", { withTimezone: true }),
    plannedStartDate: timestamp("planned_start_date", { withTimezone: true }),
    actualStartDate: timestamp("actual_start_date", { withTimezone: true }),
    plannedEndDate: timestamp("planned_end_date", { withTimezone: true }),
    actualEndDate: timestamp("actual_end_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdIdx: index("tasks_project_id_idx").on(table.projectId),
    taskCodeIdx: index("tasks_task_code_idx").on(table.taskCode),
    statusIdx: index("tasks_status_idx").on(table.status),
    assigneeIdIdx: index("tasks_assignee_id_idx").on(table.assigneeId),
  })
);

// Contracts 表 - 合同管理
export const contracts = pgTable(
  "contracts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractCode: varchar("contract_code", { length: 50 }).notNull().unique(), // 合同编码
    contractName: varchar("contract_name", { length: 255 }).notNull(), // 合同名称
    contractDate: timestamp("contract_date", { withTimezone: true }), // 合同日期
    customerCode: varchar("customer_code", { length: 50 }).notNull(), // 客户编码
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customers.id, { onDelete: "set null" }), // 客户ID
    customerName: varchar("customer_name", { length: 255 }).notNull(), // 客户名称（冗余存储）
    contractAmount: varchar("contract_amount", { length: 50 }), // 合同金额
    technicalManager: varchar("technical_manager", { length: 255 }), // 客户技术负责人
    technicalPhone: varchar("technical_phone", { length: 50 }), // 技术负责人联系电话
    procurementManager: varchar("procurement_manager", { length: 255 }), // 客户采购负责人
    procurementPhone: varchar("procurement_phone", { length: 50 }), // 采购负责人联系电话
    attachment1Url: text("attachment1_url"), // 附件一：技术协议URL
    attachment2Url: text("attachment2_url"), // 附件二：项目合同URL
    attachment3Url: text("attachment3_url"), // 附件三：订单URL
    status: varchar("status", { length: 50 }).notNull().default("active"), // 合同状态：active-有效，expired-过期，terminated-终止
    approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("none"), // 审批状态：none-无需审批，pending-待审批，approved-已通过，rejected-已拒绝
    approvalRequestId: varchar("approval_request_id", { length: 36 }), // 关联的审批申请ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    contractCodeIdx: index("contracts_contract_code_idx").on(table.contractCode),
    customerCodeIdx: index("contracts_customer_code_idx").on(table.customerCode),
    customerIdIdx: index("contracts_customer_id_idx").on(table.customerId),
    statusIdx: index("contracts_status_idx").on(table.status),
    approvalStatusIdx: index("contracts_approval_status_idx").on(table.approvalStatus),
  })
);

// Orders 表 - 订单管理
export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderNumber: varchar("order_number", { length: 100 }), // 订单号
    orderDate: timestamp("order_date", { withTimezone: true }), // 订单日期
    contractCode: varchar("contract_code", { length: 50 }), // 合同(订单)号
    customerCode: varchar("customer_code", { length: 50 }), // 客户编码
    customerName: varchar("customer_name", { length: 255 }), // 客户名称
    materialCode: varchar("material_code", { length: 100 }), // 物料编码
    projectName: varchar("project_name", { length: 255 }), // 项目名称
    specification: varchar("specification", { length: 255 }), // 规格型号
    quantity: varchar("quantity", { length: 50 }), // 数量
    deliveryDate: timestamp("delivery_date", { withTimezone: true }), // 订单交付日期
    actualDeliveryDate: timestamp("actual_delivery_date", { withTimezone: true }), // 实际交付日期
    status: varchar("status", { length: 50 }), // 状况
    projectProgress: varchar("project_progress", { length: 50 }), // 项目进度
    paymentTerms: varchar("payment_terms", { length: 255 }), // 付款条件
    orderAmount: varchar("order_amount", { length: 50 }), // 订单金额
    prepayRatio: varchar("prepay_ratio", { length: 50 }), // 预付款比率
    prepayAmount: varchar("prepay_amount", { length: 50 }), // 预付金额
    prepayReceived: boolean("prepay_received").notNull().default(false), // 预付是否已收款
    prepayDate: timestamp("prepay_date", { withTimezone: true }), // 预付日期
    prepayInvoiceAmount: varchar("prepay_invoice_amount", { length: 50 }), // 预付开票金额
    prepayInvoiceDate: timestamp("prepay_invoice_date", { withTimezone: true }), // 预付开票日期
    prepayInvoiced: boolean("prepay_invoiced").notNull().default(false), // 预付是否已开票
    arrivalAmount: varchar("arrival_amount", { length: 50 }), // 到货金额
    arrivalReceived: boolean("arrival_received").notNull().default(false), // 到货是否已收款
    arrivalDate: timestamp("arrival_date", { withTimezone: true }), // 到货日期
    arrivalInvoiceAmount: varchar("arrival_invoice_amount", { length: 50 }), // 到货开票金额
    arrivalInvoiceDate: timestamp("arrival_invoice_date", { withTimezone: true }), // 到货开票日期
    arrivalInvoiced: boolean("arrival_invoiced").notNull().default(false), // 到货是否已开票
    arrivalRatio: varchar("arrival_ratio", { length: 50 }), // 到货款比率
    acceptanceRatio: varchar("acceptance_ratio", { length: 50 }), // 验收款比率
    acceptanceAmount: varchar("acceptance_amount", { length: 50 }), // 验收金额
    acceptanceReceived: boolean("acceptance_received").notNull().default(false), // 验收是否已收款
    acceptanceDate: timestamp("acceptance_date", { withTimezone: true }), // 验收日期
    acceptanceInvoiceAmount: varchar("acceptance_invoice_amount", { length: 50 }), // 验收开票金额
    acceptanceInvoiceDate: timestamp("acceptance_invoice_date", { withTimezone: true }), // 验收开票日期
    acceptanceInvoiced: boolean("acceptance_invoiced").notNull().default(false), // 验收是否已开票
    warrantyRatio: varchar("warranty_ratio", { length: 50 }), // 质保款比率
    warrantyAmount: varchar("warranty_amount", { length: 50 }), // 质保金额
    warrantyReceived: boolean("warranty_received").notNull().default(false), // 质保是否已收款
    warrantyDate: timestamp("warranty_date", { withTimezone: true }), // 质保金付款日期
    warrantyInvoiceAmount: varchar("warranty_invoice_amount", { length: 50 }), // 质保款开票金额
    warrantyInvoiceDate: timestamp("warranty_invoice_date", { withTimezone: true }), // 质保款开票日期
    warrantyInvoiced: boolean("warranty_invoiced").notNull().default(false), // 质保是否已开票
    notes: text("notes"), // 备注
    approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("none"), // 审批状态：none-无需审批，pending-待审批，approved-已通过，rejected-已拒绝
    approvalRequestId: varchar("approval_request_id", { length: 36 }), // 关联的审批申请ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    contractCodeIdx: index("orders_contract_code_idx").on(table.contractCode),
    customerCodeIdx: index("orders_customer_code_idx").on(table.customerCode),
    statusIdx: index("orders_status_idx").on(table.status),
    orderDateIdx: index("orders_order_date_idx").on(table.orderDate),
    approvalStatusIdx: index("orders_approval_status_idx").on(table.approvalStatus),
  })
);

// Products 表 - 产品管理
export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    materialCode: varchar("material_code", { length: 100 }).notNull().unique(), // 物料编码
    materialName: varchar("material_name", { length: 255 }), // 物料名称
    projectName: varchar("project_name", { length: 255 }).notNull(), // 项目名称
    specification: varchar("specification", { length: 255 }), // 规格型号
    description: text("description"), // 产品描述
    imageUrl: text("image_url"), // 产品图片 URL
    status: varchar("status", { length: 50 }).notNull().default("active"), // 状态：active-启用，inactive-停用
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    materialCodeIdx: index("products_material_code_idx").on(table.materialCode),
    projectNameIdx: index("products_project_name_idx").on(table.projectName),
    statusIdx: index("products_status_idx").on(table.status),
  })
);

// Messages 表 - 消息中心
export const messages = pgTable(
  "messages",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: varchar("type", { length: 20 }).notNull().default("personal"), // 消息类型：personal-个人消息，announcement-系统通告，system_document-系统文档
    title: varchar("title", { length: 255 }).notNull(), // 消息标题
    content: text("content").notNull(), // 消息内容
    senderId: varchar("sender_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 发送者ID
    receiverId: varchar("receiver_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }), // 接收者ID（个人消息必须有值，通告为null）
    isRead: boolean("is_read").default(false).notNull(), // 是否已读
    readAt: timestamp("read_at", { withTimezone: true }), // 阅读时间
    isPinned: boolean("is_pinned").default(false).notNull(), // 是否置顶
    documentUrl: varchar("document_url", { length: 500 }), // 文档URL（用于系统文档）
    relatedId: varchar("related_id", { length: 36 }), // 关联ID（用于审批消息等特殊场景）
    relatedType: varchar("related_type", { length: 50 }), // 关联类型（如：project_approval, task等）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
    receiverIdIdx: index("messages_receiver_id_idx").on(table.receiverId),
    typeIdx: index("messages_type_idx").on(table.type),
    isReadIdx: index("messages_is_read_idx").on(table.isRead),
    isPinnedIdx: index("messages_is_pinned_idx").on(table.isPinned),
    relatedIdIdx: index("messages_related_id_idx").on(table.relatedId),
    relatedTypeIdx: index("messages_related_type_idx").on(table.relatedType),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

// SystemLogs 表 - 系统日志
export const systemLogs = pgTable(
  "system_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    action: varchar("action", { length: 100 }).notNull(), // 操作类型：login, logout, create, update, delete, approve, reject等
    resource: varchar("resource", { length: 100 }), // 操作的资源类型：user, project, task, customer, contract, order, message等
    resourceId: varchar("resource_id", { length: 36 }), // 操作的资源ID
    userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 操作用户ID
    username: varchar("username", { length: 100 }), // 操作用户名
    fullName: varchar("full_name", { length: 255 }), // 操作用户全名
    details: text("details"), // 操作详情（JSON格式存储详细信息）
    ipAddress: varchar("ip_address", { length: 45 }), // IP地址（支持IPv6）
    userAgent: text("user_agent"), // 用户代理字符串
    status: varchar("status", { length: 20 }).notNull().default("success"), // 操作状态：success, failed
    errorMessage: text("error_message"), // 错误信息（如果失败）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("system_logs_user_id_idx").on(table.userId),
    actionIdx: index("system_logs_action_idx").on(table.action),
    resourceIdx: index("system_logs_resource_idx").on(table.resource),
    statusIdx: index("system_logs_status_idx").on(table.status),
    createdAtIdx: index("system_logs_created_at_idx").on(table.createdAt),
  })
);

// LoginLogs 表 - 登录日志
export const loginLogs = pgTable(
  "login_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // 用户ID
    username: varchar("username", { length: 100 }).notNull(), // 用户名
    employeeNumber: varchar("employee_number", { length: 50 }), // 工号
    fullName: varchar("full_name", { length: 255 }), // 全名
    loginTime: timestamp("login_time", { withTimezone: true }).defaultNow().notNull(), // 登录时间
    logoutTime: timestamp("logout_time", { withTimezone: true }), // 登出时间
    loginDuration: integer("login_duration"), // 登录时长（秒）
    ipAddress: varchar("ip_address", { length: 45 }).notNull(), // 登录IP
    previousIpAddress: varchar("previous_ip_address", { length: 45 }), // 上次登录IP（用于检测IP变更）
    userAgent: text("user_agent"), // 用户代理字符串
    deviceType: varchar("device_type", { length: 50 }), // 设备类型：desktop, mobile, tablet
    browser: varchar("browser", { length: 100 }), // 浏览器类型
    os: varchar("os", { length: 100 }), // 操作系统
    loginMethod: varchar("login_method", { length: 20 }).notNull().default("password"), // 登录方式：password, mac
    loginStatus: varchar("login_status", { length: 20 }).notNull().default("success"), // 登录状态：success, failed
    isSensitiveOperation: boolean("is_sensitive_operation").default(false).notNull(), // 是否敏感操作
    sensitiveOperationType: varchar("sensitive_operation_type", { length: 100 }), // 敏感操作类型：ip_changed, password_changed, mac_bound
    errorMessage: text("error_message"), // 错误信息（如果失败）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("login_logs_user_id_idx").on(table.userId),
    loginTimeIdx: index("login_logs_login_time_idx").on(table.loginTime),
    ipAddressIdx: index("login_logs_ip_address_idx").on(table.ipAddress),
    loginStatusIdx: index("login_logs_login_status_idx").on(table.loginStatus),
    isSensitiveOperationIdx: index("login_logs_is_sensitive_operation_idx").on(table.isSensitiveOperation),
  })
);

// UserPermissions 表 - 用户权限管理
export const userPermissions = pgTable(
  "user_permissions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // 用户ID
    resource: varchar("resource", { length: 50 }).notNull(), // 资源类型：projects, tasks, users, customers, contracts
    permission: varchar("permission", { length: 50 }).notNull(), // 权限类型：view, edit, delete
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("user_permissions_user_id_idx").on(table.userId),
    resourceIdx: index("user_permissions_resource_idx").on(table.resource),
    permissionIdx: index("user_permissions_permission_idx").on(table.permission),
    uniqueUserResourcePermission: index("unique_user_resource_permission").on(table.userId, table.resource, table.permission),
  })
);

// AssetFiles 表 - 项目文件管理
export const assetFiles = pgTable(
  "asset_files",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }), // 项目ID
    fileName: varchar("file_name", { length: 255 }).notNull(), // 文件名
    fileKey: varchar("file_key", { length: 500 }).notNull(), // S3 存储的 key
    fileSize: varchar("file_size", { length: 50 }), // 文件大小
    fileType: varchar("file_type", { length: 100 }), // 文件类型
    filePath: varchar("file_path", { length: 500 }).notNull(), // 文件路径
    description: text("description"), // 文件描述
    uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 上传人
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdIdx: index("asset_files_project_id_idx").on(table.projectId),
    fileKeyIdx: index("asset_files_file_key_idx").on(table.fileKey),
    createdAtIdx: index("asset_files_created_at_idx").on(table.createdAt),
  })
);

// 使用 createSchemaFactory 配置 date coercion（处理前端 string → Date 转换）
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// SystemSettings 的 Zod schemas
export const insertSystemSettingSchema = createCoercedInsertSchema(systemSettings).pick({
  key: true,
  value: true,
  description: true,
});

export const updateSystemSettingSchema = createCoercedInsertSchema(systemSettings)
  .pick({
    value: true,
    description: true,
  })
  .partial();

// Users 的 Zod schemas
export const insertUserSchema = createCoercedInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true,
  role: true,
  isActive: true,
  approvalStatus: true,
  phone: true,
});

export const updateUserSchema = createCoercedInsertSchema(users)
  .pick({
    email: true,
    fullName: true,
    role: true,
    isActive: true,
    macAddress: true,
    approvalStatus: true,
    approvedBy: true,
    approvedAt: true,
    rejectReason: true,
    phone: true,
    employeeNumber: true,
    departmentId: true,
  })
  .partial();

// Departments 的 Zod schemas
export const insertDepartmentSchema = createCoercedInsertSchema(departments).pick({
  departmentCode: true,
  departmentName: true,
  description: true,
  status: true,
});

export const updateDepartmentSchema = createCoercedInsertSchema(departments)
  .pick({
    departmentCode: true,
    departmentName: true,
    description: true,
    status: true,
  })
  .partial();

// DepartmentPermissions 的 Zod schemas
export const insertDepartmentPermissionSchema = createCoercedInsertSchema(departmentPermissions).pick({
  departmentId: true,
  resource: true,
  permission: true,
});

export const updateDepartmentPermissionSchema = createCoercedInsertSchema(departmentPermissions)
  .pick({
    resource: true,
    permission: true,
  })
  .partial();

// Projects 的 Zod schemas
export const insertProjectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "paused", "cancelled"]).default("active"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  ownerId: z.string().uuid().optional(),
  iconUrl: z.string().url().optional().or(z.literal("")),
  projectCode: z.string().optional(),
  materialCode: z.string().optional(),
  productName: z.string().optional(),
  specification: z.string().optional(),
  productImageUrl: z.string().url().optional().or(z.literal("")),
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  technicalContactName: z.string().optional(),
  technicalContactPhone: z.string().optional(),
  technicalContactEmail: z.string().email().optional(),
  projectManager: z.string().uuid().optional(),
  projectManagerPhone: z.string().optional(),
  projectManagement: z.string().uuid().optional(),
  mechanicalLead: z.string().uuid().optional(),
  electricalLead: z.string().uuid().optional(),
  visualLead: z.string().uuid().optional(),
  softwareLead: z.string().uuid().optional(),
  procurement: z.string().uuid().optional(),
  planning: z.string().uuid().optional(),
  production: z.string().uuid().optional(),
  quality: z.string().uuid().optional(),
  fieldProjectLead: z.string().uuid().optional(),
  business: z.string().uuid().optional(),
  safety: z.string().uuid().optional(),
  mechanicalLeadPhone: z.string().optional(),
  electricalLeadPhone: z.string().optional(),
  visualLeadPhone: z.string().optional(),
  softwareLeadPhone: z.string().optional(),
  algorithmLead: z.string().uuid().optional(),
  algorithmLeadPhone: z.string().optional(),
  safetyLeadPhone: z.string().optional(),
  orderNumber: z.string().optional(),
  orderDate: z.date().optional(),
  deliveryDate: z.date().optional(),
  quantity: z.string().optional(),
  contractCode: z.string().optional(),
  contractName: z.string().optional(),
  contractDate: z.date().optional(),
  technicalProtocolUrl: z.string().url().optional().or(z.literal("")),
  progressPlan: z.string().optional(),
  customMembers: z.string().optional(),
});

export const updateProjectSchema = createCoercedInsertSchema(projects)
  .pick({
    name: true,
    description: true,
    status: true,
    startDate: true,
    endDate: true,
    ownerId: true,
    iconUrl: true,
    projectCode: true,
    materialCode: true,
    productName: true,
    specification: true,
    productImageUrl: true,
    customerId: true,
    customerName: true,
    technicalContactName: true,
    technicalContactPhone: true,
    technicalContactEmail: true,
    projectManager: true,
    projectManagerPhone: true,
    projectManagement: true,
    mechanicalLead: true,
    electricalLead: true,
    visualLead: true,
    softwareLead: true,
    procurement: true,
    planning: true,
    production: true,
    quality: true,
    fieldProjectLead: true,
    business: true,
    safety: true,
    mechanicalLeadPhone: true,
    electricalLeadPhone: true,
    visualLeadPhone: true,
    softwareLeadPhone: true,
    algorithmLead: true,
    algorithmLeadPhone: true,
    safetyLeadPhone: true,
    orderNumber: true,
    orderDate: true,
    deliveryDate: true,
    quantity: true,
    contractCode: true,
    contractName: true,
    contractDate: true,
    technicalProtocolUrl: true,
    progressPlan: true,
    customMembers: true,
  })
  .partial();

// Tasks 的 Zod schemas
export const insertTaskSchema = createCoercedInsertSchema(tasks).pick({
  projectId: true,
  taskCode: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assignee: true,
  assigneeId: true,
  assignees: true,
  taskMembers: true,
  dueDate: true,
  plannedStartDate: true,
  actualStartDate: true,
  plannedEndDate: true,
  actualEndDate: true,
});

export const updateTaskSchema = createCoercedInsertSchema(tasks)
  .pick({
    taskCode: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    assignee: true,
    assigneeId: true,
    assignees: true,
    taskMembers: true,
    dueDate: true,
    plannedStartDate: true,
    actualStartDate: true,
    plannedEndDate: true,
    actualEndDate: true,
  })
  .partial();

// Customers 的 Zod schemas
export const insertCustomerSchema = createCoercedInsertSchema(customers).pick({
  customerCode: true,
  customerName: true,
  phone: true,
  address: true,
  customerType: true,
  status: true,
});

export const updateCustomerSchema = createCoercedInsertSchema(customers)
  .pick({
    customerName: true,
    phone: true,
    address: true,
    customerType: true,
    status: true,
  })
  .partial();

// Customer Contacts 的 Zod schemas
export const insertCustomerContactSchema = createCoercedInsertSchema(customerContacts).pick({
  customerId: true,
  contactType: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  position: true,
});

export const updateCustomerContactSchema = createCoercedInsertSchema(customerContacts)
  .pick({
    contactType: true,
    contactName: true,
  })
  .partial();

// Contracts 的 Zod schemas
export const insertContractSchema = createCoercedInsertSchema(contracts).pick({
  contractCode: true,
  contractName: true,
  contractDate: true,
  customerCode: true,
  customerId: true,
  customerName: true,
  contractAmount: true,
  technicalManager: true,
  technicalPhone: true,
  procurementManager: true,
  procurementPhone: true,
  attachment1Url: true,
  attachment2Url: true,
  attachment3Url: true,
  status: true,
});

export const updateContractSchema = createCoercedInsertSchema(contracts)
  .pick({
    contractCode: true,
    contractName: true,
    contractDate: true,
    customerCode: true,
    customerId: true,
    customerName: true,
    contractAmount: true,
    technicalManager: true,
    technicalPhone: true,
    procurementManager: true,
    procurementPhone: true,
    attachment1Url: true,
    attachment2Url: true,
    attachment3Url: true,
    status: true,
  })
  .partial();

// Orders 的 Zod schemas
export const insertOrderSchema = createCoercedInsertSchema(orders).pick({
  orderNumber: true,
  orderDate: true,
  contractCode: true,
  customerCode: true,
  customerName: true,
  materialCode: true,
  projectName: true,
  specification: true,
  quantity: true,
  deliveryDate: true,
  actualDeliveryDate: true,
  status: true,
  projectProgress: true,
  paymentTerms: true,
  orderAmount: true,
  prepayAmount: true,
  prepayDate: true,
  prepayInvoiceAmount: true,
  prepayInvoiceDate: true,
  arrivalAmount: true,
  arrivalDate: true,
  arrivalInvoiceAmount: true,
  arrivalInvoiceDate: true,
  acceptanceAmount: true,
  acceptanceDate: true,
  acceptanceInvoiceAmount: true,
  acceptanceInvoiceDate: true,
  notes: true,
});

export const updateOrderSchema = createCoercedInsertSchema(orders)
  .pick({
    orderNumber: true,
    orderDate: true,
    contractCode: true,
    customerCode: true,
    customerName: true,
    materialCode: true,
    projectName: true,
    specification: true,
    quantity: true,
    deliveryDate: true,
    actualDeliveryDate: true,
    status: true,
    projectProgress: true,
    paymentTerms: true,
    orderAmount: true,
    prepayAmount: true,
    prepayDate: true,
    prepayInvoiceAmount: true,
    prepayInvoiceDate: true,
    arrivalAmount: true,
    arrivalDate: true,
    arrivalInvoiceAmount: true,
    arrivalInvoiceDate: true,
    acceptanceAmount: true,
    acceptanceDate: true,
    acceptanceInvoiceAmount: true,
    acceptanceInvoiceDate: true,
    notes: true,
  })
  .partial();

// Products 的 Zod schemas
export const insertProductSchema = createCoercedInsertSchema(products).pick({
  materialCode: true,
  materialName: true,
  projectName: true,
  specification: true,
  description: true,
  imageUrl: true,
  status: true,
});

export const updateProductSchema = createCoercedInsertSchema(products)
  .pick({
    materialName: true,
    projectName: true,
    specification: true,
    description: true,
    imageUrl: true,
    status: true,
  })
  .partial();

// Messages 的 Zod schemas
export const insertMessageSchema = createCoercedInsertSchema(messages).pick({
  type: true,
  title: true,
  content: true,
  senderId: true,
  receiverId: true,
  isPinned: true,
  documentUrl: true,
  relatedId: true,
  relatedType: true,
});

export const updateMessageSchema = createCoercedInsertSchema(messages)
  .pick({
    isRead: true,
    readAt: true,
  })
  .partial();

// SystemLogs 的 Zod schemas
export const insertSystemLogSchema = createCoercedInsertSchema(systemLogs).pick({
  action: true,
  resource: true,
  resourceId: true,
  userId: true,
  username: true,
  fullName: true,
  details: true,
  ipAddress: true,
  userAgent: true,
  status: true,
  errorMessage: true,
});

export const updateSystemLogSchema = createCoercedInsertSchema(systemLogs)
  .pick({
    errorMessage: true,
  })
  .partial();

// LoginLogs 的 Zod schemas
export const insertLoginLogSchema = createCoercedInsertSchema(loginLogs).pick({
  userId: true,
  username: true,
  employeeNumber: true,
  fullName: true,
  loginTime: true,
  logoutTime: true,
  loginDuration: true,
  ipAddress: true,
  previousIpAddress: true,
  userAgent: true,
  deviceType: true,
  browser: true,
  os: true,
  loginMethod: true,
  loginStatus: true,
  isSensitiveOperation: true,
  sensitiveOperationType: true,
  errorMessage: true,
});

export const updateLoginLogSchema = createCoercedInsertSchema(loginLogs)
  .pick({
    logoutTime: true,
    loginDuration: true,
    isSensitiveOperation: true,
    sensitiveOperationType: true,
  })
  .partial();

// UserPermissions 的 Zod schemas
export const insertUserPermissionSchema = createCoercedInsertSchema(userPermissions).pick({
  userId: true,
  resource: true,
  permission: true,
});

export const updateUserPermissionSchema = createCoercedInsertSchema(userPermissions)
  .pick({
    permission: true,
  })
  .partial();

// AssetFiles 的 Zod schemas
export const insertAssetFileSchema = createCoercedInsertSchema(assetFiles).pick({
  projectId: true,
  fileName: true,
  fileKey: true,
  fileSize: true,
  fileType: true,
  filePath: true,
  description: true,
  uploadedBy: true,
});

export const updateAssetFileSchema = createCoercedInsertSchema(assetFiles)
  .pick({
    fileName: true,
    filePath: true,
    description: true,
  })
  .partial();

// 项目审批类型定义
export const ProjectApprovalType = {
  NEW_PROJECT: "new_project", // 新建项目
  EDIT_PROJECT: "edit_project", // 编辑项目
  DELETE_PROJECT: "delete_project", // 删除项目
  STATUS_CHANGE: "status_change", // 状态变更
  MEMBER_CHANGE: "member_change", // 成员变更
  NEW_ORDER: "new_order", // 新建订单
  EDIT_ORDER: "edit_order", // 编辑订单
  DELETE_ORDER: "delete_order", // 删除订单
  NEW_CONTRACT: "new_contract", // 新建合同
  EDIT_CONTRACT: "edit_contract", // 编辑合同
  DELETE_CONTRACT: "delete_contract", // 删除合同
} as const;

export type ProjectApprovalTypeType = typeof ProjectApprovalType[keyof typeof ProjectApprovalType];

// 项目审批状态定义
export const ProjectApprovalStatus = {
  PENDING: "pending", // 待审批
  APPROVED: "approved", // 已通过
  REJECTED: "rejected", // 已拒绝
  CANCELLED: "cancelled", // 已取消
} as const;

export type ProjectApprovalStatusType = typeof ProjectApprovalStatus[keyof typeof ProjectApprovalStatus];

// ProjectApprovals 表 - 项目审批记录
export const projectApprovals = pgTable(
  "project_approvals",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    approvalType: varchar("approval_type", { length: 50 })
      .notNull()
      .default("new_project"), // 审批类型
    applicantId: varchar("applicant_id", { length: 36 }).notNull(), // 申请人ID
    applicantName: varchar("applicant_name", { length: 255 }), // 申请人姓名（冗余）
    currentApproverId: varchar("current_approver_id", { length: 36 }), // 当前审批人ID
    currentApproverName: varchar("current_approver_name", { length: 255 }), // 当前审批人姓名（冗余）
    status: varchar("status", { length: 50 })
      .notNull()
      .default("pending"), // pending, approved, rejected, cancelled
    currentLevel: varchar("current_level", { length: 50 }).default("level_1"), // 当前审批层级
    rejectReason: text("reject_reason"), // 拒绝原因
    approvalData: text("approval_data"), // 审批相关数据（JSON格式，存储变更内容）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }), // 审批通过时间
    rejectedAt: timestamp("rejected_at", { withTimezone: true }), // 审批拒绝时间
  },
  (table) => ({
    projectIdIdx: index("project_approvals_project_id_idx").on(table.projectId),
    statusIdx: index("project_approvals_status_idx").on(table.status),
    applicantIdIdx: index("project_approvals_applicant_id_idx").on(table.applicantId),
    currentApproverIdIdx: index("project_approvals_current_approver_id_idx").on(table.currentApproverId),
    createdAtIdx: index("project_approvals_created_at_idx").on(table.createdAt),
  })
);

// ProjectApprovalSteps 表 - 项目审批步骤记录
export const projectApprovalSteps = pgTable(
  "project_approval_steps",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    approvalId: varchar("approval_id", { length: 36 })
      .notNull()
      .references(() => projectApprovals.id, { onDelete: "cascade" }),
    level: varchar("level", { length: 50 }).notNull(), // 审批层级 level_1, level_2, level_3
    approverId: varchar("approver_id", { length: 36 }), // 审批人ID
    approverName: varchar("approver_name", { length: 255 }), // 审批人姓名（冗余）
    status: varchar("status", { length: 50 })
      .notNull()
      .default("pending"), // pending, approved, rejected
    comment: text("comment"), // 审批意见
    approvedAt: timestamp("approved_at", { withTimezone: true }), // 审批时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    approvalIdIdx: index("project_approval_steps_approval_id_idx").on(table.approvalId),
    approverIdIdx: index("project_approval_steps_approver_id_idx").on(table.approverId),
    statusIdx: index("project_approval_steps_status_idx").on(table.status),
  })
);

// ProjectApprovalFlows 表 - 项目审批流程配置
export const projectApprovalFlows = pgTable(
  "project_approval_flows",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(), // 流程名称
    description: text("description"), // 流程描述
    departmentId: varchar("department_id", { length: 36 }).references(() => departments.id, { onDelete: "set null" }), // 部门ID
    approvalType: varchar("approval_type", { length: 50 })
      .notNull(), // 审批类型
    isEnabled: boolean("is_enabled")
      .notNull()
      .default(true), // 是否启用
    level1ApproverId: varchar("level_1_approver_id", { length: 36 }), // 一级审批人ID
    level1ApproverRole: varchar("level_1_approver_role", { length: 50 }), // 一级审批人角色
    level2ApproverId: varchar("level_2_approver_id", { length: 36 }), // 二级审批人ID
    level2ApproverRole: varchar("level_2_approver_role", { length: 50 }), // 二级审批人角色
    level3ApproverId: varchar("level_3_approver_id", { length: 36 }), // 三级审批人ID
    level3ApproverRole: varchar("level_3_approver_role", { length: 50 }), // 三级审批人角色
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    approvalTypeIdx: index("project_approval_flows_approval_type_idx").on(table.approvalType),
    departmentIdIdx: index("project_approval_flows_department_id_idx").on(table.departmentId),
    deptApprovalTypeUnique: unique("project_approval_flows_dept_approval_type_unique").on(table.departmentId, table.approvalType),
  })
);

// ProjectApprovals 的 Zod schemas
export const insertProjectApprovalSchema = createCoercedInsertSchema(projectApprovals).pick({
  projectId: true,
  approvalType: true,
  applicantId: true,
  applicantName: true,
  approvalData: true,
  currentApproverId: true,
  currentApproverName: true,
});

export const updateProjectApprovalSchema = createCoercedInsertSchema(projectApprovals)
  .pick({
    status: true,
    currentApproverId: true,
    currentApproverName: true,
    currentLevel: true,
    rejectReason: true,
    approvalData: true,
  })
  .partial();

// ProjectApprovalSteps 的 Zod schemas
export const insertProjectApprovalStepSchema = createCoercedInsertSchema(projectApprovalSteps).pick({
  approvalId: true,
  level: true,
  approverId: true,
  approverName: true,
  comment: true,
});

export const updateProjectApprovalStepSchema = createCoercedInsertSchema(projectApprovalSteps)
  .pick({
    status: true,
    comment: true,
  })
  .partial();

// ApprovalRequests 表 - 通用审批申请表（支持订单、合同等）
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestNumber: varchar("request_number", { length: 50 }).notNull().unique(), // 审批单号
    requestType: varchar("request_type", { length: 50 }).notNull(), // 申请类型：order-订单，contract-合同
    requestId: varchar("request_id", { length: 36 }).notNull(), // 关联的订单或合同ID
    title: varchar("title", { length: 255 }).notNull(), // 审批标题
    content: text("content"), // 审批内容（JSON格式，存储详细信息）
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 审批状态：pending-待审批，approved-已通过，rejected-已拒绝，cancelled-已取消
    applicantId: varchar("applicant_id", { length: 36 }).notNull(), // 申请人ID
    applicantName: varchar("applicant_name", { length: 255 }).notNull(), // 申请人姓名
    currentApproverId: varchar("current_approver_id", { length: 36 }), // 当前审批人ID
    currentApproverName: varchar("current_approver_name", { length: 255 }), // 当前审批人姓名
    currentStep: varchar("current_step", { length: 50 }).notNull().default("level1"), // 当前审批步骤：level1, level2, level3
    totalSteps: varchar("total_steps", { length: 50 }).notNull().default("level1"), // 总步骤数
    approvalDate: timestamp("approval_date", { withTimezone: true }), // 最终审批时间
    approvalNote: text("approval_note"), // 最终审批意见
    relatedData: text("related_data"), // 关联数据（JSON格式）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    requestNumberIdx: index("approval_requests_request_number_idx").on(table.requestNumber),
    requestTypeIdx: index("approval_requests_request_type_idx").on(table.requestType),
    requestIdIdx: index("approval_requests_request_id_idx").on(table.requestId),
    statusIdx: index("approval_requests_status_idx").on(table.status),
    applicantIdIdx: index("approval_requests_applicant_id_idx").on(table.applicantId),
    currentApproverIdIdx: index("approval_requests_current_approver_id_idx").on(table.currentApproverId),
  })
);

// ApprovalHistory 表 - 审批历史表
export const approvalHistory = pgTable(
  "approval_history",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestId: varchar("request_id", { length: 36 })
      .notNull()
      .references(() => approvalRequests.id, { onDelete: "cascade" }), // 审批申请ID
    step: varchar("step", { length: 50 }).notNull(), // 审批步骤：level1, level2, level3
    approverId: varchar("approver_id", { length: 36 }).notNull(), // 审批人ID
    approverName: varchar("approver_name", { length: 255 }).notNull(), // 审批人姓名
    action: varchar("action", { length: 50 }).notNull(), // 操作：approve-通过，reject-拒绝
    actionNote: text("action_note"), // 操作意见
    actionAt: timestamp("action_at", { withTimezone: true })
      .defaultNow()
      .notNull(), // 操作时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    requestIdIdx: index("approval_history_request_id_idx").on(table.requestId),
    approverIdIdx: index("approval_history_approver_id_idx").on(table.approverId),
  })
);

// ApprovalRequests 的 Zod schemas
export const insertApprovalRequestSchema = createCoercedInsertSchema(approvalRequests).pick({
  requestNumber: true,
  requestType: true,
  requestId: true,
  title: true,
  content: true,
  applicantId: true,
  applicantName: true,
  currentApproverId: true,
  currentApproverName: true,
  totalSteps: true,
  relatedData: true,
});

export const updateApprovalRequestSchema = createCoercedInsertSchema(approvalRequests)
  .pick({
    title: true,
    content: true,
    status: true,
    currentApproverId: true,
    currentApproverName: true,
    currentStep: true,
    approvalDate: true,
    approvalNote: true,
    relatedData: true,
  })
  .partial();

// ApprovalHistory 的 Zod schemas
export const insertApprovalHistorySchema = createCoercedInsertSchema(approvalHistory).pick({
  requestId: true,
  step: true,
  approverId: true,
  approverName: true,
  action: true,
  actionNote: true,
});

export const updateApprovalHistorySchema = createCoercedInsertSchema(approvalHistory)
  .pick({
    action: true,
    actionNote: true,
  })
  .partial();

// CodingRules 表 - 产品编码规则表
export const codingRules = pgTable(
  "coding_rules",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    category_name: varchar("category_name", { length: 100 }).notNull(), // 类别名称（成品、半成品、原材料、工具辅料）
    category_code: varchar("category_code", { length: 10 }).notNull().unique(), // 类别代码
    first_digit: varchar("first_digit", { length: 1 }).notNull(), // 第一位（固定字符）
    second_digit_range: varchar("second_digit_range", { length: 50 }), // 第二位范围
    third_fourth_digit_range: varchar("third_fourth_digit_range", { length: 50 }), // 第三四位范围
    fifth_ninth_digit_range: varchar("fifth_ninth_digit_range", { length: 50 }), // 第五九位范围
    tenth_digit_range: varchar("tenth_digit_range", { length: 50 }), // 第十位范围（版本号）
    eleventh_digit_range: varchar("eleventh_digit_range", { length: 50 }), // 第十一位范围（校验位）
    total_length: varchar("total_length", { length: 5 }).notNull().default("11"), // 编码总长度
    description: text("description"), // 描述
    is_active: boolean("is_active").default(true).notNull(), // 是否启用
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    categoryNameIdx: index("coding_rules_category_name_idx").on(table.category_name),
    categoryCodeIdx: index("coding_rules_category_code_idx").on(table.category_code),
    isActiveIdx: index("coding_rules_is_active_idx").on(table.is_active),
  })
);

// CodingCategories 表 - 编码分类表
export const codingCategories = pgTable(
  "coding_categories",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    rule_id: varchar("rule_id", { length: 36 })
      .notNull()
      .references(() => codingRules.id, { onDelete: "cascade" }), // 关联的编码规则ID
    category_level: varchar("category_level", { length: 20 }).notNull(), // 分类级别（major-大类，sub-子类，material-材质）
    code: varchar("code", { length: 10 }).notNull(), // 分类代码
    name: varchar("name", { length: 100 }).notNull(), // 分类名称
    description: text("description"), // 描述
    parent_id: varchar("parent_id", { length: 36 }), // 父分类ID（用于子类关联大类）
    sequence_start: varchar("sequence_start", { length: 10 }).notNull().default("00001"), // 流水号起始值
    sequence_current: varchar("sequence_current", { length: 10 }).notNull().default("00001"), // 当前流水号
    is_active: boolean("is_active").default(true).notNull(), // 是否启用
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    ruleIdIdx: index("coding_categories_rule_id_idx").on(table.rule_id),
    categoryLevelIdx: index("coding_categories_category_level_idx").on(table.category_level),
    parentIdIdx: index("coding_categories_parent_id_idx").on(table.parent_id),
    isActiveIdx: index("coding_categories_is_active_idx").on(table.is_active),
  })
);

// GeneratedCodes 表 - 生成的编码记录表
export const generatedCodes = pgTable(
  "generated_codes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 20 }).notNull().unique(), // 生成的编码
    material_name: varchar("material_name", { length: 255 }).notNull(), // 物料名称
    rule_id: varchar("rule_id", { length: 36 })
      .notNull()
      .references(() => codingRules.id, { onDelete: "cascade" }), // 关联的编码规则ID
    major_category_id: varchar("major_category_id", { length: 36 }), // 大类ID
    sub_category_id: varchar("sub_category_id", { length: 36 }), // 子类ID
    material_category_id: varchar("material_category_id", { length: 36 }), // 材质ID
    processing_step: varchar("processing_step", { length: 50 }), // 加工步骤
    version: varchar("version", { length: 5 }), // 版本号
    sequence_number: varchar("sequence_number", { length: 10 }), // 流水号
    created_by: varchar("created_by", { length: 36 }), // 创建人ID
    status: varchar("status", { length: 20 }).notNull().default("active"), // 状态
    remarks: text("remarks"), // 备注
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    codeIdx: index("generated_codes_code_idx").on(table.code),
    materialNameIdx: index("generated_codes_material_name_idx").on(table.material_name),
    ruleIdIdx: index("generated_codes_rule_id_idx").on(table.rule_id),
    statusIdx: index("generated_codes_status_idx").on(table.status),
    createdAtIdx: index("generated_codes_created_at_idx").on(table.created_at),
  })
);

// KnowledgeBase 表 - 知识库主表
export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(), // 知识库标题
    content: text("content"), // 知识库内容（富文本或markdown）
    projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "set null" }), // 关联的项目ID（可为空）
    taskId: varchar("task_id", { length: 36 }).references(() => tasks.id, { onDelete: "set null" }), // 关联的任务ID（可为空）
    category: varchar("category", { length: 100 }).notNull().default("general"), // 分类：general-通用，project-项目，task-任务，technical-技术
    tags: text("tags"), // 标签（JSON数组）
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 创建人ID
    updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 更新人ID
    viewCount: varchar("view_count", { length: 20 }).default("0"), // 浏览次数
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    titleIdx: index("knowledge_base_title_idx").on(table.title),
    projectIdIdx: index("knowledge_base_project_id_idx").on(table.projectId),
    taskIdIdx: index("knowledge_base_task_id_idx").on(table.taskId),
    categoryIdx: index("knowledge_base_category_idx").on(table.category),
    createdByIdx: index("knowledge_base_created_by_idx").on(table.createdBy),
    createdAtIdx: index("knowledge_base_created_at_idx").on(table.createdAt),
  })
);

// KnowledgeBaseAttachments 表 - 知识库附件表
export const knowledgeBaseAttachments = pgTable(
  "knowledge_base_attachments",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    knowledgeBaseId: varchar("knowledge_base_id", { length: 36 })
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: "cascade" }), // 知识库ID
    fileName: varchar("file_name", { length: 255 }).notNull(), // 文件名
    fileUrl: text("file_url").notNull(), // 文件URL（对象存储路径）
    fileSize: varchar("file_size", { length: 50 }), // 文件大小（字节）
    fileType: varchar("file_type", { length: 100 }).notNull(), // 文件类型：pdf, ppt, pptx, xls, xlsx, doc, docx等
    uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 上传人ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    knowledgeBaseIdIdx: index("knowledge_base_attachments_kb_id_idx").on(table.knowledgeBaseId),
    fileTypeIdx: index("knowledge_base_attachments_file_type_idx").on(table.fileType),
  })
);

// CodingRules 的 Zod schemas
export const insertCodingRuleSchema = createCoercedInsertSchema(codingRules).pick({
  category_name: true,
  category_code: true,
  first_digit: true,
  second_digit_range: true,
  third_fourth_digit_range: true,
  fifth_ninth_digit_range: true,
  tenth_digit_range: true,
  eleventh_digit_range: true,
  total_length: true,
  description: true,
  is_active: true,
});

export const updateCodingRuleSchema = createCoercedInsertSchema(codingRules)
  .pick({
    category_name: true,
    category_code: true,
    first_digit: true,
    second_digit_range: true,
    third_fourth_digit_range: true,
    fifth_ninth_digit_range: true,
    tenth_digit_range: true,
    eleventh_digit_range: true,
    total_length: true,
    description: true,
    is_active: true,
  })
  .partial();

// CodingCategories 的 Zod schemas
export const insertCodingCategorySchema = createCoercedInsertSchema(codingCategories).pick({
  rule_id: true,
  category_level: true,
  code: true,
  name: true,
  description: true,
  parent_id: true,
  sequence_start: true,
  sequence_current: true,
  is_active: true,
});

export const updateCodingCategorySchema = createCoercedInsertSchema(codingCategories)
  .pick({
    code: true,
    name: true,
    description: true,
    parent_id: true,
    sequence_start: true,
    sequence_current: true,
    is_active: true,
  })
  .partial();

// GeneratedCodes 的 Zod schemas
export const insertGeneratedCodeSchema = createCoercedInsertSchema(generatedCodes).pick({
  code: true,
  material_name: true,
  rule_id: true,
  major_category_id: true,
  sub_category_id: true,
  material_category_id: true,
  processing_step: true,
  version: true,
  sequence_number: true,
  created_by: true,
  status: true,
  remarks: true,
});

export const updateGeneratedCodeSchema = createCoercedInsertSchema(generatedCodes)
  .pick({
    material_name: true,
    status: true,
    remarks: true,
  })
  .partial();

// 送货管理表
export const deliveries = pgTable(
  "deliveries",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    deliveryNumber: varchar("delivery_number", { length: 50 }).notNull().unique(), // 送货单号
    orderId: varchar("order_id", { length: 36 }).references(() => orders.id, { onDelete: "set null" }), // 关联订单ID
    orderNumber: varchar("order_number", { length: 50 }), // 订单编号
    customerId: varchar("customer_id", { length: 36 }).references(() => customers.id, { onDelete: "set null" }), // 客户ID
    customerName: varchar("customer_name", { length: 200 }), // 客户名称
    projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "set null" }), // 项目ID
    projectName: varchar("project_name", { length: 200 }), // 项目名称
    contactPerson: varchar("contact_person", { length: 100 }), // 联系人
    contactPhone: varchar("contact_phone", { length: 50 }), // 联系电话
    deliveryAddress: text("delivery_address"), // 送货地址
    plannedDeliveryDate: timestamp("planned_delivery_date", { withTimezone: true }), // 计划送货日期
    actualDeliveryDate: timestamp("actual_delivery_date", { withTimezone: true }), // 实际送货日期
    status: varchar("status", { length: 50 }).default("pending").notNull(), // 状态：pending(待送货), shipped(已发货), delivered(已送达), cancelled(已取消)
    items: text("items"), // 送货明细（JSON格式）
    totalQuantity: integer("total_quantity").default(0), // 总数量
    remarks: text("remarks"), // 备注
    shippedBy: varchar("shipped_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 发货人ID
    shippedByName: varchar("shipped_by_name", { length: 100 }), // 发货人姓名
    receivedBy: varchar("received_by", { length: 100 }), // 收货人
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // 创建人ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }), // 更新时间
  },
  (table) => ({
    deliveryNumberIdx: index("deliveries_delivery_number_idx").on(table.deliveryNumber),
    statusIdx: index("deliveries_status_idx").on(table.status),
    customerIdIdx: index("deliveries_customer_id_idx").on(table.customerId),
    orderIdIdx: index("deliveries_order_id_idx").on(table.orderId),
    plannedDeliveryDateIdx: index("deliveries_planned_delivery_date_idx").on(table.plannedDeliveryDate),
  })
);

// Deliveries 的 Zod schemas
export const insertDeliverySchema = createCoercedInsertSchema(deliveries).pick({
  deliveryNumber: true,
  orderId: true,
  orderNumber: true,
  customerId: true,
  customerName: true,
  projectId: true,
  projectName: true,
  contactPerson: true,
  contactPhone: true,
  deliveryAddress: true,
  plannedDeliveryDate: true,
  actualDeliveryDate: true,
  status: true,
  items: true,
  totalQuantity: true,
  remarks: true,
  shippedBy: true,
  shippedByName: true,
  receivedBy: true,
  createdBy: true,
});

export const updateDeliverySchema = createCoercedInsertSchema(deliveries)
  .pick({
    deliveryNumber: true,
    orderId: true,
    orderNumber: true,
    customerId: true,
    customerName: true,
    projectId: true,
    projectName: true,
    contactPerson: true,
    contactPhone: true,
    deliveryAddress: true,
    plannedDeliveryDate: true,
    actualDeliveryDate: true,
    status: true,
    items: true,
    totalQuantity: true,
    remarks: true,
    shippedBy: true,
    shippedByName: true,
    receivedBy: true,
  })
  .partial();

// KnowledgeBase 的 Zod schemas
export const insertKnowledgeBaseSchema = createCoercedInsertSchema(knowledgeBase).pick({
  title: true,
  content: true,
  projectId: true,
  taskId: true,
  category: true,
  tags: true,
  createdBy: true,
  viewCount: true,
});

export const updateKnowledgeBaseSchema = createCoercedInsertSchema(knowledgeBase)
  .pick({
    title: true,
    content: true,
    category: true,
    tags: true,
    viewCount: true,
  })
  .partial();

// KnowledgeBaseAttachments 的 Zod schemas
export const insertKnowledgeBaseAttachmentSchema = createCoercedInsertSchema(knowledgeBaseAttachments).pick({
  knowledgeBaseId: true,
  fileName: true,
  fileUrl: true,
  fileSize: true,
  fileType: true,
  uploadedBy: true,
});

export const updateKnowledgeBaseAttachmentSchema = createCoercedInsertSchema(knowledgeBaseAttachments)
  .pick({
    fileName: true,
  })
  .partial();

// ProjectApprovalFlows 的 Zod schemas
export const insertProjectApprovalFlowSchema = createCoercedInsertSchema(projectApprovalFlows).pick({
  name: true,
  description: true,
  approvalType: true,
  isEnabled: true,
  level1ApproverId: true,
  level1ApproverRole: true,
  level2ApproverId: true,
  level2ApproverRole: true,
  level3ApproverId: true,
  level3ApproverRole: true,
});

export const updateProjectApprovalFlowSchema = createCoercedInsertSchema(projectApprovalFlows)
  .pick({
    name: true,
    description: true,
    isEnabled: true,
    level1ApproverId: true,
    level1ApproverRole: true,
    level2ApproverId: true,
    level2ApproverRole: true,
    level3ApproverId: true,
    level3ApproverRole: true,
  })
  .partial();

// TypeScript types
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type UpdateSystemSetting = z.infer<typeof updateSystemSettingSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type UpdateDepartment = z.infer<typeof updateDepartmentSchema>;

export type DepartmentPermission = typeof departmentPermissions.$inferSelect;
export type InsertDepartmentPermission = z.infer<typeof insertDepartmentPermissionSchema>;
export type UpdateDepartmentPermission = z.infer<typeof updateDepartmentPermissionSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

export type CustomerContact = typeof customerContacts.$inferSelect;
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type UpdateCustomerContact = z.infer<typeof updateCustomerContactSchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type UpdateContract = z.infer<typeof updateContractSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UpdateOrder = z.infer<typeof updateOrderSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type UpdateSystemLog = z.infer<typeof updateSystemLogSchema>;

export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;
export type UpdateLoginLog = z.infer<typeof updateLoginLogSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type UpdateUserPermission = z.infer<typeof updateUserPermissionSchema>;

export type AssetFile = typeof assetFiles.$inferSelect;
export type InsertAssetFile = z.infer<typeof insertAssetFileSchema>;
export type UpdateAssetFile = z.infer<typeof updateAssetFileSchema>;

export type ProjectApproval = typeof projectApprovals.$inferSelect;
export type InsertProjectApproval = z.infer<typeof insertProjectApprovalSchema>;
export type UpdateProjectApproval = z.infer<typeof updateProjectApprovalSchema>;

export type ProjectApprovalStep = typeof projectApprovalSteps.$inferSelect;
export type InsertProjectApprovalStep = z.infer<typeof insertProjectApprovalStepSchema>;
export type UpdateProjectApprovalStep = z.infer<typeof updateProjectApprovalStepSchema>;

export type ProjectApprovalFlow = typeof projectApprovalFlows.$inferSelect;
export type InsertProjectApprovalFlow = z.infer<typeof insertProjectApprovalFlowSchema>;
export type UpdateProjectApprovalFlow = z.infer<typeof updateProjectApprovalFlowSchema>;

export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type UpdateDelivery = z.infer<typeof updateDeliverySchema>;

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type UpdateApprovalRequest = z.infer<typeof updateApprovalRequestSchema>;

export type ApprovalHistory = typeof approvalHistory.$inferSelect;
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;
export type UpdateApprovalHistory = z.infer<typeof updateApprovalHistorySchema>;

export type CodingRule = typeof codingRules.$inferSelect;
export type InsertCodingRule = z.infer<typeof insertCodingRuleSchema>;
export type UpdateCodingRule = z.infer<typeof updateCodingRuleSchema>;

export type CodingCategory = typeof codingCategories.$inferSelect;
export type InsertCodingCategory = z.infer<typeof insertCodingCategorySchema>;
export type UpdateCodingCategory = z.infer<typeof updateCodingCategorySchema>;

export type GeneratedCode = typeof generatedCodes.$inferSelect;
export type InsertGeneratedCode = z.infer<typeof insertGeneratedCodeSchema>;
export type UpdateGeneratedCode = z.infer<typeof updateGeneratedCodeSchema>;

// CodingRulesV2 表 - 产品编码规则表（13 位编码）
export const codingRulesV2 = pgTable(
  "coding_rules_v2",
  {
    rule_id: varchar("rule_id").primaryKey().default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 1 }).notNull().unique(), // 产品大类代码（1 位数字）
    name: varchar("name", { length: 100 }).notNull(), // 产品大类名称
    description: text("description"), // 描述
    is_active: boolean("is_active").default(true).notNull(), // 是否启用
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    codeIdx: index("coding_rules_v2_code_idx").on(table.code),
    isActiveIdx: index("coding_rules_v2_is_active_idx").on(table.is_active),
  })
);

// CodingCategoriesV2 表 - 编码分类表（13 位编码）
export const codingCategoriesV2 = pgTable(
  "coding_categories_v2",
  {
    category_id: varchar("category_id").primaryKey().default(sql`gen_random_uuid()`),
    rule_id: varchar("rule_id", { length: 36 })
      .notNull()
      .references(() => codingRulesV2.rule_id, { onDelete: "cascade" }), // 关联的产品大类 ID
    category_level: varchar("category_level", { length: 20 }).notNull(), // 分类级别（second-第二阶，third-第三阶，process-工艺）
    code: varchar("code", { length: 10 }).notNull(), // 分类代码
    name: varchar("name", { length: 100 }).notNull(), // 分类名称
    description: text("description"), // 描述
    parent_id: varchar("parent_id", { length: 36 }), // 父分类 ID（用于第三阶关联第二阶）
    is_active: boolean("is_active").default(true).notNull(), // 是否启用
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    ruleIdIdx: index("coding_categories_v2_rule_id_idx").on(table.rule_id),
    categoryLevelIdx: index("coding_categories_v2_category_level_idx").on(table.category_level),
    parentIdIdx: index("coding_categories_v2_parent_id_idx").on(table.parent_id),
    isActiveIdx: index("coding_categories_v2_is_active_idx").on(table.is_active),
  })
);

// GeneratedCodesV2 表 - 生成的编码记录表（13 位编码）
export const generatedCodesV2 = pgTable(
  "generated_codes_v2",
  {
    record_id: varchar("record_id").primaryKey().default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 13 }).notNull().unique(), // 生成的 13 位编码
    material_name: varchar("material_name", { length: 255 }).notNull(), // 物料名称
    rule_id: varchar("rule_id", { length: 36 })
      .notNull()
      .references(() => codingRulesV2.rule_id, { onDelete: "cascade" }), // 关联的产品大类 ID
    second_category_id: varchar("second_category_id", { length: 36 }), // 第二阶分类 ID
    third_category_id: varchar("third_category_id", { length: 36 }), // 第三阶分类 ID
    process_category_id: varchar("process_category_id", { length: 36 }), // 工艺分类 ID
    sequence_number: integer("sequence_number").notNull(), // 流水号
    version: varchar("version", { length: 1 }).notNull(), // 版本号（A-Z）
    project_name: varchar("project_name", { length: 255 }), // 项目名称
    created_by: varchar("created_by", { length: 36 }), // 创建人 ID
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    codeIdx: index("generated_codes_v2_code_idx").on(table.code),
    materialNameIdx: index("generated_codes_v2_material_name_idx").on(table.material_name),
    ruleIdIdx: index("generated_codes_v2_rule_id_idx").on(table.rule_id),
    createdAtIdx: index("generated_codes_v2_created_at_idx").on(table.created_at),
  })
);

// 为 V2 表创建 Zod Schema
export const insertCodingRuleV2Schema = createCoercedInsertSchema(codingRulesV2);
export const updateCodingRuleV2Schema = createCoercedInsertSchema(codingRulesV2).partial();

export const insertCodingCategoryV2Schema = createCoercedInsertSchema(codingCategoriesV2);
export const updateCodingCategoryV2Schema = createCoercedInsertSchema(codingCategoriesV2).partial();

export const insertGeneratedCodeV2Schema = createCoercedInsertSchema(generatedCodesV2);
export const updateGeneratedCodeV2Schema = createCoercedInsertSchema(generatedCodesV2).partial();

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type UpdateKnowledgeBase = z.infer<typeof updateKnowledgeBaseSchema>;

export type KnowledgeBaseAttachment = typeof knowledgeBaseAttachments.$inferSelect;
export type InsertKnowledgeBaseAttachment = z.infer<typeof insertKnowledgeBaseAttachmentSchema>;
export type UpdateKnowledgeBaseAttachment = z.infer<typeof updateKnowledgeBaseAttachmentSchema>;
