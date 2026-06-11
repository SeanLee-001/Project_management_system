import { NextRequest, NextResponse } from "next/server";
import { projectManager } from "@/storage/database/projectManager";
import { getDb } from "coze-coding-dev-sdk";
import { projects } from "@/storage/database/shared/schema";

// POST /api/test/insert-project - 测试项目插入
export async function POST() {
  try {
    const db = await getDb();

    // 1. 检查数据库表结构
    const columnsResult = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position;
    `);

    console.log("Database columns:", columnsResult.rows);

    // 2. 检查 schema 定义中的字段
    const schemaColumns = Object.keys(projects);
    console.log("Schema columns:", schemaColumns);

    // 3. 尝试插入测试数据
    const testData = {
      name: "测试项目 - customMembers",
      description: "测试 customMembers 字段",
      status: "active" as const,
      customMembers: JSON.stringify([
        { id: "1", role: "测试角色", name: "张三", phone: "13800138000" }
      ]),
    };

    console.log("Attempting to insert with data:", testData);
    const project = await projectManager.createProject(testData);

    return NextResponse.json({
      success: true,
      message: "测试成功",
      data: {
        databaseColumns: columnsResult.rows.map((r: any) => r.column_name),
        schemaColumns: schemaColumns,
        createdProject: project,
      },
    });
  } catch (error: any) {
    console.error("Test failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "测试失败",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
