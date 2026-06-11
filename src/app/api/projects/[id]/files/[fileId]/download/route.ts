import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { assetFiles } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { S3Storage } from "coze-coding-dev-sdk";

// GET /api/projects/[id]/files/[fileId]/download - 下载文件
export async function GET(
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

    // 生成签名 URL
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    });

    const downloadUrl = await storage.generatePresignedUrl({
      key: file.fileKey,
      expireTime: 86400, // 24 小时
    });

    return NextResponse.json({
      success: true,
      downloadUrl,
      fileName: file.fileName,
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
