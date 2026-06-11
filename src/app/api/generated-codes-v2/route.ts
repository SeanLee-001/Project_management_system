import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/generated-codes-v2 - 获取已生成的编码记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const ruleId = searchParams.get('ruleId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();

    let whereClause = '';

    if (keyword) {
      whereClause = `WHERE (gc.code LIKE '%${keyword}%' OR gc.material_name LIKE '%${keyword}%')`;
    }

    if (ruleId) {
      if (whereClause) {
        whereClause += ` AND gc.rule_id = ${parseInt(ruleId)}`;
      } else {
        whereClause = `WHERE gc.rule_id = ${parseInt(ruleId)}`;
      }
    }

    const result = await db.execute(sql`
      SELECT 
        gc.*,
        cr.name as rule_name,
        c2.name as second_category_name,
        c3.name as third_category_name,
        c4.name as process_category_name,
        p.specification as product_specification,
        p.imageUrl as product_image_url
      FROM generated_codes_v2 gc
      LEFT JOIN coding_rules_v2 cr ON gc.rule_id = cr.rule_id
      LEFT JOIN coding_categories_v2 c2 ON gc.second_category_id = c2.category_id
      LEFT JOIN coding_categories_v2 c3 ON gc.third_category_id = c3.category_id
      LEFT JOIN coding_categories_v2 c4 ON gc.process_category_id = c4.category_id
      LEFT JOIN products p ON gc.code = p.materialCode
      ${sql.raw(whereClause)}
      ORDER BY gc.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // 获取总数
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM generated_codes_v2 gc
      ${sql.raw(whereClause)}
    `);

    const total = countResult.rows[0]?.total || 0;

    return NextResponse.json({
      data: result.rows || [],
      total: total,
      limit: limit,
      offset: offset
    });
  } catch (error: any) {
    console.error('Error fetching generated codes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/generated-codes-v2 - 保存编码记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      ruleId,
      secondCategoryId,
      thirdCategoryId,
      processCategoryId,
      materialName,
      version,
      sequenceNumber,
      userId
    } = body;

    if (!code || !ruleId || !materialName) {
      return NextResponse.json(
        { error: 'code, ruleId, materialName为必填项' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.execute(sql`
      INSERT INTO generated_codes_v2 (
        code, rule_id, second_category_id, third_category_id,
        process_category_id, material_name, version, sequence_number, user_id
      )
      VALUES (
        ${code},
        ${parseInt(ruleId)},
        ${secondCategoryId ? parseInt(secondCategoryId) : null},
        ${thirdCategoryId ? parseInt(thirdCategoryId) : null},
        ${processCategoryId ? parseInt(processCategoryId) : null},
        ${materialName},
        ${version || 'A'},
        ${sequenceNumber || null},
        ${userId || null}
      )
      RETURNING *
    `);

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error saving generated code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/generated-codes-v2 - 更新编码记录
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, materialName } = body;

    if (!recordId || !materialName) {
      return NextResponse.json(
        { error: 'recordId, materialName为必填项' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.execute(sql`
      UPDATE generated_codes_v2
      SET material_name = ${materialName}
      WHERE record_id = ${parseInt(recordId)}
      RETURNING *
    `);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating generated code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
