import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/create-coding-tables - 创建产品编码管理表
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 1. 创建 coding_rules 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS coding_rules (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        category_name VARCHAR(100) NOT NULL,
        category_code VARCHAR(10) NOT NULL UNIQUE,
        first_digit VARCHAR(1) NOT NULL,
        second_digit_range VARCHAR(50),
        third_fourth_digit_range VARCHAR(50),
        fifth_ninth_digit_range VARCHAR(50),
        tenth_digit_range VARCHAR(50),
        eleventh_digit_range VARCHAR(50),
        total_length VARCHAR(5) NOT NULL DEFAULT '11',
        description TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✓ Created coding_rules table");

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS coding_rules_category_name_idx ON coding_rules(category_name)
    `);
    console.log("✓ Created coding_rules_category_name_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS coding_rules_category_code_idx ON coding_rules(category_code)
    `);
    console.log("✓ Created coding_rules_category_code_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS coding_rules_is_active_idx ON coding_rules(is_active)
    `);
    console.log("✓ Created coding_rules_is_active_idx index");

    // 2. 创建 coding_categories 表（不立即添加外键）
    await db.execute(`
      CREATE TABLE IF NOT EXISTS coding_categories (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id VARCHAR(36) NOT NULL,
        category_level VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        parent_id VARCHAR(36),
        sequence_start VARCHAR(10) NOT NULL DEFAULT '00001',
        sequence_current VARCHAR(10) NOT NULL DEFAULT '00001',
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✓ Created coding_categories table");

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS coding_categories_rule_id_idx ON coding_categories(rule_id)
    `);
    console.log("✓ Created coding_categories_rule_id_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS coding_categories_category_level_idx ON coding_categories(category_level)
    `);
    console.log("✓ Created coding_categories_category_level_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS coding_categories_parent_id_idx ON coding_categories(parent_id)
    `);
    console.log("✓ Created coding_categories_parent_id_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS coding_categories_is_active_idx ON coding_categories(is_active)
    `);
    console.log("✓ Created coding_categories_is_active_idx index");

    // 3. 创建 generated_codes 表（不立即添加外键）
    await db.execute(`
      CREATE TABLE IF NOT EXISTS generated_codes (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) NOT NULL UNIQUE,
        material_name VARCHAR(255) NOT NULL,
        rule_id VARCHAR(36) NOT NULL,
        major_category_id VARCHAR(36),
        sub_category_id VARCHAR(36),
        material_category_id VARCHAR(36),
        processing_step VARCHAR(50),
        version VARCHAR(5),
        sequence_number VARCHAR(10),
        created_by VARCHAR(36),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✓ Created generated_codes table");

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS generated_codes_code_idx ON generated_codes(code)
    `);
    console.log("✓ Created generated_codes_code_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS generated_codes_material_name_idx ON generated_codes(material_name)
    `);
    console.log("✓ Created generated_codes_material_name_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS generated_codes_rule_id_idx ON generated_codes(rule_id)
    `);
    console.log("✓ Created generated_codes_rule_id_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS generated_codes_status_idx ON generated_codes(status)
    `);
    console.log("✓ Created generated_codes_status_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS generated_codes_created_at_idx ON generated_codes(created_at)
    `);
    console.log("✓ Created generated_codes_created_at_idx index");

    return NextResponse.json(
      {
        success: true,
        message: "Product coding tables migration completed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during migration:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
