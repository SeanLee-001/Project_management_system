import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate - 执行数据库迁移
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 添加 isFirstLogin 字段（如果不存在）
    // 注意：这里使用原始 SQL，因为 Drizzle 可能不直接支持条件添加列
    try {
      await db.execute(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true NOT NULL`
      );
      console.log("✓ Added is_first_login column to users table");
    } catch (error) {
      console.log("is_first_login column already exists or error:", error);
    }

    // 为现有用户设置默认值
    try {
      await db.execute(
        `UPDATE users SET is_first_login = true WHERE is_first_login IS NULL`
      );
      console.log("✓ Updated existing users with is_first_login default value");
    } catch (error) {
      console.log("Error updating existing users:", error);
    }

    // 为所有现有用户（包括之前的 admin）设置为首次登录
    // 注意：这会强制所有用户修改密码
    try {
      await db.execute(
        `UPDATE users SET is_first_login = true`
      );
      console.log("✓ Set all users to first login mode");
    } catch (error) {
      console.log("Error setting first login mode:", error);
    }

    // 重置所有用户的密码为 admin123
    // 注意：这会将所有用户的密码重置，用户需要登录后强制修改密码
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.execute(
        `UPDATE users SET password = '${hashedPassword}'`
      );
      console.log("✓ Reset all users password to admin123");
    } catch (error) {
      console.log("Error resetting passwords:", error);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Database migration completed successfully",
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
