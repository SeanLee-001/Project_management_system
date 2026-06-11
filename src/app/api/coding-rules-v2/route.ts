import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/coding-rules-v2 - 获取所有第一阶编码规则
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT rule_id, code, name, description, is_active, created_at, updated_at
      FROM coding_rules_v2
      ORDER BY code::integer
    `);

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error fetching coding rules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/coding-rules-v2 - 创建新的第一阶编码规则
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'code和name为必填项' }, { status: 400 });
    }

    if (code.length !== 1 || !/^\d$/.test(code)) {
      return NextResponse.json({ error: 'code必须为1位数字' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.execute(sql`
      INSERT INTO coding_rules_v2 (code, name, description)
      VALUES (${code}, ${name}, ${description})
      RETURNING *
    `);

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating coding rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/coding-rules-v2 - 更新第一阶编码规则
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId, code, name, description } = body;

    if (!ruleId || !code || !name) {
      return NextResponse.json({ error: 'ruleId, code和name为必填项' }, { status: 400 });
    }

    if (code.length !== 1 || !/^\d$/.test(code)) {
      return NextResponse.json({ error: 'code必须为1位数字' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.execute(sql`
      UPDATE coding_rules_v2
      SET code = ${code}, name = ${name}, description = ${description}, updated_at = CURRENT_TIMESTAMP
      WHERE rule_id = ${parseInt(ruleId)}
      RETURNING *
    `);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: '规则不存在' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating coding rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
