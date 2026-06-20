import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import * as schema from "@/storage/database/shared/schema";
import { getUserFromToken, isSystemAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
    }
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ success: false, error: "仅限系统管理员" }, { status: 403 });
    }
    const db = await getDb();

    // 获取所有表的数据
    const tables = {
      systemSettings: await db.select().from(schema.systemSettings),
      users: await db.select().from(schema.users),
      projects: await db.select().from(schema.projects),
      tasks: await db.select().from(schema.tasks),
      customers: await db.select().from(schema.customers),
      customerContacts: await db.select().from(schema.customerContacts),
      contracts: await db.select().from(schema.contracts),
      orders: await db.select().from(schema.orders),
      products: await db.select().from(schema.products),
      userPermissions: await db.select().from(schema.userPermissions),
    };

    // 创建导出数据对象（排除密码等敏感信息）
    const exportData = {
      exportTime: new Date().toISOString(),
      version: "1.0",
      data: {
        ...tables,
        // 从users表中移除密码字段
        users: tables.users.map(({ password, ...user }) => user),
      },
    };

    return NextResponse.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error("Error exporting database:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export database" },
      { status: 500 }
    );
  }
}
