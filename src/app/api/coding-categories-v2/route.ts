import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');
    const level = searchParams.get('level');
    const parentId = searchParams.get('parentId') || searchParams.get('parent');

    const db = await getDb();

    let result;
    if (parentId) {
      result = await db.execute(sql`
        SELECT
          c.category_id, c.rule_id, c.category_level, c.code, c.name,
          c.description, c.parent_id, c.is_active, c.created_at, c.updated_at,
          pc.name as parent_name, pc.code as parent_code
        FROM coding_categories_v2 c
        LEFT JOIN coding_categories_v2 pc ON c.parent_id = pc.category_id
        WHERE 1=1
          ${ruleId ? sql`AND c.rule_id = ${ruleId}` : sql``}
          ${level && ['second', 'third', 'process'].includes(level) ? sql`AND c.category_level = ${level}` : sql``}
          AND c.parent_id = ${parentId}
        ORDER BY c.category_level, c.code::integer
      `);
    } else {
      result = await db.execute(sql`
        SELECT
          c.category_id, c.rule_id, c.category_level, c.code, c.name,
          c.description, c.parent_id, c.is_active, c.created_at, c.updated_at
        FROM coding_categories_v2 c
        WHERE 1=1
          ${ruleId ? sql`AND c.rule_id = ${ruleId}` : sql``}
          ${level && ['second', 'third', 'process'].includes(level) ? sql`AND c.category_level = ${level}` : sql``}
        ORDER BY c.category_level, c.code::integer
      `);
    }

    const categories = result.rows || [];

    const uniqueMap = new Map();
    for (const cat of categories) {
      const key = `${cat.code}-${cat.name}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, cat);
      }
    }
    const uniqueCategories = Array.from(uniqueMap.values());

    return NextResponse.json(uniqueCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule_id, category_level, code, name, description, parent_id } = body;

    if (!rule_id || !category_level || !code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    const checkResult = await db.execute(sql`
      SELECT * FROM coding_categories_v2
      WHERE rule_id = ${rule_id}
        AND category_level = ${category_level}
        AND code = ${code}
        ${parent_id ? sql`AND parent_id = ${parent_id}` : sql``}
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      return NextResponse.json({ error: 'Category code already exists' }, { status: 400 });
    }

    const result = await db.execute(sql`
      INSERT INTO coding_categories_v2
        (rule_id, category_level, code, name, description, parent_id, created_at, updated_at)
      VALUES
        (${rule_id}, ${category_level}, ${code}, ${name}, ${description || null}, ${parent_id || null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `);

    return NextResponse.json({
      success: true,
      category: result.rows && result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_id, code, name, description } = body;

    if (!category_id || !code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.execute(sql`
      UPDATE coding_categories_v2
      SET code = ${code},
          name = ${name},
          description = ${description || null},
          updated_at = CURRENT_TIMESTAMP
      WHERE category_id = ${category_id}
      RETURNING *
    `);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      category: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json({ error: 'Missing category_id' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.execute(sql`
      DELETE FROM coding_categories_v2
      WHERE category_id = ${categoryId}
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
