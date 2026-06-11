import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';

export const dynamic = 'force-dynamic';

// DELETE /api/coding-categories-v2/[id] - 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // 先检查是否有子分类
    const checkChildren = await db.execute(`
      SELECT * FROM coding_categories_v2 
      WHERE parent_id = ${parseInt(id)}
    `);

    if (checkChildren.rows && checkChildren.rows.length > 0) {
      return NextResponse.json({ error: 'Cannot delete category with children' }, { status: 400 });
    }

    const result = await db.execute(`
      DELETE FROM coding_categories_v2 
      WHERE category_id = ${parseInt(id)}
      RETURNING *
    `);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}

// GET /api/coding-categories-v2/[id] - 获取单个分类
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await db.execute(`
      SELECT * FROM coding_categories_v2 
      WHERE category_id = ${parseInt(id)}
    `);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch category' }, { status: 500 });
  }
}
