import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/add-customer-fields - 添加客户信息字段到projects表
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
      { name: "customer_id", type: "VARCHAR(36)", constraints: "REFERENCES customers(id) ON DELETE SET NULL" },
      { name: "customer_name", type: "VARCHAR(255)", constraints: "" },
      { name: "technical_contact_name", type: "VARCHAR(255)", constraints: "" },
      { name: "technical_contact_phone", type: "VARCHAR(50)", constraints: "" },
      { name: "technical_contact_email", type: "VARCHAR(255)", constraints: "" },
    ];

    const results: string[] = [];

    for (const column of columnsToAdd) {
      const exists = await checkColumn(column.name);
      if (!exists) {
        await db.execute(`
          ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} ${column.constraints};
        `);
        results.push(`✓ 已添加字段: ${column.name}`);
      } else {
        results.push(`- 字段已存在: ${column.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "客户信息字段迁移完成",
      data: results,
    });
  } catch (error: any) {
    console.error("Error migrating customer fields:", error);
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
