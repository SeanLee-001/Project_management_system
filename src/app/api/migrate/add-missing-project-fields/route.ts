import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/add-missing-project-fields - 添加缺失的项目字段到projects表
export async function POST() {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkColumn = async (columnName: string): Promise<boolean> => {
      const result = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'projects'
          AND column_name = '${columnName}'
        );
      `);
      return result.rows[0].exists as boolean;
    };

    const columnsToAdd = [
      { name: "project_manager_phone", type: "VARCHAR(50)", constraints: "", comment: "项目经理电话" },
      { name: "order_number", type: "VARCHAR(100)", constraints: "", comment: "订单编码" },
      { name: "quantity", type: "VARCHAR(50)", constraints: "", comment: "订单数量" },
    ];

    const results: string[] = [];

    for (const column of columnsToAdd) {
      const exists = await checkColumn(column.name);
      if (!exists) {
        await db.execute(`
          ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} ${column.constraints || ""};
        `);
        results.push(`✓ 已添加字段: ${column.name}`);
      } else {
        results.push(`- 字段已存在: ${column.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "缺失的项目字段迁移完成",
      data: results,
    });
  } catch (error: any) {
    console.error("Error migrating missing project fields:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "迁移失败",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
