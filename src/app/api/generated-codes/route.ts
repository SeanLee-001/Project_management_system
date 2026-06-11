import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { generatedCodes, codingCategories } from "@/storage/database/shared/schema";
import { eq, like, or, and, sql } from "drizzle-orm";

// GET /api/generated-codes - 获取编码记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');
    const ruleId = searchParams.get('ruleId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const db = await getDb();

    let countQuery = db
      .select({
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(generatedCodes);

    let dataQuery = db.select().from(generatedCodes);

    const conditions = [];

    if (keyword) {
      conditions.push(
        or(
          like(generatedCodes.code, `%${keyword}%`),
          like(generatedCodes.material_name, `%${keyword}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(generatedCodes.status, status));
    }

    if (ruleId) {
      conditions.push(eq(generatedCodes.rule_id, ruleId));
    }

    if (conditions.length > 0) {
      // @ts-ignore
      countQuery = countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions));
      // @ts-ignore
      dataQuery = dataQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // 获取总数
    const countResult = await countQuery;
    const totalCount = countResult[0]?.count || 0;

    // 获取分页数据
    const codes = await dataQuery
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(sql`created_at DESC`)
      .execute();

    return NextResponse.json({
      success: true,
      data: codes,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching generated codes:', error);
    return NextResponse.json({
      success: false,
      error: '获取编码记录失败'
    }, { status: 500 });
  }
}

// POST /api/generated-codes - 保存编码记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDb();

    const {
      code,
      material_name,
      rule_id,
      major_category_id,
      sub_category_id,
      material_category_id,
      processing_step,
      version,
      sequence_number,
      created_by,
      remarks
    } = body;

    if (!code || !material_name || !rule_id) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }

    // 检查编码是否已存在
    const existingCodes = await db
      .select()
      .from(generatedCodes)
      .where(eq(generatedCodes.code, code))
      .limit(1);

    if (existingCodes && existingCodes.length > 0) {
      return NextResponse.json({
        success: false,
        error: '编码已存在，请重新生成'
      }, { status: 400 });
    }

    // 保存编码记录
    const newCode = await db
      .insert(generatedCodes)
      .values({
        code,
        material_name,
        rule_id,
        major_category_id,
        sub_category_id,
        material_category_id,
        processing_step,
        version,
        sequence_number,
        created_by,
        remarks,
        status: 'active'
      })
      .returning();

    // 更新分类的流水号（如果需要）
    if (sequence_number && sub_category_id) {
      const nextSequence = (parseInt(sequence_number) + 1).toString().padStart(5, "0");
      await db
        .update(codingCategories)
        .set({
          sequence_current: nextSequence,
          updated_at: new Date()
        })
        .where(eq(codingCategories.id, sub_category_id));
    }

    return NextResponse.json({
      success: true,
      data: newCode[0]
    });
  } catch (error) {
    console.error('Error saving generated code:', error);
    return NextResponse.json({
      success: false,
      error: '保存编码记录失败'
    }, { status: 500 });
  }
}
