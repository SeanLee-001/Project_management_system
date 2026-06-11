import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages'
      AND column_name IN ('related_id', 'related_type')
    `);

    const existingColumns = checkResult.rows.map(row => row.column_name);
    const hasRelatedId = existingColumns.includes('related_id');
    const hasRelatedType = existingColumns.includes('related_type');

    const actions = [];

    // 添加 related_id 字段
    if (!hasRelatedId) {
      await db.execute(sql`
        ALTER TABLE messages
        ADD COLUMN related_id VARCHAR(36)
      `);
      actions.push("添加 related_id 字段");
    }

    // 添加 related_type 字段
    if (!hasRelatedType) {
      await db.execute(sql`
        ALTER TABLE messages
        ADD COLUMN related_type VARCHAR(50)
      `);
      actions.push("添加 related_type 字段");
    }

    // 创建索引（如果不存在）
    if (!hasRelatedId) {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS messages_related_id_idx ON messages(related_id)
      `);
      actions.push("创建 related_id 索引");
    }

    if (!hasRelatedType) {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS messages_related_type_idx ON messages(related_type)
      `);
      actions.push("创建 related_type 索引");
    }

    if (actions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "所有字段已存在，无需迁移",
      });
    }

    return NextResponse.json({
      success: true,
      message: `迁移完成：${actions.join('、')}`,
    });
  } catch (error) {
    console.error("添加消息关联字段失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "添加消息关联字段失败",
      },
      { status: 500 }
    );
  }
}
