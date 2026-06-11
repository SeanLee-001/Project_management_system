import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// POST /api/migrate/add-project-name-to-codes - 为编码记录表添加项目名称字段
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'generated_codes_v2' 
      AND column_name = 'project_name'
    `);

    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: '字段 project_name 已存在，无需重复添加'
      });
    }

    // 添加 project_name 字段
    await db.execute(sql`
      ALTER TABLE generated_codes_v2
      ADD COLUMN project_name VARCHAR(200)
    `);

    return NextResponse.json({
      success: true,
      message: '成功为 generated_codes_v2 表添加 project_name 字段'
    });
  } catch (error: any) {
    console.error('Error adding project_name field:', error);
    return NextResponse.json(
      { error: error.message || '添加字段失败' },
      { status: 500 }
    );
  }
}
