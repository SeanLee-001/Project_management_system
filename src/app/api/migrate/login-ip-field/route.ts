import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/login-ip-field - 添加loginIP字段到users表
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查loginIP字段是否已存在
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'login_ip'
    `;

    const existingColumns = await db.execute(checkColumnQuery);
    const hasLoginIPColumn = existingColumns.rows.length > 0;

    if (hasLoginIPColumn) {
      return NextResponse.json(
        {
          success: true,
          message: "loginIP field already exists in users table",
        },
        { status: 200 }
      );
    }

    // 添加loginIP字段
    const alterTableQuery = `
      ALTER TABLE users
      ADD COLUMN login_ip VARCHAR(45)
    `;

    await db.execute(alterTableQuery);

    return NextResponse.json(
      {
        success: true,
        message: "Successfully added loginIP field to users table",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding loginIP field:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add loginIP field",
      },
      { status: 500 }
    );
  }
}

// GET /api/migrate/login-ip-field - 检查loginIP字段状态
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查loginIP字段是否已存在
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'login_ip'
    `;

    const existingColumns = await db.execute(checkColumnQuery);
    const hasLoginIPColumn = existingColumns.rows.length > 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          hasLoginIPColumn,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking loginIP field:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check loginIP field",
      },
      { status: 500 }
    );
  }
}
