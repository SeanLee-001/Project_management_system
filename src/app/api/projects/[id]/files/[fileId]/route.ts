import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { assetFiles } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { S3Storage } from "coze-coding-dev-sdk";

// GET /api/projects/[id]/files/[fileId] - 获取单个文件
// PUT /api/projects/[id]/files/[fileId] - 修改文件
// DELETE /api/projects/[id]/files/[fileId] - 删除文件

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const db = await getDb();

    const file = await db
      .select()
      .from(assetFiles)
      .where(eq(assetFiles.id, fileId))
      .limit(1);

    if (!file || file.length === 0) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, file: file[0] });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const body = await request.json();
    const db = await getDb();

    // 更新文件信息
    const updatedFiles = await db
      .update(assetFiles)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(assetFiles.id, fileId))
      .returning();

    if (!updatedFiles || updatedFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, file: updatedFiles[0] });
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const db = await getDb();

    // 获取文件信息
    const fileRecords = await db
      .select()
      .from(assetFiles)
      .where(eq(assetFiles.id, fileId))
      .limit(1);

    if (!fileRecords || fileRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const file = fileRecords[0];

    // 从 S3 删除文件
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    });

    await storage.deleteFile({ fileKey: file.fileKey });

    // 从数据库删除文件记录
    await db.delete(assetFiles).where(eq(assetFiles.id, fileId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
