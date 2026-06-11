import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';

export const dynamic = 'force-dynamic';

// GET /api/coding-categories-v2 - 获取分类列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');
    const level = searchParams.get('level');
    const parentId = searchParams.get('parentId') || searchParams.get('parent');

    const db = await getDb();
    
    // 构建动态查询
    let whereConditions: string[] = [];
    
    if (ruleId) {
      whereConditions.push(`c.rule_id = '${ruleId}'`);
    }

    if (level && ['second', 'third', 'process'].includes(level)) {
      whereConditions.push(`c.category_level = '${level}'`);
    }

    if (parentId) {
      whereConditions.push(`c.parent_id = '${parentId}'`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    let query = '';
    
    if (parentId) {
      // 获取子分类时，同时返回父级信息
      query = `
        SELECT 
          c.category_id,
          c.rule_id,
          c.category_level,
          c.code,
          c.name,
          c.description,
          c.parent_id,
          c.is_active,
          c.created_at,
          c.updated_at,
          pc.name as parent_name,
          pc.code as parent_code
        FROM coding_categories_v2 c
        LEFT JOIN coding_categories_v2 pc ON c.parent_id = pc.category_id
        ${whereClause}
        ORDER BY c.category_level, c.code::integer
      `;
    } else {
      query = `
        SELECT 
          c.category_id,
          c.rule_id,
          c.category_level,
          c.code,
          c.name,
          c.description,
          c.parent_id,
          c.is_active,
          c.created_at,
          c.updated_at
        FROM coding_categories_v2 c
        ${whereClause}
        ORDER BY c.category_level, c.code::integer
      `;
    }

    const result = await db.execute(query);
    const categories = result.rows || [];

    // 去重：按 code+name 去重，避免相同编码的分类重复显示
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

// POST /api/coding-categories-v2 - 创建分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule_id, category_level, code, name, description, parent_id } = body;

    if (!rule_id || !category_level || !code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    // 检查代码是否已存在
    let checkQuery = `
      SELECT * FROM coding_categories_v2 
      WHERE rule_id = '${rule_id}' 
        AND category_level = '${category_level}' 
        AND code = '${code}'
    `;
    
    if (parent_id) {
      checkQuery += ` AND parent_id = '${parent_id}'`;
    }
    
    const checkResult = await db.execute(checkQuery);

    if (checkResult.rows && checkResult.rows.length > 0) {
      return NextResponse.json({ error: 'Category code already exists' }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id, created_at, updated_at)
      VALUES ('${rule_id}', '${category_level}', '${code}', '${name}', ${description ? `'${description}'` : 'NULL'}, ${parent_id ? `'${parent_id}'` : 'NULL'}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await db.execute(insertQuery);
    
    return NextResponse.json({
      success: true,
      category: result.rows && result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}

// PUT /api/coding-categories-v2 - 更新分类
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_id, code, name, description } = body;

    if (!category_id || !code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    const query = `
      UPDATE coding_categories_v2 
      SET code = '${code}', 
          name = '${name}', 
          description = ${description ? `'${description}'` : 'NULL'},
          updated_at = CURRENT_TIMESTAMP
      WHERE category_id = '${category_id}'
      RETURNING *
    `;
    
    const result = await db.execute(query);
    
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

// DELETE /api/coding-categories-v2/:id - 删除分类
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json({ error: 'Missing category_id' }, { status: 400 });
    }

    const db = await getDb();

    const query = `
      DELETE FROM coding_categories_v2 
      WHERE category_id = '${categoryId}'
      RETURNING *
    `;
    
    const result = await db.execute(query);
    
    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}
