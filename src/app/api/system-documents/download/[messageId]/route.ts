import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import { getDb } from "coze-coding-dev-sdk";
import { messages } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// 初始化S3Storage
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// GET /api/system-documents/download/{messageId} - 下载系统文档
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    // 从数据库获取消息信息
    const db = await getDb();
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));

    if (!message) {
      return NextResponse.json(
        { success: false, error: "消息不存在" },
        { status: 404 }
      );
    }

    if (message.type !== "system_document" || !message.documentUrl) {
      return NextResponse.json(
        { success: false, error: "此消息不是系统文档" },
        { status: 400 }
      );
    }

    // 从S3下载文件（documentUrl是完整的签名URL）
    // 我们需要从documentUrl中提取file key
    // 签名URL格式：https://endpoint/bucket/key?signature=...

    let fileKey = message.documentUrl;

    // 尝试从URL中提取key
    try {
      const url = new URL(message.documentUrl);
      const pathParts = url.pathname.split('/');
      // pathParts格式：["", "bucket-name", "system-documents", "system-manual.md"]
      // 跳过第一个空字符串和bucket名称
      if (pathParts.length >= 3) {
        fileKey = pathParts.slice(2).join('/');
      }
    } catch (error) {
      console.error("解析documentUrl失败:", error);
      // 如果解析失败，使用原始documentUrl（可能已经是key）
    }

    // 从S3读取文件内容
    const fileContent = await storage.readFile({ fileKey });

    // 返回文件内容
    return new NextResponse(new Uint8Array(fileContent), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="system-manual.md"; filename*=UTF-8\'\'%E7%94%9F%E4%BA%A7%E7%B3%BB%E7%BB%9F%E6%93%8D%E4%BD%9C%E8%AF%B4%E6%98%8E%E4%B9%A6.md',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("下载系统文档失败:", error);
    return NextResponse.json(
      { success: false, error: "下载系统文档失败: " + String(error) },
      { status: 500 }
    );
  }
}
