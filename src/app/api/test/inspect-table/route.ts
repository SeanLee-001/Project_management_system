import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// GET /api/test/inspect-table - 检查projects表结构
export async function GET() {
  try {
    const db = await getDb();

    // 查询表结构
    const result = await db.execute(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position;
    `);

    return NextResponse.json({
      success: true,
      columns: result.rows,
    });
  } catch (error: any) {
    console.error("Error inspecting table:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "查询失败",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
