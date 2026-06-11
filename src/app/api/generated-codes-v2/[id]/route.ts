import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// DELETE /api/generated-codes-v2/[id] - 删除编码记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: '记录ID不能为空' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // 先检查记录是否存在
    const checkResult = await db.execute(sql`
      SELECT * FROM generated_codes_v2 
      WHERE record_id = ${parseInt(id)}
    `);

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 删除记录
    await db.execute(sql`
      DELETE FROM generated_codes_v2 
      WHERE record_id = ${parseInt(id)}
    `);

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    console.error('Error deleting generated code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/generated-codes-v2/[id] - 获取单个编码记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: '记录ID不能为空' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    const result = await db.execute(sql`
      SELECT 
        gc.*,
        cr.name as rule_name,
        c2.name as second_category_name,
        c3.name as third_category_name,
        c4.name as process_category_name
      FROM generated_codes_v2 gc
      LEFT JOIN coding_rules_v2 cr ON gc.rule_id = cr.rule_id
      LEFT JOIN coding_categories_v2 c2 ON gc.second_category_id = c2.category_id
      LEFT JOIN coding_categories_v2 c3 ON gc.third_category_id = c3.category_id
      LEFT JOIN coding_categories_v2 c4 ON gc.process_category_id = c4.category_id
      WHERE gc.record_id = ${parseInt(id)}
    `);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching generated code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
