import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/generated-codes-v2/[id]/change-version - 变更版本
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recordId = parseInt(id);

    if (isNaN(recordId)) {
      return NextResponse.json(
        { error: '无效的记录ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newVersion, reason } = body;

    // 验证新版本号格式（A-Z）
    if (!newVersion || !/^[A-Z]$/.test(newVersion)) {
      return NextResponse.json(
        { error: '版本号必须是单个大写字母（A-Z）' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 查询原记录
    const originalRecord = await db.execute(sql`
      SELECT * FROM generated_codes_v2
      WHERE record_id = ${recordId}
    `);

    if (originalRecord.rows.length === 0) {
      return NextResponse.json(
        { error: '编码记录不存在' },
        { status: 404 }
      );
    }

    const record = originalRecord.rows[0] as any;

    // 检查新版本号是否与原版本号相同
    if (record.version === newVersion) {
      return NextResponse.json(
        { error: '新版本号不能与原版本号相同' },
        { status: 400 }
      );
    }

    // 计算新编码（使用相同的流水号，只更改版本号）
    const originalCode: string = record.code || '';
    const sequencePart = originalCode.substring(0, 12); // 前12位（流水号部分）
    const newCode = sequencePart + newVersion; // 新编码：前12位 + 新版本号

    // 检查新编码是否已存在
    const existingCode = await db.execute(sql`
      SELECT record_id FROM generated_codes_v2
      WHERE code = ${newCode}
    `);

    if (existingCode.rows.length > 0) {
      return NextResponse.json(
        { error: `编码 ${newCode} 已存在` },
        { status: 400 }
      );
    }

    // 插入新版本记录（旧编码保留）
    await db.execute(sql`
      INSERT INTO generated_codes_v2 (
        code,
        rule_id,
        second_category_id,
        third_category_id,
        process_category_id,
        material_name,
        sequence_number,
        version,
        project_name,
        created_by,
        created_at
      )
      VALUES (
        ${newCode},
        ${record.rule_id},
        ${record.second_category_id},
        ${record.third_category_id},
        ${record.process_category_id},
        ${record.material_name},
        ${record.sequence_number},
        ${newVersion},
        ${record.project_name || null},
        ${record.created_by},
        CURRENT_TIMESTAMP
      )
    `);

    // 获取新插入的记录ID
    const newRecordResult = await db.execute(sql`
      SELECT record_id FROM generated_codes_v2
      WHERE code = ${newCode}
      ORDER BY record_id DESC
      LIMIT 1
    `);

    const newRecordId = newRecordResult.rows[0]?.record_id;

    return NextResponse.json({
      success: true,
      message: '版本变更成功',
      newCode: newCode,
      newVersion: newVersion,
      newRecordId: newRecordId,
      oldCode: originalCode,
      oldVersion: record.version
    });
  } catch (error: any) {
    console.error('Error changing version:', error);
    return NextResponse.json(
      { error: error.message || '版本变更失败' },
      { status: 500 }
    );
  }
}
