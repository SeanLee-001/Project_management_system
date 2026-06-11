import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// POST /api/migrate/create-asset-files-table - 创建asset_files表
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 创建 asset_files 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS asset_files (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_key VARCHAR(500) NOT NULL,
        file_size VARCHAR(50),
        file_type VARCHAR(100),
        file_path VARCHAR(500) NOT NULL,
        description TEXT,
        uploaded_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✓ Created asset_files table");

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS asset_files_project_id_idx ON asset_files(project_id)
    `);
    console.log("✓ Created asset_files_project_id_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS asset_files_file_key_idx ON asset_files(file_key)
    `);
    console.log("✓ Created asset_files_file_key_idx index");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS asset_files_created_at_idx ON asset_files(created_at)
    `);
    console.log("✓ Created asset_files_created_at_idx index");

    return NextResponse.json(
      {
        success: true,
        message: "Asset files table migration completed successfully",
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
