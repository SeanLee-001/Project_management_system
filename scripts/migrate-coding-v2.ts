import { getDb } from "coze-coding-dev-sdk";
import { sql } from "drizzle-orm";

async function migrate() {
  const db = await getDb();

  console.log("开始创建产品编码规则 V2 表 (coding_rules_v2)...");

  // 创建 coding_rules_v2 表 - 产品大类表
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS coding_rules_v2 (
      rule_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(1) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ
    )
  `);

  console.log("创建 coding_rules_v2 索引...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS coding_rules_v2_code_idx ON coding_rules_v2(code)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS coding_rules_v2_is_active_idx ON coding_rules_v2(is_active)
  `);

  console.log("开始创建产品编码分类 V2 表 (coding_categories_v2)...");

  // 创建 coding_categories_v2 表 - 编码分类表
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS coding_categories_v2 (
      category_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_id VARCHAR(36) NOT NULL REFERENCES coding_rules_v2(rule_id) ON DELETE CASCADE,
      category_level VARCHAR(20) NOT NULL,
      code VARCHAR(10) NOT NULL,
      name VARCHAR(100) NOT NULL,
      parent_id VARCHAR(36),
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ
    )
  `);

  console.log("创建 coding_categories_v2 索引...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS coding_categories_v2_rule_id_idx ON coding_categories_v2(rule_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS coding_categories_v2_category_level_idx ON coding_categories_v2(category_level)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS coding_categories_v2_parent_id_idx ON coding_categories_v2(parent_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS coding_categories_v2_is_active_idx ON coding_categories_v2(is_active)
  `);

  console.log("开始创建产品编码记录 V2 表 (generated_codes_v2)...");

  // 创建 generated_codes_v2 表 - 生成的编码记录表
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS generated_codes_v2 (
      record_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(13) NOT NULL UNIQUE,
      material_name VARCHAR(255) NOT NULL,
      rule_id VARCHAR(36) NOT NULL REFERENCES coding_rules_v2(rule_id) ON DELETE CASCADE,
      second_category_id VARCHAR(36),
      third_category_id VARCHAR(36),
      process_category_id VARCHAR(36),
      sequence_number INTEGER NOT NULL,
      version VARCHAR(1) NOT NULL,
      project_name VARCHAR(255),
      created_by VARCHAR(36),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMPTZ
    )
  `);

  console.log("创建 generated_codes_v2 索引...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS generated_codes_v2_code_idx ON generated_codes_v2(code)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS generated_codes_v2_material_name_idx ON generated_codes_v2(material_name)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS generated_codes_v2_rule_id_idx ON generated_codes_v2(rule_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS generated_codes_v2_created_at_idx ON generated_codes_v2(created_at)
  `);

  // 初始化一个默认的产品大类 (可选)
  console.log("初始化默认产品大类数据...");
  try {
    await db.execute(sql`
      INSERT INTO coding_rules_v2 (code, name, description)
      VALUES ('1', '成品', '成品类产品')
      ON CONFLICT (code) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO coding_rules_v2 (code, name, description)
      VALUES ('2', '半成品', '半成品类产品')
      ON CONFLICT (code) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO coding_rules_v2 (code, name, description)
      VALUES ('3', '原材料', '原材料类产品')
      ON CONFLICT (code) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO coding_rules_v2 (code, name, description)
      VALUES ('4', '工具辅料', '工具辅料类产品')
      ON CONFLICT (code) DO NOTHING
    `);
  } catch (error) {
    console.log("默认数据可能已存在，跳过插入");
  }

  console.log("✅ 产品编码规则 V2 表创建完成!");
  console.log("✅ 创建成功：coding_rules_v2, coding_categories_v2, generated_codes_v2");
}

// 执行迁移
migrate()
  .then(() => {
    console.log("迁移执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("迁移失败:", error);
    process.exit(1);
  });
