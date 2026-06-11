import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { assetFiles } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// GET /api/projects/[id]/files - 获取项目的所有文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    const files = await db
      .select()
      .from(assetFiles)
      .where(eq(assetFiles.projectId, id))
      .orderBy(assetFiles.createdAt);

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
