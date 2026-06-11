import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkResult = await db.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'projects'
      AND column_name = 'approval_status';
    `);

    const rows = checkResult.rows as any[];

    if (rows && rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: "项目表审批状态字段已存在，无需迁移",
      });
    }

    // 添加审批状态字段
    await db.execute(`
      ALTER TABLE projects
      ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'none',
      ADD COLUMN approval_request_id VARCHAR(36);
    `);

    // 添加索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS projects_approval_status_idx
      ON projects(approval_status);
    `);

    return NextResponse.json({
      success: true,
      message: "项目表审批状态字段添加成功",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "数据库迁移失败",
      },
      { status: 500 }
    );
  }
}
