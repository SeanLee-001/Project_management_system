import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/add-order-contract-fields - 添加订单、合同和负责人电话字段到projects表
export async function POST() {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkColumn = async (columnName: string): Promise<boolean> => {
      const result = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'projects'
          AND column_name = '${columnName}'
        );
      `);
      return result.rows[0].exists as boolean;
    };

    // 负责人电话字段
    const leadPhoneFields = [
      { name: "mechanical_lead_phone", type: "VARCHAR(50)", constraints: "", comment: "机械负责人电话" },
      { name: "electrical_lead_phone", type: "VARCHAR(50)", constraints: "", comment: "电气负责人电话" },
      { name: "visual_lead_phone", type: "VARCHAR(50)", constraints: "", comment: "视觉负责人电话" },
      { name: "software_lead_phone", type: "VARCHAR(50)", constraints: "", comment: "软件负责人电话" },
      { name: "algorithm_lead_phone", type: "VARCHAR(50)", constraints: "", comment: "算法负责人电话" },
      { name: "safety_lead_phone", type: "VARCHAR(50)", constraints: "", comment: "安全负责人电话" },
    ];

    // 算法负责人字段
    const algorithmLeadFields = [
      { name: "algorithm_lead", type: "VARCHAR(36)", constraints: "REFERENCES users(id) ON DELETE SET NULL", comment: "算法负责人" },
    ];

    // 订单信息字段
    const orderFields = [
      { name: "order_date", type: "TIMESTAMP WITH TIME ZONE", constraints: "", comment: "订单日期" },
      { name: "delivery_date", type: "TIMESTAMP WITH TIME ZONE", constraints: "", comment: "订单交付日期" },
    ];

    // 合同信息字段
    const contractFields = [
      { name: "contract_code", type: "VARCHAR(50)", constraints: "", comment: "合同编码" },
      { name: "contract_name", type: "VARCHAR(255)", constraints: "", comment: "合同名称" },
      { name: "contract_date", type: "TIMESTAMP WITH TIME ZONE", constraints: "", comment: "合同日期" },
      { name: "technical_protocol_url", type: "TEXT", constraints: "", comment: "技术协议URL" },
    ];

    const allColumns = [
      ...leadPhoneFields,
      ...algorithmLeadFields,
      ...orderFields,
      ...contractFields,
    ];

    const results: string[] = [];

    for (const column of allColumns) {
      const exists = await checkColumn(column.name);
      if (!exists) {
        await db.execute(`
          ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} ${column.constraints || ""};
        `);
        results.push(`✓ 已添加字段: ${column.name}`);
      } else {
        results.push(`- 字段已存在: ${column.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "订单、合同和负责人电话字段迁移完成",
      data: results,
    });
  } catch (error: any) {
    console.error("Error migrating order and contract fields:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "迁移失败",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
