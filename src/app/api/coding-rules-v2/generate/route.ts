import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId, secondCategoryId, thirdCategoryId, processCategoryId, materialName, projectName = '', version = 'A' } = body;

    if (!ruleId || !secondCategoryId || !materialName) {
      return NextResponse.json({ error: 'ruleId, secondCategoryId, materialName 为必填项' }, { status: 400 });
    }

    if (!/^[A-Z]$/.test(version)) {
      return NextResponse.json({ error: '版本号必须是单个大写字母（A-Z）' }, { status: 400 });
    }

    const db = await getDb();

    const existing = await db.execute(sql`
      SELECT * FROM generated_codes_v2
      WHERE rule_id = ${ruleId}
        AND second_category_id = ${secondCategoryId}
        AND material_name = ${materialName}
    `);
    if (existing.rows && existing.rows.length > 0) {
      const e = existing.rows[0];
      return NextResponse.json({
        success: true, code: e.code, exists: true,
        breakdown: { first: e.code[0], second: e.code.substring(1,3), third: e.code.substring(3,6), process: e.code[6], sequence: e.code.substring(7,12), version: e.code[12] },
        details: { rule_name: e.rule_name, second_category_name: e.second_category_name, third_category_name: e.third_category_name, process_category_name: e.process_category_name, sequence_number: e.sequence_number }
      });
    }

    const rule = (await db.execute(sql`SELECT * FROM coding_rules_v2 WHERE rule_id = ${ruleId}`)).rows[0];
    const second = (await db.execute(sql`SELECT * FROM coding_categories_v2 WHERE category_id = ${secondCategoryId}`)).rows[0];

    let thirdCode = '000', thirdName = null, processCode = '0', processName = null;
    let thirdCatId = thirdCategoryId, processCatId = processCategoryId;
    let seqCatId = secondCategoryId;

    if (thirdCategoryId && thirdCategoryId !== '0' && thirdCategoryId !== '') {
      const t = (await db.execute(sql`SELECT * FROM coding_categories_v2 WHERE category_id = ${thirdCategoryId}`)).rows[0];
      thirdCode = String(t.code);
      thirdName = t.name;
      seqCatId = thirdCategoryId;

      if (processCategoryId && processCategoryId !== '0' && processCategoryId !== '') {
        const p = (await db.execute(sql`SELECT * FROM coding_categories_v2 WHERE category_id = ${processCategoryId}`)).rows[0];
        processCode = String(p.code);
        processName = p.name;
        seqCatId = processCategoryId;
      }
    } else if (processCategoryId && processCategoryId !== '0' && processCategoryId !== '') {
      const p = (await db.execute(sql`SELECT * FROM coding_categories_v2 WHERE category_id = ${processCategoryId}`)).rows[0];
      processCode = String(p.code);
      processName = p.name;
      seqCatId = processCategoryId;
    }

    let seqNum = 1, seqId = null;
    const seq = (await db.execute(sql`SELECT * FROM coding_sequences_v2 WHERE category_id = ${seqCatId}`)).rows[0];
    if (seq) {
      seqNum = Number(seq.sequence_number) + 1;
      seqId = seq.sequence_id;
      await db.execute(sql`
        UPDATE coding_sequences_v2
        SET sequence_number = sequence_number + 1, updated_at = CURRENT_TIMESTAMP
        WHERE sequence_id = ${seqId}
      `);
    } else {
      const newSeq = await db.execute(sql`
        INSERT INTO coding_sequences_v2 (category_id, sequence_number)
        VALUES (${seqCatId}, 1)
        RETURNING sequence_id
      `);
      seqId = newSeq.rows[0].sequence_id;
    }

    const code = `${rule.code}${second.code}${thirdCode}${processCode}${String(seqNum).padStart(5,'0')}${version}`;

    await db.execute(sql`
      INSERT INTO generated_codes_v2
        (code, material_name, rule_id, second_category_id, third_category_id, process_category_id, sequence_number, version, project_name, created_at)
      VALUES
        (${code}, ${materialName}, ${ruleId}, ${secondCategoryId}, ${thirdCatId && thirdCatId !== '0' && thirdCatId !== '' ? thirdCatId : null}, ${processCatId && processCatId !== '0' && processCatId !== '' ? processCatId : null}, ${seqNum}, ${version}, ${projectName}, CURRENT_TIMESTAMP)
    `);

    return NextResponse.json({
      success: true, code,
      breakdown: { first: rule.code, second: second.code, third: thirdCode, process: processCode, sequence: String(seqNum).padStart(5,'0'), version },
      details: { rule_name: rule.name, second_category_name: second.name, third_category_name: thirdName, process_category_name: processName, sequence_number: seqNum }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
