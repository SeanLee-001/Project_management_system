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
    const limitNum = parseInt(searchParams.get('limit') || '50');
    const offsetNum = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();

    const keywordPattern = keyword ? `%${keyword}%` : null;
    const ruleIdNum = ruleId ? parseInt(ruleId) : null;

    let whereParts: ReturnType<typeof sql>[] = [];
    if (keywordPattern) {
      whereParts.push(sql`(
        gc.code ILIKE ${keywordPattern} OR
        gc.material_name ILIKE ${keywordPattern} OR
        p.specification ILIKE ${keywordPattern} OR
        gc.project_name ILIKE ${keywordPattern}
      )`);
    }
    if (ruleIdNum !== null) {
      whereParts.push(sql`gc.rule_id = ${ruleIdNum}`);
    }

    const whereCondition = whereParts.length > 0
      ? sql`WHERE ${sql.join(whereParts, sql` AND `)}`
      : sql``;

    const result = await db.execute(sql`
      SELECT
        gc.*,
        cr.name as rule_name,
        c2.name as second_category_name,
        c3.name as third_category_name,
        c4.name as process_category_name,
        p.specification as product_specification,
        p.image_url as product_image_url
      FROM generated_codes_v2 gc
      LEFT JOIN coding_rules_v2 cr ON gc.rule_id = cr.rule_id
      LEFT JOIN coding_categories_v2 c2 ON gc.second_category_id = c2.category_id
      LEFT JOIN coding_categories_v2 c3 ON gc.third_category_id = c3.category_id
      LEFT JOIN coding_categories_v2 c4 ON gc.process_category_id = c4.category_id
      LEFT JOIN products p ON gc.code = p.material_code
      ${whereCondition}
      ORDER BY gc.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `);

    if ((!result.rows || result.rows.length === 0) && keyword) {
      const productKeywordWhere = sql`(
        p.material_code ILIKE ${keywordPattern} OR
        p.project_name ILIKE ${keywordPattern} OR
        p.specification ILIKE ${keywordPattern}
      )`;

      const productsResult = await db.execute(sql`
        SELECT
          p.material_code as code,
          p.project_name as material_name,
          p.specification as product_specification,
          p.project_name,
          p.description as second_category_name,
          'A' as version,
          null as third_category_name,
          null as process_category_name,
          null as rule_name,
          p.image_url as product_image_url,
          p.id as record_id,
          'products' as source_table
        FROM products p
        WHERE ${productKeywordWhere}
        ORDER BY p.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `);

      return NextResponse.json({
        data: productsResult.rows || [],
        total: productsResult.rows?.length || 0,
        limit: limitNum,
        offset: offsetNum
      });
    }

    if (!result.rows || result.rows.length === 0) {
      const productsWhereParts: ReturnType<typeof sql>[] = [];
      if (keywordPattern) {
        productsWhereParts.push(sql`(
          p.material_code ILIKE ${keywordPattern} OR
          p.project_name ILIKE ${keywordPattern} OR
          p.specification ILIKE ${keywordPattern}
        )`);
      }
      const productsWhere = productsWhereParts.length > 0
        ? sql`WHERE ${sql.join(productsWhereParts, sql` AND `)}`
        : sql``;

      const productsResult = await db.execute(sql`
        SELECT
          p.material_code as code,
          p.project_name as material_name,
          p.specification as product_specification,
          p.project_name,
          p.description as second_category_name,
          'A' as version,
          null as third_category_name,
          null as process_category_name,
          null as rule_name,
          p.image_url as product_image_url,
          p.id as record_id,
          'products' as source_table
        FROM products p
        ${productsWhere}
        ORDER BY p.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `);

      return NextResponse.json({
        data: productsResult.rows || [],
        total: productsResult.rows?.length || 0,
        limit: limitNum,
        offset: offsetNum
      });
    }

    let total = 0;
    if (whereParts.length > 0) {
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM generated_codes_v2 gc
        LEFT JOIN products p ON gc.code = p.material_code
        ${whereCondition}
      `);
      total = countResult.rows[0]?.total || 0;
    } else {
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM generated_codes_v2 gc
      `);
      total = countResult.rows[0]?.total || 0;
    }

    return NextResponse.json({
      data: result.rows || [],
      total: total,
      limit: limitNum,
      offset: offsetNum
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
