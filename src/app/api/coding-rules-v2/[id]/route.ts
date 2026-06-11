import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// DELETE /api/coding-rules-v2/[id] - 删除第一阶编码规则
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: '规则ID不能为空' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // 先检查规则是否存在
    const checkResult = await db.execute(sql`
      SELECT * FROM coding_rules_v2 
      WHERE rule_id = ${parseInt(id)}
    `);

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: '规则不存在' }, { status: 404 });
    }

    // 检查是否有关联的分类数据
    const categoryCheckResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM coding_categories_v2 
      WHERE rule_id = ${parseInt(id)}
    `);

    const categoryCount = Number(categoryCheckResult.rows[0]?.count || 0);
    
    if (categoryCount > 0) {
      return NextResponse.json(
        { error: `无法删除：该规则下还有 ${categoryCount} 条分类数据，请先删除相关分类` },
        { status: 400 }
      );
    }

    // 检查是否有关联的编码记录
    const codeCheckResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM generated_codes_v2 
      WHERE rule_id = ${parseInt(id)}
    `);

    const codeCount = Number(codeCheckResult.rows[0]?.count || 0);
    
    if (codeCount > 0) {
      return NextResponse.json(
        { error: `无法删除：该规则下还有 ${codeCount} 条编码记录，请先删除相关编码` },
        { status: 400 }
      );
    }

    // 删除规则
    await db.execute(sql`
      DELETE FROM coding_rules_v2 
      WHERE rule_id = ${parseInt(id)}
    `);

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    console.error('Error deleting coding rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
