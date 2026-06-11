import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { codingCategories } from "@/storage/database/shared/schema";
import { eq, like, or, and, sql } from "drizzle-orm";

// GET /api/coding-categories - 获取分类列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');
    const level = searchParams.get('level');
    const parentId = searchParams.get('parentId');
    const keyword = searchParams.get('keyword') || '';

    const db = await getDb();
    let query = db.select().from(codingCategories);

    // 添加过滤条件
    const conditions = [];

    if (ruleId) {
      conditions.push(eq(codingCategories.rule_id, ruleId));
    }

    if (level) {
      conditions.push(eq(codingCategories.category_level, level));
    }

    if (parentId) {
      conditions.push(eq(codingCategories.parent_id, parentId));
    }

    if (keyword) {
      conditions.push(
        or(
          like(codingCategories.name, `%${keyword}%`),
          like(codingCategories.code, `%${keyword}%`),
          like(sql<string>`COALESCE(${codingCategories.description}, '')`, `%${keyword}%`)
        )
      );
    }

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const categories = await query.orderBy(codingCategories.code).execute();

    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching coding categories:', error);
    return NextResponse.json({
      success: false,
      error: '获取分类失败'
    }, { status: 500 });
  }
}

// POST /api/coding-categories - 创建分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDb();

    const {
      rule_id,
      category_level,
      code,
      name,
      description,
      parent_id,
      sequence_start,
      sequence_current,
      is_active
    } = body;

    // 验证必填字段
    if (!rule_id || !category_level || !code || !name) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 });
    }

    const newCategory = await db.insert(codingCategories).values({
      rule_id,
      category_level,
      code,
      name,
      description,
      parent_id,
      sequence_start: sequence_start || '1',
      sequence_current: sequence_current || '1',
      is_active: is_active !== undefined ? is_active : true,
    }).returning();

    return NextResponse.json({
      success: true,
      data: newCategory[0]
    });
  } catch (error) {
    console.error('Error creating coding category:', error);
    return NextResponse.json({
      success: false,
      error: '创建分类失败'
    }, { status: 500 });
  }
}

// PUT /api/coding-categories - 更新分类
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDb();

    const { id, code, name, description, parent_id, sequence_start, sequence_current, is_active } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少分类ID'
      }, { status: 400 });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (sequence_start !== undefined) updateData.sequence_start = sequence_start;
    if (sequence_current !== undefined) updateData.sequence_current = sequence_current;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updated = await db
      .update(codingCategories)
      .set(updateData)
      .where(eq(codingCategories.id, id))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json({
        success: false,
        error: '分类不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating coding category:', error);
    return NextResponse.json({
      success: false,
      error: '更新分类失败'
    }, { status: 500 });
  }
}
