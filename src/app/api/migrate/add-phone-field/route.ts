import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

/**
 * 添加phone字段到users表
 * 使用方法：
 * GET /api/migrate/add-phone-field
 *
 * 注意：此API应在部署后运行一次，添加phone字段到现有数据库
 */
export async function GET(request: NextRequest) {
  try {
    console.log("Starting to add phone field to users table...");

    const db = await getDb();

    // 检查phone字段是否已存在
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'phone'
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: "Phone field already exists in users table",
        },
        { status: 200 }
      );
    }

    // 添加phone字段
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN phone VARCHAR(20)
    `);

    console.log("Phone field added successfully");

    // 创建索引
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone)
      `);
      console.log("Phone index created successfully");
    } catch (indexError) {
      console.log("Warning: Failed to create phone index:", indexError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Phone field added to users table successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding phone field:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add phone field",
      },
      { status: 500 }
    );
  }
}
