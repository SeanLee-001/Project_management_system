import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    const db = await getDb();

    // 检查表是否存在
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'messages'
      ) as exists
    `);

    const tableExists = result.rows[0]?.exists;

    if (tableExists) {
      return NextResponse.json({
        success: true,
        message: "messages表已存在",
      });
    }

    // 创建messages表
    await db.execute(sql`
      CREATE TABLE messages (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'announcement')),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        sender_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        receiver_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    // 创建索引
    await db.execute(sql`
      CREATE INDEX messages_sender_id_idx ON messages(sender_id)
    `);

    await db.execute(sql`
      CREATE INDEX messages_receiver_id_idx ON messages(receiver_id)
    `);

    await db.execute(sql`
      CREATE INDEX messages_type_idx ON messages(type)
    `);

    await db.execute(sql`
      CREATE INDEX messages_is_read_idx ON messages(is_read)
    `);

    await db.execute(sql`
      CREATE INDEX messages_created_at_idx ON messages(created_at)
    `);

    return NextResponse.json({
      success: true,
      message: "messages表创建成功",
    });
  } catch (error) {
    console.error("创建messages表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建messages表失败",
      },
      { status: 500 }
    );
  }
}
