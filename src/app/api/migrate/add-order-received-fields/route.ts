import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

/**
 * 添加收款确认字段到orders表
 * 使用方法：
 * GET /api/migrate/add-order-received-fields
 *
 * 添加以下字段：
 * - prepay_received: 预付是否已收款
 * - arrival_received: 到货是否已收款
 * - acceptance_received: 验收是否已收款
 * - warranty_received: 质保是否已收款
 *
 * 注意：此API应在部署后运行一次，添加收款确认字段到现有数据库
 */
export async function GET(request: NextRequest) {
  try {
    console.log("Starting to add received fields to orders table...");

    const db = await getDb();

    const fields = [
      { name: 'prepay_received', type: 'BOOLEAN', default: 'false' },
      { name: 'arrival_received', type: 'BOOLEAN', default: 'false' },
      { name: 'acceptance_received', type: 'BOOLEAN', default: 'false' },
      { name: 'warranty_received', type: 'BOOLEAN', default: 'false' },
    ];

    const addedFields = [];
    const skippedFields = [];

    for (const field of fields) {
      // 检查字段是否已存在
      const checkResult = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = ${field.name}
      `);

      if (checkResult.rows && checkResult.rows.length > 0) {
        console.log(`${field.name} field already exists in orders table`);
        skippedFields.push(field.name);
        continue;
      }

      // 添加字段
      await db.execute(sql`
        ALTER TABLE orders
        ADD COLUMN ${sql.identifier(field.name)} ${sql.raw(field.type)} NOT NULL DEFAULT ${sql.raw(field.default)}
      `);

      console.log(`${field.name} field added successfully`);
      addedFields.push(field.name);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Added ${addedFields.length} fields to orders table`,
        addedFields,
        skippedFields,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding received fields:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add received fields",
      },
      { status: 500 }
    );
  }
}
