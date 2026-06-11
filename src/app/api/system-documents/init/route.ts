import { NextRequest, NextResponse } from "next/server";
import { messageManager } from "@/storage/database";
import { S3Storage } from "coze-coding-dev-sdk";
import { userManager } from "@/storage/database";
import { eq, and } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { messages } from "@/storage/database/shared/schema";
import fs from "fs";
import path from "path";

// 初始化S3Storage
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// GET /api/system-documents/init - 初始化系统文档
export async function GET(request: NextRequest) {
  try {
    console.log("[SystemDoc] 开始初始化系统文档");

    // 检查是否已经存在系统文档
    const adminUser = await userManager.getUserByUsername("admin");
    if (!adminUser) {
      console.error("[SystemDoc] 管理员用户不存在");
      return NextResponse.json(
        { success: false, error: "管理员用户不存在" },
        { status: 404 }
      );
    }
    console.log("[SystemDoc] 管理员用户存在:", adminUser.username);

    // 读取Markdown文档
    const filePath = path.join(process.cwd(), "tmp", "生产系统操作说明书.md");
    console.log("[SystemDoc] 读取文件路径:", filePath);

    let fileContent: string;
    try {
      fileContent = fs.readFileSync(filePath, "utf-8");
      console.log("[SystemDoc] 文件读取成功，大小:", fileContent.length);
    } catch (fileError) {
      console.error("[SystemDoc] 文件读取失败:", fileError);
      return NextResponse.json(
        { success: false, error: "无法读取系统文档文件" },
        { status: 500 }
      );
    }

    const fileBuffer = Buffer.from(fileContent, "utf-8");

    // 生成文件名：system-documents/system-manual.md (使用英文名称)
    const fileName = "system-documents/system-manual.md";
    console.log("[SystemDoc] 开始上传文件到对象存储");

    // 上传文件到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: fileBuffer,
      fileName: fileName,
      contentType: "text/markdown",
    });
    console.log("[SystemDoc] 文件上传成功，key:", fileKey);

    // 生成签名URL（有效期30天）
    const documentUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 60 * 60 * 24 * 30, // 30天
    });
    console.log("[SystemDoc] 生成签名URL成功");

    // 检查是否已经存在置顶的系统文档消息
    const db = await getDb();

    const [existingDoc] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.type, "system_document"),
          eq(messages.isPinned, true)
        )
      )
      .limit(1);

    if (existingDoc) {
      console.log("[SystemDoc] 更新现有系统文档消息");
      // 更新现有文档
      await db
        .update(messages)
        .set({
          title: "System Manual (生产系统操作说明书)",
          content: "系统操作说明文档，请点击下载查看。",
          documentUrl,
        })
        .where(eq(messages.id, existingDoc.id));

      return NextResponse.json({
        success: true,
        message: "系统文档已更新",
        data: {
          documentUrl,
          messageId: existingDoc.id,
        },
      });
    } else {
      console.log("[SystemDoc] 创建新的系统文档消息");
      // 创建新的系统文档消息
      const message = await messageManager.createMessage({
        type: "system_document",
        title: "System Manual (生产系统操作说明书)",
        content: "系统操作说明文档，请点击下载查看。",
        senderId: adminUser.id,
        receiverId: null,
        isPinned: true,
        documentUrl,
      });

      return NextResponse.json({
        success: true,
        message: "系统文档已创建",
        data: {
          documentUrl,
          messageId: message.id,
        },
      });
    }
  } catch (error) {
    console.error("[SystemDoc] 初始化系统文档失败:", error);
    return NextResponse.json(
      { success: false, error: "初始化系统文档失败: " + String(error) },
      { status: 500 }
    );
  }
}
