import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/migrate/migrate-missing-categories - 为半成品和原材料添加分类数据
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查是否已经初始化
    const checkResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM coding_categories_v2 
      WHERE rule_id IN (2, 3)
    `);

    const count = Number(checkResult.rows[0]?.count || 0);
    
    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: '半成品和原材料分类数据已存在',
        count: count
      });
    }

    // 为半成品（ruleId=2）插入第二阶编码数据
    const ruleId2 = 2;
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description) VALUES
        (${ruleId2}, 'second', '10', '机械加工', '机械加工件'),
        (${ruleId2}, 'second', '11', '钣金加工', '钣金加工件'),
        (${ruleId2}, 'second', '12', '焊接件', '焊接加工件'),
        (${ruleId2}, 'second', '13', '热处理', '热处理件'),
        (${ruleId2}, 'second', '14', '表面处理', '表面处理件'),
        (${ruleId2}, 'second', '15', '注塑件', '注塑加工件'),
        (${ruleId2}, 'second', '16', '压铸件', '压铸加工件'),
        (${ruleId2}, 'second', '17', '线束', '线束加工件'),
        (${ruleId2}, 'second', '18', 'PCBA', 'PCBA组件'),
        (${ruleId2}, 'second', '19', '其它', '其它半成品');
    `);

    // 为半成品插入第三阶编码数据
    // 机械加工类的第三阶
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId2}, 'third', '101', '车削件', '车削加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '10' LIMIT 1)),
        (${ruleId2}, 'third', '102', '铣削件', '铣削加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '10' LIMIT 1)),
        (${ruleId2}, 'third', '103', '磨削件', '磨削加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '10' LIMIT 1)),
        (${ruleId2}, 'third', '104', '镗削件', '镗削加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '10' LIMIT 1)),
        (${ruleId2}, 'third', '105', '钻削件', '钻削加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '10' LIMIT 1));
    `);

    // 钣金加工类的第三阶
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId2}, 'third', '201', '折弯件', '折弯加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '11' LIMIT 1)),
        (${ruleId2}, 'third', '202', '冲压件', '冲压加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '11' LIMIT 1)),
        (${ruleId2}, 'third', '203', '剪切件', '剪切加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '11' LIMIT 1)),
        (${ruleId2}, 'third', '204', '拉伸件', '拉伸加工件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '11' LIMIT 1));
    `);

    // 焊接件类的第三阶
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId2}, 'third', '301', '氩弧焊', '氩弧焊接件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '12' LIMIT 1)),
        (${ruleId2}, 'third', '302', 'CO2焊', 'CO2焊接件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '12' LIMIT 1)),
        (${ruleId2}, 'third', '303', '激光焊', '激光焊接件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '12' LIMIT 1)),
        (${ruleId2}, 'third', '304', '点焊', '点焊接件', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId2} AND code = '12' LIMIT 1));
    `);

    // 为半成品插入工艺编码
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description) VALUES
        (${ruleId2}, 'process', '0', '无工艺', '无工艺要求'),
        (${ruleId2}, 'process', '1', '热处理', '热处理工艺'),
        (${ruleId2}, 'process', '2', '镀锌', '镀锌工艺'),
        (${ruleId2}, 'process', '3', '喷漆', '喷漆工艺'),
        (${ruleId2}, 'process', '4', '阳极氧化', '阳极氧化工艺'),
        (${ruleId2}, 'process', '5', '发黑', '发黑工艺'),
        (${ruleId2}, 'process', '6', '电镀', '电镀工艺'),
        (${ruleId2}, 'process', '7', '抛光', '抛光工艺'),
        (${ruleId2}, 'process', '8', '钝化', '钝化工艺'),
        (${ruleId2}, 'process', '9', '其它', '其它工艺');
    `);

    // 为原材料（ruleId=3）插入第二阶编码数据
    const ruleId3 = 3;
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description) VALUES
        (${ruleId3}, 'second', '10', '钢材', '钢材原材料'),
        (${ruleId3}, 'second', '11', '铝材', '铝材原材料'),
        (${ruleId3}, 'second', '12', '铜材', '铜材原材料'),
        (${ruleId3}, 'second', '13', '不锈钢', '不锈钢原材料'),
        (${ruleId3}, 'second', '14', '塑料', '塑料原材料'),
        (${ruleId3}, 'second', '15', '橡胶', '橡胶原材料'),
        (${ruleId3}, 'second', '16', '电子元件', '电子元件'),
        (${ruleId3}, 'second', '17', '五金件', '五金件'),
        (${ruleId3}, 'second', '18', '紧固件', '紧固件'),
        (${ruleId3}, 'second', '19', '其它', '其它原材料');
    `);

    // 为原材料插入第三阶编码数据
    // 钢材类的第三阶
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId3}, 'third', '101', '碳钢', '碳钢材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '10' LIMIT 1)),
        (${ruleId3}, 'third', '102', '合金钢', '合金钢材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '10' LIMIT 1)),
        (${ruleId3}, 'third', '103', '工具钢', '工具钢材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '10' LIMIT 1)),
        (${ruleId3}, 'third', '104', '轴承钢', '轴承钢材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '10' LIMIT 1)),
        (${ruleId3}, 'third', '105', '弹簧钢', '弹簧钢材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '10' LIMIT 1));
    `);

    // 铝材类的第三阶
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId3}, 'third', '201', '铝板', '铝板材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '11' LIMIT 1)),
        (${ruleId3}, 'third', '202', '铝棒', '铝棒材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '11' LIMIT 1)),
        (${ruleId3}, 'third', '203', '铝管', '铝管材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '11' LIMIT 1)),
        (${ruleId3}, 'third', '204', '铝型材', '铝型材', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '11' LIMIT 1));
    `);

    // 不锈钢类的第三阶
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description, parent_id) VALUES
        (${ruleId3}, 'third', '301', '304不锈钢', '304不锈钢', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '13' LIMIT 1)),
        (${ruleId3}, 'third', '302', '316不锈钢', '316不锈钢', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '13' LIMIT 1)),
        (${ruleId3}, 'third', '303', '430不锈钢', '430不锈钢', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '13' LIMIT 1)),
        (${ruleId3}, 'third', '304', '其它不锈钢', '其它不锈钢', 
         (SELECT category_id FROM coding_categories_v2 WHERE rule_id = ${ruleId3} AND code = '13' LIMIT 1));
    `);

    // 为原材料插入工艺编码
    await db.execute(sql`
      INSERT INTO coding_categories_v2 (rule_id, category_level, code, name, description) VALUES
        (${ruleId3}, 'process', '0', '无工艺', '无工艺要求'),
        (${ruleId3}, 'process', '1', '热轧', '热轧工艺'),
        (${ruleId3}, 'process', '2', '冷轧', '冷轧工艺'),
        (${ruleId3}, 'process', '3', '退火', '退火工艺'),
        (${ruleId3}, 'process', '4', '淬火', '淬火工艺'),
        (${ruleId3}, 'process', '5', '其它', '其它工艺');
    `);

    // 为半成品的第三阶分类初始化流水号
    const halfProductThirdCategories = ['101', '102', '103', '104', '105', '201', '202', '203', '204', '301', '302', '303', '304'];
    for (const code of halfProductThirdCategories) {
      await db.execute(sql`
        INSERT INTO coding_sequences_v2 (category_id, sequence_number)
        SELECT category_id, 1 
        FROM coding_categories_v2 
        WHERE rule_id = ${ruleId2} AND category_level = 'third' AND code = ${code}
        ON CONFLICT (category_id) DO NOTHING
      `);
    }

    // 为原材料的第三阶分类初始化流水号
    const rawMaterialThirdCategories = ['101', '102', '103', '104', '105', '201', '202', '203', '204', '301', '302', '303', '304'];
    for (const code of rawMaterialThirdCategories) {
      await db.execute(sql`
        INSERT INTO coding_sequences_v2 (category_id, sequence_number)
        SELECT category_id, 1 
        FROM coding_categories_v2 
        WHERE rule_id = ${ruleId3} AND category_level = 'third' AND code = ${code}
        ON CONFLICT (category_id) DO NOTHING
      `);
    }

    // 为半成品和原材料的第二阶分类（无子类情况）初始化流水号
    const allSecondCategories = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
    
    for (const code of allSecondCategories) {
      // 半成品
      await db.execute(sql`
        INSERT INTO coding_sequences_v2 (category_id, sequence_number)
        SELECT category_id, 1 
        FROM coding_categories_v2 
        WHERE rule_id = ${ruleId2} AND category_level = 'second' AND code = ${code}
        ON CONFLICT (category_id) DO NOTHING
      `);
      
      // 原材料
      await db.execute(sql`
        INSERT INTO coding_sequences_v2 (category_id, sequence_number)
        SELECT category_id, 1 
        FROM coding_categories_v2 
        WHERE rule_id = ${ruleId3} AND category_level = 'second' AND code = ${code}
        ON CONFLICT (category_id) DO NOTHING
      `);
    }

    // 统计结果
    const statsResult = await db.execute(sql`
      SELECT 
        rule_id,
        category_level,
        COUNT(*) as count
      FROM coding_categories_v2
      WHERE rule_id IN (2, 3)
      GROUP BY rule_id, category_level
      ORDER BY rule_id, category_level
    `);

    return NextResponse.json({
      success: true,
      message: '半成品和原材料分类数据初始化成功',
      stats: statsResult.rows
    });
  } catch (error: any) {
    console.error('Error migrating missing categories:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
