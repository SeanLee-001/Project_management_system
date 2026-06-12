import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

/**
 * 数据库迁移：添加产品表物料名称字段
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND column_name = 'material_name'
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: "物料名称字段已存在",
      });
    }

    // 添加物料名称字段
    await db.execute(sql`
      ALTER TABLE products 
      ADD COLUMN material_name VARCHAR(255)
    `);

    return NextResponse.json({
      success: true,
      message: "迁移成功：已添加物料名称字段",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "迁移失败",
      },
      { status: 500 }
    );
  }
}
