import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/add-custom-members-field - 添加customMembers字段到projects表
export async function POST() {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkResult = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'custom_members'
      );
    `);

    const exists = checkResult.rows[0].exists as boolean;

    if (exists) {
      return NextResponse.json({
        success: true,
        message: "custom_members字段已存在",
        data: ["- 字段已存在: custom_members"],
      });
    }

    // 添加customMembers字段
    await db.execute(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS custom_members TEXT;
    `);

    return NextResponse.json({
      success: true,
      message: "custom_members字段迁移完成",
      data: ["✓ 已添加字段: custom_members"],
    });
  } catch (error: any) {
    console.error("Error migrating custom_members field:", error);
    return NextResponse.json(
      {
        success: false,
        message: "custom_members字段迁移失败",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
