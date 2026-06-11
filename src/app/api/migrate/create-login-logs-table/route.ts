import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/create-login-logs-table - 创建登录日志表
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 创建 login_logs 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        employee_number VARCHAR(50),
        full_name VARCHAR(255),
        login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        logout_time TIMESTAMP WITH TIME ZONE,
        login_duration INTEGER,
        ip_address VARCHAR(45) NOT NULL,
        previous_ip_address VARCHAR(45),
        user_agent TEXT,
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),
        login_method VARCHAR(20) NOT NULL DEFAULT 'password',
        login_status VARCHAR(20) NOT NULL DEFAULT 'success',
        is_sensitive_operation BOOLEAN DEFAULT false NOT NULL,
        sensitive_operation_type VARCHAR(100),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created login_logs table");

    // 创建索引
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS login_logs_user_id_idx ON login_logs(user_id)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS login_logs_login_time_idx ON login_logs(login_time)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS login_logs_ip_address_idx ON login_logs(ip_address)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS login_logs_login_status_idx ON login_logs(login_status)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS login_logs_is_sensitive_operation_idx ON login_logs(is_sensitive_operation)`);
      console.log("✓ Created indexes for login_logs table");
    } catch (error) {
      console.log("Indexes already exist or error:", error);
    }

    return NextResponse.json(
      {
        success: true,
        message: "login_logs table created successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating login_logs table:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
