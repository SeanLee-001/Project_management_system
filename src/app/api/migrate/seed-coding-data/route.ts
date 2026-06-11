import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { codingRules, codingCategories } from "@/storage/database/shared/schema";
import { sql } from "drizzle-orm";

// POST /api/migrate/seed-coding-data - 初始化产品编码数据
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 1. 插入编码规则
    const rules = [
      {
        category_name: "成品",
        category_code: "1",
        first_digit: "1",
        second_digit_range: "01-99",
        third_fourth_digit_range: "01-99",
        fifth_ninth_digit_range: "00001-99999",
        tenth_digit_range: null,
        eleventh_digit_range: "A-Z",
        total_length: "11",
        description: "成品类编码规则：第1位=1，第2-3位=大类码，第4-5位=子类码，第6-10位=子类流水号，第11位=版本号",
        is_active: true,
      },
      {
        category_name: "半成品",
        category_code: "2",
        first_digit: "2",
        second_digit_range: "1-9",
        third_fourth_digit_range: "01-99",
        fifth_ninth_digit_range: "00001-99999",
        tenth_digit_range: "1-9",
        eleventh_digit_range: "A-Z",
        total_length: "11",
        description: "半成品类编码规则：第1位=2，第2位=材质分类，第3-4位=子类码，第5-9位=子类流水号，第10位=加工工序，第11位=版本号",
        is_active: true,
      },
      {
        category_name: "原材料",
        category_code: "3",
        first_digit: "3",
        second_digit_range: "1-9",
        third_fourth_digit_range: "01-99",
        fifth_ninth_digit_range: "00001-99999",
        tenth_digit_range: null,
        eleventh_digit_range: "A-Z",
        total_length: "11",
        description: "原材料类编码规则：第1位=3，第2位=材质分类，第3-4位=子类码，第5-10位=子类流水号，第11位=版本号",
        is_active: true,
      },
      {
        category_name: "工具辅料和办公用品",
        category_code: "7",
        first_digit: "7",
        second_digit_range: "01-99",
        third_fourth_digit_range: "0000001-9999999",
        fifth_ninth_digit_range: null,
        tenth_digit_range: null,
        eleventh_digit_range: "A-Z",
        total_length: "11",
        description: "工具辅料和办公用品类编码规则：第1位=7，第2-3位=大类码，第4-10位=子类码，第11位=版本号",
        is_active: true,
      },
    ];

    for (const rule of rules) {
      try {
        await db.insert(codingRules).values(rule).onConflictDoNothing();
      } catch (e) {
        // 忽略冲突错误
      }
    }
    console.log("✓ Inserted coding rules");

    // 2. 插入成品分类数据
    const majorCategories = [
      {
        code: "01",
        name: "有源模块",
        description: "成品-有源模块",
        category_level: "major",
        parent_id: null,
        sequence_start: "1",
        sequence_current: "1",
        is_active: true,
      },
      {
        code: "02",
        name: "无源模块",
        description: "成品-无源模块",
        category_level: "major",
        parent_id: null,
        sequence_start: "1",
        sequence_current: "1",
        is_active: true,
      },
      {
        code: "11",
        name: "数字视频",
        description: "成品-数字视频",
        category_level: "major",
        parent_id: null,
        sequence_start: "1",
        sequence_current: "1",
        is_active: true,
      },
    ];

    for (const cat of majorCategories) {
      try {
        const finishedRule = await db.select().from(codingRules).where(sql`category_code = '1'`).limit(1);
        if (finishedRule && finishedRule.length > 0) {
          await db.insert(codingCategories).values({
            ...cat,
            rule_id: finishedRule[0].id,
          }).onConflictDoNothing();
        }
      } catch (e) {
        // 忽略冲突错误
      }
    }
    console.log("✓ Inserted major categories");

    // 3. 插入子类数据
    const subCategories = [
      {
        code: "01",
        name: "接收模块",
        description: "接收模块",
        category_level: "sub",
        sequence_start: "1",
        sequence_current: "1",
        is_active: true,
      },
      {
        code: "02",
        name: "发射模块",
        description: "发射模块",
        category_level: "sub",
        sequence_start: "1",
        sequence_current: "1",
        is_active: true,
      },
    ];

    for (const cat of subCategories) {
      try {
        const majorCat = await db.select().from(codingCategories).where(sql`code = '01' AND category_level = 'major'`).limit(1);
        if (majorCat && majorCat.length > 0) {
          await db.insert(codingCategories).values({
            ...cat,
            rule_id: majorCat[0].rule_id,
            parent_id: majorCat[0].id,
          }).onConflictDoNothing();
        }
      } catch (e) {
        // 忽略冲突错误
      }
    }
    console.log("✓ Inserted sub categories");

    // 4. 插入材质数据
    const materialCategories = [
      {
        code: "01",
        name: "铝",
        description: "铝",
        category_level: "material",
        parent_id: null,
        sequence_start: "1",
        sequence_current: "1",
        is_active: true,
      },
      {
        code: "02",
        name: "铁",
        description: "铁",
        category_level: "material",
        parent_id: null,
        sequence_start: "1",
        sequence_current: "1",
        is_active: true,
      },
    ];

    for (const cat of materialCategories) {
      try {
        const finishedRule = await db.select().from(codingRules).where(sql`category_code = '1'`).limit(1);
        if (finishedRule && finishedRule.length > 0) {
          await db.insert(codingCategories).values({
            ...cat,
            rule_id: finishedRule[0].id,
          }).onConflictDoNothing();
        }
      } catch (e) {
        // 忽略冲突错误
      }
    }
    console.log("✓ Inserted material categories");

    return NextResponse.json(
      {
        success: true,
        message: "Product coding data seeding completed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during seeding:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Seeding failed",
      },
      { status: 500 }
    );
  }
}
