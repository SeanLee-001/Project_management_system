import { NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const db = await getDb();

    // 删除旧表（如果存在）
    try {
      await db.execute(`DROP TABLE IF EXISTS generated_codes_v2 CASCADE;`);
      await db.execute(`DROP TABLE IF EXISTS coding_sequences_v2 CASCADE;`);
      await db.execute(`DROP TABLE IF EXISTS coding_categories_v2 CASCADE;`);
      await db.execute(`DROP TABLE IF EXISTS coding_rules_v2 CASCADE;`);
    } catch (e) {
      console.log('Error dropping tables (might not exist):', e);
    }

    // 创建编码规则表（第一阶编码：第1位）
    await db.execute(`
      CREATE TABLE coding_rules_v2 (
        rule_id SERIAL PRIMARY KEY,
        code VARCHAR(1) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建编码分类表（第二阶、第三阶、工艺编码）
    await db.execute(`
      CREATE TABLE coding_categories_v2 (
        category_id SERIAL PRIMARY KEY,
        rule_id INTEGER REFERENCES coding_rules_v2(rule_id),
        category_level VARCHAR(10) NOT NULL,
        code VARCHAR(3) NOT NULL,
        name VARCHAR(100) NOT NULL,
        parent_id INTEGER REFERENCES coding_categories_v2(category_id),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rule_id, category_level, code)
      );
    `);

    // 创建编码流水号表（每个第三阶分类的流水号）
    await db.execute(`
      CREATE TABLE coding_sequences_v2 (
        sequence_id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES coding_categories_v2(category_id),
        sequence_number INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id)
      );
    `);

    // 创建生成的编码记录表
    await db.execute(`
      CREATE TABLE generated_codes_v2 (
        record_id SERIAL PRIMARY KEY,
        code VARCHAR(13) NOT NULL UNIQUE,
        rule_id INTEGER REFERENCES coding_rules_v2(rule_id),
        second_category_id INTEGER REFERENCES coding_categories_v2(category_id),
        third_category_id INTEGER REFERENCES coding_categories_v2(category_id),
        process_category_id INTEGER REFERENCES coding_categories_v2(category_id),
        material_name VARCHAR(200) NOT NULL,
        sequence_number INTEGER NOT NULL,
        version VARCHAR(1) NOT NULL,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 插入第一阶编码数据（第1位）
    await db.execute(`
      INSERT INTO coding_rules_v2 (code, name, description) VALUES
        ('1', '成品', '完成的产品'),
        ('2', '半成品', '中间过程产品'),
        ('3', '原材料', '生产用的原材料');
    `);

    // 插入第二阶编码数据（第2-3位）
    // 成品类别的第二阶编码
    const ruleId1 = 1;
    await db.execute(`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description) VALUES
        (${ruleId1}, 'second', '10', '机械', '机械设备'),
        (${ruleId1}, 'second', '11', '电气', '电气设备'),
        (${ruleId1}, 'second', '12', '辅料', '辅助材料'),
        (${ruleId1}, 'second', '13', '包材', '包装材料'),
        (${ruleId1}, 'second', '14', '生产耗材', '生产消耗用品'),
        (${ruleId1}, 'second', '15', '办公用品', '办公用品'),
        (${ruleId1}, 'second', '16', '生产工具', '生产工具'),
        (${ruleId1}, 'second', '17', '生产工具/设备', '生产工具/设备'),
        (${ruleId1}, 'second', '18', '办公设备', '办公设备'),
        (${ruleId1}, 'second', '19', '其它', '其它');
    `);

    // 插入第三阶编码数据（第4-6位）
    // 机械类第三阶编码
    await db.execute(`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId1}, 'third', '101', '机加件', '机加工零件', 1),
        (${ruleId1}, 'third', '102', '钣金件', '钣金加工零件', 1),
        (${ruleId1}, 'third', '103', '标准件', '标准紧固件', 1);
    `);

    // 电气类第三阶编码
    await db.execute(`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId1}, 'third', '201', 'PLC', '可编程逻辑控制器', 2),
        (${ruleId1}, 'third', '202', '电脑', '工控电脑', 2),
        (${ruleId1}, 'third', '203', '视觉', '视觉检测设备', 2),
        (${ruleId1}, 'third', '204', '板卡', '控制板卡', 2),
        (${ruleId1}, 'third', '205', '传感器', '各类传感器', 2),
        (${ruleId1}, 'third', '206', '阀岛', '气动阀岛', 2),
        (${ruleId1}, 'third', '207', '开关/按钮', '开关和按钮', 2),
        (${ruleId1}, 'third', '208', '驱动类', '驱动器', 2),
        (${ruleId1}, 'third', '209', '控制类', '控制器', 2),
        (${ruleId1}, 'third', '210', '其它', '其它电气设备', 2);
    `);

    // 辅料类第三阶编码
    await db.execute(`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId1}, 'third', '301', '黏附类', '胶带、胶水等', 3),
        (${ruleId1}, 'third', '302', '管材', '各类管材', 3),
        (${ruleId1}, 'third', '303', '捆扎类', '扎带、绳索等', 3),
        (${ruleId1}, 'third', '304', '紧固件', '螺丝、螺母等', 3),
        (${ruleId1}, 'third', '305', '润滑类', '润滑油等', 3),
        (${ruleId1}, 'third', '306', '其它', '其它辅料', 3);
    `);

    // 包材类第三阶编码
    await db.execute(`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId1}, 'third', '401', '纸箱', '各类纸箱', 4),
        (${ruleId1}, 'third', '402', '保利龙/泡棉', '保利龙、泡棉', 4),
        (${ruleId1}, 'third', '403', '捆扎类', '包装捆扎材料', 4),
        (${ruleId1}, 'third', '404', '托盘类', '托盘', 4),
        (${ruleId1}, 'third', '405', '其它', '其它包材', 4);
    `);

    // 生产耗材类第三阶编码
    await db.execute(`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId1}, 'third', '501', '切削液', '切削液', 5),
        (${ruleId1}, 'third', '502', '防锈油', '防锈油', 5);
    `);

    // 插入工艺编码数据（第7位）
    await db.execute(`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description) VALUES
        (${ruleId1}, 'process', '0', '无工艺', '无工艺要求'),
        (${ruleId1}, 'process', '1', '烤漆', '烤漆工艺'),
        (${ruleId1}, 'process', '2', '表面处理', '表面处理工艺'),
        (${ruleId1}, 'process', '3', '焊接', '焊接工艺'),
        (${ruleId1}, 'process', '5', '其它', '其它工艺');
    `);

    // 为所有第三阶分类初始化流水号
    const thirdCategories = [
      4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26
    ];
    for (const categoryId of thirdCategories) {
      await db.execute(`
        INSERT INTO coding_sequences_v2 (category_id, sequence_number)
        VALUES (${categoryId}, 1)
      `);
    }

    // 同时为"无子类"情况初始化流水号（使用父级分类ID）
    const secondCategories = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const categoryId of secondCategories) {
      try {
        await db.execute(`
          INSERT INTO coding_sequences_v2 (category_id, sequence_number)
          VALUES (${categoryId}, 1)
        `);
      } catch (e) {
        // 忽略重复错误
      }
    }

    return NextResponse.json({
      success: true,
      message: '数据库迁移成功'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      message: '迁移失败',
      error: error.message || String(error)
    }, { status: 500 });
  }
}
