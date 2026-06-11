import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/login-fields - 添加登录信息字段到users表
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    const results = [];

    // 添加 last_login_time 字段
    try {
      await db.execute(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_time TIMESTAMP WITH TIME ZONE`
      );
      results.push("✓ Added last_login_time column to users table");
      console.log("✓ Added last_login_time column to users table");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push(`last_login_time: ${errorMsg}`);
      console.log("last_login_time error:", error);
    }

    // 添加 login_duration 字段
    try {
      await db.execute(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS login_duration VARCHAR(50)`
      );
      results.push("✓ Added login_duration column to users table");
      console.log("✓ Added login_duration column to users table");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push(`login_duration: ${errorMsg}`);
      console.log("login_duration error:", error);
    }

    // 添加 login_device 字段
    try {
      await db.execute(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS login_device VARCHAR(255)`
      );
      results.push("✓ Added login_device column to users table");
      console.log("✓ Added login_device column to users table");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push(`login_device: ${errorMsg}`);
      console.log("login_device error:", error);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Database migration completed successfully",
        results,
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
