import { NextRequest, NextResponse } from "next/server";
import {
  userManager,
  customerManager,
  contractManager,
  orderManager,
  productManager,
  projectManager,
  messageManager,
  taskManager,
} from "@/storage/database";
import { UserRole, roles } from "@/storage/database/shared/schema";
import type { InsertProject } from "@/storage/database/shared/schema";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/test/generate-test-data - 生成测试数据
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get("reset") === "true";

    console.log("开始生成测试数据...");

    const results: any = {
      roles: [],
      users: [],
      customers: [],
      customerContacts: [],
      products: [],
      contracts: [],
      orders: [],
      projects: [],
      tasks: [],
      messages: [],
    };

    // 1. 生成角色数据（如果不存在）
    console.log("正在生成角色数据...");
    const db = await getDb();
    const roleCodes = [
      "system_admin",
      "project_manager",
      "mechanical_engineer",
      "electrical_engineer",
      "visual_engineer",
      "software_engineer",
      "project_management",
      "production_planning",
      "quality_management",
      "procurement_management",
      "department_manager",
      "field_supervisor",
      "project_member",
      "business",
      "safety_officer",
    ];

    const roleNames = [
      "系统管理员",
      "项目经理",
      "机械工程师",
      "电气工程师",
      "视觉工程师",
      "软件工程师",
      "项目管理",
      "生产计划",
      "质量管理",
      "采购管理",
      "部门经理",
      "现场负责人",
      "项目成员",
      "商务",
      "安全员",
    ];

    const createdRoles: any[] = [];
    for (let i = 0; i < roleCodes.length; i++) {
      // 检查角色是否已存在
      const existingRoles = await db.select().from(roles).limit(1);
      const existingRole = existingRoles.length > 0 ? existingRoles[0] : null;

      if (existingRole) {
        // 角色已存在，直接使用
        const allRoles = await db.select().from(roles);
        createdRoles.push(...allRoles);
        allRoles.forEach((role: any) => {
          results.roles.push({
            id: role.id,
            roleCode: role.roleCode,
            roleName: role.roleName,
          });
        });
        break;
      }

      const [role] = await db
        .insert(roles)
        .values({
          roleCode: roleCodes[i],
          roleName: roleNames[i],
          description: `${roleNames[i]}角色`,
          isSystem: roleCodes[i] === "system_admin",
          isActive: true,
        })
        .returning();
      createdRoles.push(role);
      results.roles.push({
        id: role.id,
        roleCode: role.roleCode,
        roleName: role.roleName,
      });
    }
    console.log(`✓ 生成 ${createdRoles.length} 个角色`);

    // 2. 生成用户数据（10个）
    console.log("正在生成用户数据...");
    const userData = [
      {
        username: "wangxiaoming",
        email: "wangxiaoming@test.com",
        password: "Test123456",
        fullName: "王小明",
        role: UserRole.PROJECT_MANAGER,
        phone: "13800138001",
        employeeNumber: "E001",
        approvalStatus: "approved",
      },
      {
        username: "lihua",
        email: "lihua@test.com",
        password: "Test123456",
        fullName: "李华",
        role: UserRole.MECHANICAL_ENGINEER,
        phone: "13800138002",
        employeeNumber: "E002",
        approvalStatus: "approved",
      },
      {
        username: "zhangwei",
        email: "zhangwei@test.com",
        password: "Test123456",
        fullName: "张伟",
        role: UserRole.ELECTRICAL_ENGINEER,
        phone: "13800138003",
        employeeNumber: "E003",
        approvalStatus: "approved",
      },
      {
        username: "liujing",
        email: "liujing@test.com",
        password: "Test123456",
        fullName: "刘静",
        role: UserRole.VISUAL_ENGINEER,
        phone: "13800138004",
        employeeNumber: "E004",
        approvalStatus: "approved",
      },
      {
        username: "chenqiang",
        email: "chenqiang@test.com",
        password: "Test123456",
        fullName: "陈强",
        role: UserRole.SOFTWARE_ENGINEER,
        phone: "13800138005",
        employeeNumber: "E005",
        approvalStatus: "approved",
      },
      {
        username: "wangfang",
        email: "wangfang@test.com",
        password: "Test123456",
        fullName: "王芳",
        role: UserRole.QUALITY_MANAGEMENT,
        phone: "13800138006",
        employeeNumber: "E006",
        approvalStatus: "approved",
      },
      {
        username: "liyan",
        email: "liyan@test.com",
        password: "Test123456",
        fullName: "李燕",
        role: UserRole.PROCUREMENT_MANAGEMENT,
        phone: "13800138007",
        employeeNumber: "E007",
        approvalStatus: "approved",
      },
      {
        username: "zhaoli",
        email: "zhaoli@test.com",
        password: "Test123456",
        fullName: "赵丽",
        role: UserRole.BUSINESS,
        phone: "13800138008",
        employeeNumber: "E008",
        approvalStatus: "approved",
      },
      {
        username: "sunhong",
        email: "sunhong@test.com",
        password: "Test123456",
        fullName: "孙红",
        role: UserRole.SAFETY_OFFICER,
        phone: "13800138009",
        employeeNumber: "E009",
        approvalStatus: "approved",
      },
      {
        username: "zhouping",
        email: "zhouping@test.com",
        password: "Test123456",
        fullName: "周平",
        role: UserRole.PROJECT_MEMBER,
        phone: "13800138010",
        employeeNumber: "E010",
        approvalStatus: "approved",
      },
    ];

    const createdUsers: any[] = [];
    for (const user of userData) {
      try {
        // 检查用户是否已存在
        const existingUser = await userManager.getUserByUsername(user.username);
        if (existingUser) {
          // 用户已存在，添加到结果列表
          createdUsers.push(existingUser);
          results.users.push({
            id: existingUser.id,
            username: existingUser.username,
            fullName: existingUser.fullName,
            role: existingUser.role,
          });
        } else {
          // 创建新用户
          const createdUser = await userManager.createUser(user, true);
          createdUsers.push(createdUser);
          results.users.push({
            id: createdUser.id,
            username: createdUser.username,
            fullName: createdUser.fullName,
            role: createdUser.role,
          });
        }
      } catch (error: any) {
        console.warn(`创建用户 ${user.username} 失败:`, error.message);
      }
    }
    console.log(`✓ 生成 ${createdUsers.length} 个用户`);

    // 3. 生成客户数据（10个）
    console.log("正在生成客户数据...");
    const customerData = [
      {
        customerCode: "C2024001",
        customerName: "北京航天科技集团",
        phone: "010-88888888",
        address: "北京市海淀区航天路1号",
        customerType: "terminal",
        status: "active",
      },
      {
        customerCode: "C2024002",
        customerName: "上海汽车工业集团",
        phone: "021-66666666",
        address: "上海市浦东新区汽车大道888号",
        customerType: "terminal",
        status: "active",
      },
      {
        customerCode: "C2024003",
        customerName: "深圳华为技术有限公司",
        phone: "0755-28888888",
        address: "深圳市龙岗区坂田华为基地",
        customerType: "terminal",
        status: "active",
      },
      {
        customerCode: "C2024004",
        customerName: "广州工业设备进出口公司",
        phone: "020-77777777",
        address: "广州市天河区珠江新城",
        customerType: "agent",
        status: "active",
      },
      {
        customerCode: "C2024005",
        customerName: "成都重工机械制造厂",
        phone: "028-55555555",
        address: "成都市武侯区工业开发区",
        customerType: "terminal",
        status: "active",
      },
      {
        customerCode: "C2024006",
        customerName: "武汉钢铁集团",
        phone: "027-44444444",
        address: "武汉市青山区钢铁大道100号",
        customerType: "terminal",
        status: "active",
      },
      {
        customerCode: "C2024007",
        customerName: "西安电子科技研究所",
        phone: "029-33333333",
        address: "西安市雁塔区电子城",
        customerType: "terminal",
        status: "active",
      },
      {
        customerCode: "C2024008",
        customerName: "南京精密仪器有限公司",
        phone: "025-22222222",
        address: "南京市江宁区科学园",
        customerType: "agent",
        status: "active",
      },
      {
        customerCode: "C2024009",
        customerName: "杭州智能制造装备公司",
        phone: "0571-11111111",
        address: "杭州市滨江区高新技术园区",
        customerType: "terminal",
        status: "active",
      },
      {
        customerCode: "C2024010",
        customerName: "苏州自动化系统公司",
        phone: "0512-00000000",
        address: "苏州市工业园区星湖街",
        customerType: "terminal",
        status: "active",
      },
    ];

    const createdCustomers: any[] = [];
    for (const customer of customerData) {
      try {
        // 检查客户是否已存在
        const existingCustomer = await customerManager.getByCustomerCode(customer.customerCode);
        if (existingCustomer) {
          createdCustomers.push(existingCustomer);
          results.customers.push({
            id: existingCustomer.id,
            customerCode: existingCustomer.customerCode,
            customerName: existingCustomer.customerName,
          });
        } else {
          const createdCustomer = await customerManager.create(customer);
          createdCustomers.push(createdCustomer);
          results.customers.push({
            id: createdCustomer.id,
            customerCode: createdCustomer.customerCode,
            customerName: createdCustomer.customerName,
          });
        }
      } catch (error: any) {
        console.warn(`创建客户 ${customer.customerCode} 失败:`, error.message);
      }
    }
    console.log(`✓ 生成 ${createdCustomers.length} 个客户`);

    // 4. 生成客户联系人数据（每个客户2个联系人）
    console.log("正在生成客户联系人数据...");
    const contactTypes = ["procurement", "technical"];
    for (let i = 0; i < createdCustomers.length; i++) {
      const customer = createdCustomers[i];
      const contacts = [
        {
          customerId: customer.id,
          contactType: "procurement",
          contactName: `采购联系人${i + 1}A`,
          contactPhone: `13900${String(i + 1).padStart(3, "0")}1`,
          contactEmail: `procurement${i + 1}@${customer.customerName.replace(/[\u4e00-\u9fa5]/g, "").toLowerCase()}.com`,
          position: "采购经理",
        },
        {
          customerId: customer.id,
          contactType: "technical",
          contactName: `技术联系人${i + 1}B`,
          contactPhone: `13900${String(i + 1).padStart(3, "0")}2`,
          contactEmail: `technical${i + 1}@${customer.customerName.replace(/[\u4e00-\u9fa5]/g, "").toLowerCase()}.com`,
          position: "技术总监",
        },
      ];

      for (const contact of contacts) {
        const createdContact = await customerManager.createContact(contact);
        results.customerContacts.push({
          id: createdContact.id,
          customerId: createdContact.customerId,
          contactName: createdContact.contactName,
          contactType: createdContact.contactType,
        });
      }
    }
    console.log(`✓ 生成 ${results.customerContacts.length} 个客户联系人`);

    // 5. 生成产品数据（10个）
    console.log("正在生成产品数据...");
    const productData = [
      {
        materialCode: "MAT-2024001",
        projectName: "智能自动化生产线",
        specification: "ZX-Auto-001",
        description: "全自动生产线设备，包含机器人控制系统",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024002",
        projectName: "工业机器人本体",
        specification: "IRB-1200",
        description: "6轴工业机器人，负载12kg，臂展1200mm",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024003",
        projectName: "数控加工中心",
        specification: "CNC-X5000",
        description: "五轴数控加工中心，精度±0.005mm",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024004",
        projectName: "智能仓储系统",
        specification: "WHS-1000",
        description: "自动化立体仓库系统，支持10000货位",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024005",
        projectName: "AGV搬运机器人",
        specification: "AGV-500",
        description: "自动导引运输车，载重500kg",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024006",
        projectName: "视觉检测系统",
        specification: "VIS-2000",
        description: "高精度视觉检测设备，检测精度0.1mm",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024007",
        projectName: "激光焊接设备",
        specification: "LW-8000",
        description: "光纤激光焊接机，功率8000W",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024008",
        projectName: "智能制造执行系统",
        specification: "MES-V5",
        description: "制造执行系统软件，支持车间数字化管理",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024009",
        projectName: "工业物联网平台",
        specification: "IIoT-Cloud",
        description: "工业物联网数据采集与分析平台",
        imageUrl: "",
        status: "active",
      },
      {
        materialCode: "MAT-2024010",
        projectName: "智能检测生产线",
        specification: "IQ-Line-300",
        description: "产品质量检测生产线，集成多种检测设备",
        imageUrl: "",
        status: "active",
      },
    ];

    const createdProducts: any[] = [];
    for (const product of productData) {
      try {
        // 检查产品是否已存在（通过物料编码）
        const existingProducts = await productManager.getProducts({
          filters: { materialCode: product.materialCode },
        });
        if (existingProducts.length > 0) {
          const existingProduct = existingProducts[0];
          createdProducts.push(existingProduct);
          results.products.push({
            id: existingProduct.id,
            materialCode: existingProduct.materialCode,
            projectName: existingProduct.projectName,
          });
        } else {
          const createdProduct = await productManager.createProduct(product);
          createdProducts.push(createdProduct);
          results.products.push({
            id: createdProduct.id,
            materialCode: createdProduct.materialCode,
            projectName: createdProduct.projectName,
          });
        }
      } catch (error: any) {
        console.warn(`创建产品 ${product.materialCode} 失败:`, error.message);
      }
    }
    console.log(`✓ 生成 ${createdProducts.length} 个产品`);

    // 6. 生成合同数据（10个）
    console.log("正在生成合同数据...");
    const contractData = createdCustomers.map((customer, index) => ({
      contractCode: `CT-${2024}${String(index + 1).padStart(4, "0")}`,
      contractName: `${customer.customerName}技术合作合同`,
      contractDate: new Date(2024, index, 1).toISOString(),
      customerCode: customer.customerCode,
      customerId: customer.id,
      customerName: customer.customerName,
      contractAmount: `${(Math.random() * 500 + 100).toFixed(2)}万`,
      technicalManager: `技术负责人${index + 1}`,
      technicalPhone: `13901${String(index + 1).padStart(3, "0")}1`,
      procurementManager: `采购负责人${index + 1}`,
      procurementPhone: `13901${String(index + 1).padStart(3, "0")}2`,
      status: "active",
      approvalStatus: "approved",
    }));

    const createdContracts: any[] = [];
    for (const contract of contractData) {
      try {
        // 获取所有现有合同
        const existingContracts = await contractManager.getAll();
        const existingContract = existingContracts.find(
          (c: any) => c.contractCode === contract.contractCode
        );

        if (existingContract) {
          createdContracts.push(existingContract);
          results.contracts.push({
            id: existingContract.id,
            contractCode: existingContract.contractCode,
            contractName: existingContract.contractName,
          });
        } else {
          const createdContract = await contractManager.create(contract);
          createdContracts.push(createdContract);
          results.contracts.push({
            id: createdContract.id,
            contractCode: createdContract.contractCode,
            contractName: createdContract.contractName,
          });
        }
      } catch (error: any) {
        console.warn(`创建合同 ${contract.contractCode} 失败:`, error.message);
      }
    }
    console.log(`✓ 生成 ${createdContracts.length} 个合同`);

    // 7. 生成订单数据（10个）
    console.log("正在生成订单数据...");
    const orderData = createdContracts.map((contract, index) => {
      const product = createdProducts[index % createdProducts.length];
      return {
        orderNumber: `OD-${2024}${String(index + 1).padStart(4, "0")}`,
        orderDate: new Date(2024, index, 5).toISOString(),
        contractCode: contract.contractCode,
        customerCode: contract.customerCode,
        customerName: contract.customerName,
        materialCode: product.materialCode,
        projectName: product.projectName,
        specification: product.specification,
        quantity: `${Math.floor(Math.random() * 50 + 5)}台`,
        deliveryDate: new Date(2025, index, 1).toISOString(),
        status: "进行中",
        projectProgress: `${Math.floor(Math.random() * 80 + 20)}%`,
        paymentTerms: "合同总金额的30%预付，60%到货付，10%质保金",
        orderAmount: contract.contractAmount,
        prepayRatio: "30%",
        prepayAmount: `${(parseFloat(contract.contractAmount) * 0.3).toFixed(2)}万`,
        arrivalRatio: "60%",
        arrivalAmount: `${(parseFloat(contract.contractAmount) * 0.6).toFixed(2)}万`,
        acceptanceRatio: "5%",
        acceptanceAmount: `${(parseFloat(contract.contractAmount) * 0.05).toFixed(2)}万`,
        warrantyRatio: "5%",
        warrantyAmount: `${(parseFloat(contract.contractAmount) * 0.05).toFixed(2)}万`,
        notes: `备注信息${index + 1}：按时交付，质量保证`,
        approvalStatus: "approved",
      };
    });

    const createdOrders: any[] = [];
    for (const order of orderData) {
      try {
        // 获取所有现有订单
        const existingOrders = await orderManager.getAll();
        const existingOrder = existingOrders.find(
          (o: any) => o.orderNumber === order.orderNumber
        );

        if (existingOrder) {
          createdOrders.push(existingOrder);
          results.orders.push({
            id: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            projectName: existingOrder.projectName,
          });
        } else {
          const createdOrder = await orderManager.create(order);
          createdOrders.push(createdOrder);
          results.orders.push({
            id: createdOrder.id,
            orderNumber: createdOrder.orderNumber,
            projectName: createdOrder.projectName,
          });
        }
      } catch (error: any) {
        console.warn(`创建订单 ${order.orderNumber} 失败:`, error.message);
      }
    }
    console.log(`✓ 生成 ${createdOrders.length} 个订单`);

    // 8. 生成项目数据（10个）
    console.log("正在生成项目数据...");
    const projectData = createdOrders.map((order, index) => {
      const customer = createdCustomers[index % createdCustomers.length];
      const orderDataItem = orderData[index];
      return {
        name: `${order.projectName}-${customer.customerName}`,
        description: `为${customer.customerName}提供${order.projectName}全套解决方案`,
        status: index < 2 ? "completed" : index < 5 ? "active" : "paused",
        startDate: new Date(2024, index, 1).toISOString(),
        endDate: new Date(2025, index, 1).toISOString(),
        ownerId: createdUsers[0].id,
        iconUrl: "",
        projectCode: `P${2024}${String(index + 1).padStart(3, "0")}`,
        materialCode: order.materialCode,
        productName: order.projectName,
        specification: order.specification,
        customerId: customer.id,
        customerName: customer.customerName,
        technicalContactName: `技术联系人${index + 1}`,
        technicalContactPhone: `13902${String(index + 1).padStart(3, "0")}1`,
        technicalContactEmail: `tech${index + 1}@test.com`,
        projectManager: createdUsers[0].id,
        projectManagerPhone: createdUsers[0].phone,
        mechanicalLead: createdUsers[1].id,
        mechanicalLeadPhone: createdUsers[1].phone,
        electricalLead: createdUsers[2].id,
        electricalLeadPhone: createdUsers[2].phone,
        visualLead: createdUsers[3].id,
        visualLeadPhone: createdUsers[3].phone,
        softwareLead: createdUsers[4].id,
        softwareLeadPhone: createdUsers[4].phone,
        procurement: createdUsers[6].id,
        planning: createdUsers[5].id,
        production: createdUsers[5].id,
        quality: createdUsers[5].id,
        business: createdUsers[7].id,
        safety: createdUsers[8].id,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        quantity: order.quantity,
        contractCode: createdContracts[index].contractCode,
        contractName: createdContracts[index].contractName,
        contractDate: createdContracts[index].contractDate,
        approvalStatus: "approved",
      };
    });

    const createdProjects: any[] = [];
    for (const project of projectData) {
      try {
        // 检查项目是否已存在（通过项目编号）
        const existingProject = await projectManager.getProjectByProjectCode(project.projectCode);
        if (existingProject) {
          createdProjects.push(existingProject);
          results.projects.push({
            id: existingProject.id,
            projectCode: existingProject.projectCode,
            name: existingProject.name,
          });
        } else {
          const createdProject = await projectManager.createProject(project as unknown as InsertProject);
          createdProjects.push(createdProject);
          results.projects.push({
            id: createdProject.id,
            projectCode: createdProject.projectCode,
            name: createdProject.name,
          });
        }
      } catch (error: any) {
        console.warn(`创建项目 ${project.projectCode} 失败:`, error.message);
      }
    }
    console.log(`✓ 生成 ${createdProjects.length} 个项目`);

    // 9. 生成任务数据（每个项目3个任务）
    console.log("正在生成任务数据...");
    const taskTitles = [
      "需求分析与设计",
      "系统开发与测试",
      "设备采购与安装",
      "系统集成与调试",
      "用户培训与交付",
    ];

    const taskPriorities = ["low", "medium", "high"];

    for (let i = 0; i < createdProjects.length; i++) {
      const project = createdProjects[i];
      const taskCount = 3;
      for (let j = 0; j < taskCount; j++) {
        const taskData = {
          projectId: project.id,
          taskCode: `${project.projectCode}-${String(j + 1).padStart(2, "0")}`,
          title: `${taskTitles[j % taskTitles.length]} - 第${j + 1}阶段`,
          description: `项目第${j + 1}阶段的详细任务描述`,
          status: j === 0 ? "completed" : j === 1 ? "in_progress" : "todo",
          priority: taskPriorities[j % taskPriorities.length],
          assignee: createdUsers[j % createdUsers.length].fullName,
          assigneeId: createdUsers[j % createdUsers.length].id,
          dueDate: new Date(2024, i, (j + 1) * 10),
          plannedStartDate: new Date(2024, i, j * 10 + 1),
          plannedEndDate: new Date(2024, i, (j + 1) * 10),
        };

        try {
          const createdTask = await taskManager.createTask(taskData);
          results.tasks.push({
            id: createdTask.id,
            taskCode: createdTask.taskCode,
            title: createdTask.title,
            projectId: createdTask.projectId,
          });
        } catch (error: any) {
          console.warn(`创建任务失败:`, error.message);
        }
      }
    }
    console.log(`✓ 生成 ${results.tasks.length} 个任务`);

    // 10. 生成消息数据（10个）
    console.log("正在生成消息数据...");
    const messageData = [
      {
        type: "announcement",
        title: "系统升级通知",
        content: "系统将于本周末进行升级维护，请提前做好数据备份工作。升级时间：周六22:00-周日06:00。",
        senderId: createdUsers[0].id,
        isPinned: true,
      },
      {
        type: "announcement",
        title: "新功能上线公告",
        content: "项目管理模块新增甘特图功能，支持任务可视化展示和拖拽调整，欢迎大家使用并提出反馈意见。",
        senderId: createdUsers[0].id,
        isPinned: false,
      },
      {
        type: "personal",
        title: "项目进度提醒",
        content: "请尽快完成P2024001项目的需求分析与设计任务，截止日期为本周五。",
        senderId: createdUsers[0].id,
        receiverId: createdUsers[1].id,
      },
      {
        type: "personal",
        title: "审批通知",
        content: "您提交的合同CT-2024001审批已通过，请及时联系客户进行签约。",
        senderId: createdUsers[0].id,
        receiverId: createdUsers[7].id,
      },
      {
        type: "personal",
        title: "任务分配",
        content: "已为您分配新的任务：机械设计阶段，请查看任务详情。",
        senderId: createdUsers[0].id,
        receiverId: createdUsers[1].id,
      },
      {
        type: "announcement",
        title: "安全培训通知",
        content: "下周三下午14:00将在培训中心进行安全生产培训，请项目相关人员准时参加。",
        senderId: createdUsers[8].id,
        isPinned: false,
      },
      {
        type: "personal",
        title: "客户来访通知",
        content: "北京航天科技集团客户将于下周一上午9:00来访，请项目团队做好准备。",
        senderId: createdUsers[7].id,
        receiverId: createdUsers[0].id,
      },
      {
        type: "announcement",
        title: "年度总结会议",
        content: "公司将于12月28日召开年度总结会议，各部门请准备年度工作总结报告。",
        senderId: createdUsers[0].id,
        isPinned: true,
      },
      {
        type: "personal",
        title: "文档审核",
        content: "请审核技术协议文档，如有问题请在周五前反馈。",
        senderId: createdUsers[2].id,
        receiverId: createdUsers[1].id,
      },
      {
        type: "announcement",
        title: "假期安排通知",
        content: "元旦放假安排：12月30日至1月1日放假，共3天，1月2日正常上班。",
        senderId: createdUsers[0].id,
        isPinned: false,
      },
    ];

    for (const message of messageData) {
      try {
        const createdMessage = await messageManager.createMessage(message);
        results.messages.push({
          id: createdMessage.id,
          title: createdMessage.title,
          type: createdMessage.type,
        });
      } catch (error: any) {
        console.warn(`创建消息 ${message.title} 失败:`, error.message);
      }
    }
    console.log(`✓ 生成 ${results.messages.length} 个消息`);

    // 统计汇总
    console.log("\n========== 测试数据生成完成 ==========");
    console.log(`角色: ${results.roles.length} 个`);
    console.log(`用户: ${results.users.length} 个`);
    console.log(`客户: ${results.customers.length} 个`);
    console.log(`客户联系人: ${results.customerContacts.length} 个`);
    console.log(`产品: ${results.products.length} 个`);
    console.log(`合同: ${results.contracts.length} 个`);
    console.log(`订单: ${results.orders.length} 个`);
    console.log(`项目: ${results.projects.length} 个`);
    console.log(`任务: ${results.tasks.length} 个`);
    console.log(`消息: ${results.messages.length} 个`);
    console.log("========================================\n");

    return NextResponse.json(
      {
        success: true,
        message: "测试数据生成成功",
        data: results,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("生成测试数据失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "生成测试数据失败",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
