import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import * as schema from "@/storage/database/shared/schema";
import * as bcrypt from "bcryptjs";
import { getUserFromToken, isSystemAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
    }
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ success: false, error: "仅限系统管理员" }, { status: 403 });
    }
    const body = await request.json();
    let { data, version } = body;

    // 处理不同的数据格式
    if (body.success && body.data) {
      // 如果数据包含在 {success, data} 结构中（来自导出API的响应）
      const innerData = body.data;
      data = innerData.data;
      version = innerData.version;
    }

    // 调试日志
    console.log("Import request received");
    console.log("Data type:", typeof data);
    console.log("Data keys:", data ? Object.keys(data) : "null");
    console.log("Sample systemSettings count:", data?.systemSettings?.length || 0);
    console.log("Sample users count:", data?.users?.length || 0);
    console.log("Sample projects count:", data?.projects?.length || 0);

    // 验证数据格式
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Invalid data format" },
        { status: 400 }
      );
    }

    // 辅助函数：将日期字符串转换为Date对象
    const convertDates = (obj: any) => {
      if (!obj) return obj;
      const result: any = {};
      for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'string' && (
          key.includes('At') || key.includes('Date') || key.includes('Time')
        )) {
          // 尝试解析日期
          result[key] = value ? new Date(value) : null;
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    const db = await getDb();

    // 导入统计
    const stats = {
      systemSettings: 0,
      users: 0,
      projects: 0,
      tasks: 0,
      customers: 0,
      customerContacts: 0,
      contracts: 0,
      orders: 0,
      products: 0,
      userPermissions: 0,
    };

    // 清空现有数据（按依赖顺序）
    try {
      await db.delete(schema.userPermissions);
      await db.delete(schema.products);
      await db.delete(schema.orders);
      await db.delete(schema.contracts);
      await db.delete(schema.customerContacts);
      await db.delete(schema.customers);
      await db.delete(schema.tasks);
      await db.delete(schema.projects);
      await db.delete(schema.users);
      await db.delete(schema.systemSettings);
    } catch (error) {
      console.error("Error clearing database:", error);
      // 继续尝试导入
    }

    // 导入系统设置
    console.log("Starting to import systemSettings...");
    if (data.systemSettings && Array.isArray(data.systemSettings)) {
      console.log(`Found ${data.systemSettings.length} systemSettings to import`);
      for (const item of data.systemSettings) {
        try {
          const itemWithDates = convertDates(item);
          await db.insert(schema.systemSettings).values({
            ...itemWithDates,
            id: itemWithDates.id || undefined,
          });
          stats.systemSettings++;
          console.log(`Imported systemSetting: ${item.key}`);
        } catch (error) {
          console.error("Error inserting systemSettings:", error);
          throw error;
        }
      }
      console.log(`Total systemSettings imported: ${stats.systemSettings}`);
    }

    // 导入用户
    if (data.users && Array.isArray(data.users)) {
      for (const user of data.users) {
        try {
          const userWithDates = convertDates(user);
          const hashedPassword = await bcrypt.hash(user.password || "admin123", 10);

          await db.insert(schema.users).values({
            ...userWithDates,
            id: userWithDates.id || undefined,
            password: hashedPassword,
            passwordExpireAt: userWithDates.passwordExpireAt || undefined,
          });
          stats.users++;
        } catch (error) {
          console.error("Error inserting user:", error);
          throw error;
        }
      }
    }

    // 导入项目
    if (data.projects && Array.isArray(data.projects)) {
      for (const project of data.projects) {
        try {
          const projectWithDates = convertDates(project);
          await db.insert(schema.projects).values({
            ...projectWithDates,
            id: projectWithDates.id || undefined,
          });
          stats.projects++;
        } catch (error) {
          console.error("Error inserting project:", error);
          throw error;
        }
      }
    }

    // 导入任务
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        try {
          const taskWithDates = convertDates(task);
          await db.insert(schema.tasks).values({
            ...taskWithDates,
            id: taskWithDates.id || undefined,
          });
          stats.tasks++;
        } catch (error) {
          console.error("Error inserting task:", error);
          throw error;
        }
      }
    }

    // 导入客户
    if (data.customers && Array.isArray(data.customers)) {
      for (const customer of data.customers) {
        try {
          const customerWithDates = convertDates(customer);
          await db.insert(schema.customers).values({
            ...customerWithDates,
            id: customerWithDates.id || undefined,
          });
          stats.customers++;
        } catch (error) {
          console.error("Error inserting customer:", error);
          throw error;
        }
      }
    }

    // 导入客户联系人
    if (data.customerContacts && Array.isArray(data.customerContacts)) {
      for (const contact of data.customerContacts) {
        try {
          const contactWithDates = convertDates(contact);
          await db.insert(schema.customerContacts).values({
            ...contactWithDates,
            id: contactWithDates.id || undefined,
          });
          stats.customerContacts++;
        } catch (error) {
          console.error("Error inserting customerContact:", error);
          throw error;
        }
      }
    }

    // 导入合同
    if (data.contracts && Array.isArray(data.contracts)) {
      for (const contract of data.contracts) {
        try {
          const contractWithDates = convertDates(contract);
          await db.insert(schema.contracts).values({
            ...contractWithDates,
            id: contractWithDates.id || undefined,
          });
          stats.contracts++;
        } catch (error) {
          console.error("Error inserting contract:", error);
          throw error;
        }
      }
    }

    // 导入订单
    if (data.orders && Array.isArray(data.orders)) {
      for (const order of data.orders) {
        try {
          const orderWithDates = convertDates(order);
          await db.insert(schema.orders).values({
            ...orderWithDates,
            id: orderWithDates.id || undefined,
          });
          stats.orders++;
        } catch (error) {
          console.error("Error inserting order:", error);
          throw error;
        }
      }
    }

    // 导入产品
    if (data.products && Array.isArray(data.products)) {
      for (const product of data.products) {
        try {
          const productWithDates = convertDates(product);
          await db.insert(schema.products).values({
            ...productWithDates,
            id: productWithDates.id || undefined,
          });
          stats.products++;
        } catch (error) {
          console.error("Error inserting product:", error);
          throw error;
        }
      }
    }

    // 导入用户权限
    if (data.userPermissions && Array.isArray(data.userPermissions)) {
      for (const permission of data.userPermissions) {
        try {
          const permissionWithDates = convertDates(permission);
          await db.insert(schema.userPermissions).values({
            ...permissionWithDates,
            id: permissionWithDates.id || undefined,
          });
          stats.userPermissions++;
        } catch (error) {
          console.error("Error inserting permission:", error);
          throw error;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Database imported successfully",
        data: {
          stats,
          importTime: new Date().toISOString(),
          sourceVersion: version,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error importing database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
