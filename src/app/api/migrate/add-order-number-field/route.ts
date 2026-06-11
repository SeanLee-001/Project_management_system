import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

/**
 * 添加orderNumber字段到orders表
 * 使用方法：
 * GET /api/migrate/add-order-number-field
 *
 * 注意：此API应在部署后运行一次，添加orderNumber字段到现有数据库
 */
export async function GET(request: NextRequest) {
  try {
    console.log("Starting to add orderNumber field to orders table...");

    const db = await getDb();

    // 检查orderNumber字段是否已存在
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders'
      AND column_name = 'order_number'
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: "orderNumber field already exists in orders table",
        },
        { status: 200 }
      );
    }

    // 添加orderNumber字段
    await db.execute(sql`
      ALTER TABLE orders
      ADD COLUMN order_number VARCHAR(100)
    `);

    console.log("orderNumber field added successfully");

    return NextResponse.json(
      {
        success: true,
        message: "orderNumber field added to orders table successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding orderNumber field:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add orderNumber field",
      },
      { status: 500 }
    );
  }
}
