import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

export async function POST() {
  try {
    const db = await getDb();

    // 添加 menu_configuration 字段
    await db.execute(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS menu_configuration TEXT
    `);

    return NextResponse.json({
      success: true,
      message: "菜单配置字段迁移成功",
    });
  } catch (error) {
    console.error("菜单配置迁移失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "菜单配置迁移失败",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
