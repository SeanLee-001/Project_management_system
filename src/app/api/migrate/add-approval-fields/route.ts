import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/add-approval-fields - 添加审批相关字段和表
export async function POST() {
  try {
    const db = await getDb();

    // 检查字段是否已存在
    const checkColumn = async (tableName: string, columnName: string): Promise<boolean> => {
      const result = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = '${tableName}'
          AND column_name = '${columnName}'
        );
      `);
      return result.rows[0].exists as boolean;
    };

    // 检查表是否已存在
    const checkTable = async (tableName: string): Promise<boolean> => {
      const result = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '${tableName}'
        );
      `);
      return result.rows[0].exists as boolean;
    };

    const results: string[] = [];

    // 1. 为 orders 表添加审批字段
    const orderApprovalFields = [
      { name: "approval_status", type: "VARCHAR(20)", default: "'none'", comment: "审批状态：none-无需审批，pending-待审批，approved-已通过，rejected-已拒绝" },
      { name: "approval_request_id", type: "VARCHAR(36)", comment: "关联的审批申请ID" },
    ];

    for (const field of orderApprovalFields) {
      const exists = await checkColumn("orders", field.name);
      if (!exists) {
        await db.execute(`
          ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS ${field.name} ${field.type} ${field.default ? `DEFAULT ${field.default}` : ""};
        `);
        results.push(`✓ orders表已添加字段: ${field.name}`);
      } else {
        results.push(`- orders表字段已存在: ${field.name}`);
      }
    }

    // 添加索引
    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS orders_approval_status_idx ON orders(approval_status);
      `);
      results.push("✓ orders表已添加索引: approval_status");
    } catch (e) {
      results.push(`- orders表索引已存在: approval_status`);
    }

    // 2. 为 contracts 表添加审批字段
    const contractApprovalFields = [
      { name: "approval_status", type: "VARCHAR(20)", default: "'none'", comment: "审批状态：none-无需审批，pending-待审批，approved-已通过，rejected-已拒绝" },
      { name: "approval_request_id", type: "VARCHAR(36)", comment: "关联的审批申请ID" },
    ];

    for (const field of contractApprovalFields) {
      const exists = await checkColumn("contracts", field.name);
      if (!exists) {
        await db.execute(`
          ALTER TABLE contracts
          ADD COLUMN IF NOT EXISTS ${field.name} ${field.type} ${field.default ? `DEFAULT ${field.default}` : ""};
        `);
        results.push(`✓ contracts表已添加字段: ${field.name}`);
      } else {
        results.push(`- contracts表字段已存在: ${field.name}`);
      }
    }

    // 添加索引
    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS contracts_approval_status_idx ON contracts(approval_status);
      `);
      results.push("✓ contracts表已添加索引: approval_status");
    } catch (e) {
      results.push(`- contracts表索引已存在: approval_status`);
    }

    // 3. 创建 approval_requests 表
    const approvalRequestsTableExists = await checkTable("approval_requests");
    if (!approvalRequestsTableExists) {
      await db.execute(`
        CREATE TABLE approval_requests (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          request_number VARCHAR(50) NOT NULL UNIQUE,
          request_type VARCHAR(50) NOT NULL,
          request_id VARCHAR(36) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          applicant_id VARCHAR(36) NOT NULL,
          applicant_name VARCHAR(255) NOT NULL,
          current_approver_id VARCHAR(36),
          current_approver_name VARCHAR(255),
          current_step VARCHAR(50) NOT NULL DEFAULT 'level1',
          total_steps VARCHAR(50) NOT NULL DEFAULT 'level1',
          approval_date TIMESTAMP WITH TIME ZONE,
          approval_note TEXT,
          related_data TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE
        );
      `);
      results.push("✓ 已创建表: approval_requests");

      // 添加索引
      await db.execute(`
        CREATE INDEX approval_requests_request_number_idx ON approval_requests(request_number);
        CREATE INDEX approval_requests_request_type_idx ON approval_requests(request_type);
        CREATE INDEX approval_requests_request_id_idx ON approval_requests(request_id);
        CREATE INDEX approval_requests_status_idx ON approval_requests(status);
        CREATE INDEX approval_requests_applicant_id_idx ON approval_requests(applicant_id);
        CREATE INDEX approval_requests_current_approver_id_idx ON approval_requests(current_approver_id);
      `);
      results.push("✓ approval_requests表已添加索引");
    } else {
      results.push("- 表已存在: approval_requests");
    }

    // 4. 创建 approval_history 表
    const approvalHistoryTableExists = await checkTable("approval_history");
    if (!approvalHistoryTableExists) {
      await db.execute(`
        CREATE TABLE approval_history (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id VARCHAR(36) NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
          step VARCHAR(50) NOT NULL,
          approver_id VARCHAR(36) NOT NULL,
          approver_name VARCHAR(255) NOT NULL,
          action VARCHAR(50) NOT NULL,
          action_note TEXT,
          action_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      results.push("✓ 已创建表: approval_history");

      // 添加索引
      await db.execute(`
        CREATE INDEX approval_history_request_id_idx ON approval_history(request_id);
        CREATE INDEX approval_history_approver_id_idx ON approval_history(approver_id);
      `);
      results.push("✓ approval_history表已添加索引");
    } else {
      results.push("- 表已存在: approval_history");
    }

    return NextResponse.json({
      success: true,
      message: "审批相关字段和表迁移完成",
      data: results,
    });
  } catch (error: any) {
    console.error("Error migrating approval fields:", error);
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
