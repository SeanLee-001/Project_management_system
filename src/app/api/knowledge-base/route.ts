import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import { getDb } from "coze-coding-dev-sdk";
import { messages, UserRole } from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";
import { userManager } from "@/storage/database/userManager";
import { getUserFromToken } from "@/lib/auth";
import * as schema from "@/storage/database/shared/schema";

// 初始化S3Storage
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// 允许的文档类型
const ALLOWED_TYPES: { [key: string]: string[] } = {
  ppt: ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  pdf: ["application/pdf"],
  word: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  excel: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  markdown: ["text/markdown"],
};

// POST /api/knowledge-base/upload - 上传知识库文档
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 检查是否是管理员角色
    const isAdmin = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DEPARTMENT_MANAGER,
      UserRole.PROJECT_MANAGER,
    ].includes(currentUser.role as any);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "只有管理员才能上传知识库文档" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || "";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请上传文件" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: "请提供文档标题" },
        { status: 400 }
      );
    }

    // 验证文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type;
    
    let docType = '';
    const allAllowedTypes = Object.entries(ALLOWED_TYPES).flatMap(([type, mimes]) => 
      mimes.map(mime => ({ type, mime }))
    );
    
    for (const { type, mime } of allAllowedTypes) {
      if (mime === mimeType) {
        docType = type;
        break;
      }
    }
    
    // 如果 MIME 类型不匹配，通过扩展名判断
    if (!docType) {
      if (['ppt', 'pptx'].includes(fileExt)) docType = 'ppt';
      else if (fileExt === 'pdf') docType = 'pdf';
      else if (['doc', 'docx'].includes(fileExt)) docType = 'word';
      else if (['xls', 'xlsx'].includes(fileExt)) docType = 'excel';
      else if (fileExt === 'md') docType = 'markdown';
    }

    if (!docType) {
      return NextResponse.json(
        { success: false, error: "不支持的文件类型。支持：PPT、PDF、Word、Excel、Markdown" },
        { status: 400 }
      );
    }

    // 验证文件大小（限制为 100MB）
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "文件大小不能超过 100MB" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);

    // 构造文件路径
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_\u4e00-\u9fa5]/g, "_");
    const fileKey = `knowledge-base/${timestamp}_${safeFileName}`;

    // 上传到S3
    const uploadResult = await storage.uploadFile({
      fileContent,
      fileName: fileKey,
      contentType: mimeType || "application/octet-stream",
    });

    // 获取签名URL（有效期1年）
    const signedUrl = await storage.generatePresignedUrl({
      key: uploadResult,
      expireTime: 365 * 24 * 60 * 60,
    });

    // 创建知识库文档消息
    const db = await getDb();
    const [newMessage] = await db
      .insert(messages)
      .values({
        type: "knowledge_base",
        title: title,
        content: description || `${title} - ${file.name}`,
        senderId: currentUser.id,
        receiverId: null,
        isRead: false,
        readAt: null,
        isPinned: true,
        documentUrl: signedUrl,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        ...newMessage,
        docType,
        fileName: file.name,
        downloadUrl: signedUrl,
      },
      message: "文档上传成功",
    });
  } catch (error) {
    console.error("上传知识库文档失败:", error);
    return NextResponse.json(
      { success: false, error: "上传知识库文档失败: " + String(error) },
      { status: 500 }
    );
  }
}

// GET /api/knowledge-base - 获取知识库文档列表
export async function GET(request: NextRequest) {
  try {
    const db = await getDb(schema);
    
    const docs = await db
      .select()
      .from(messages)
      .where(eq(messages.type, "knowledge_base"))
      .orderBy(desc(messages.createdAt));

    return NextResponse.json({
      success: true,
      data: docs,
    });
  } catch (error) {
    console.error("获取知识库文档失败:", error);
    return NextResponse.json(
      { success: false, error: "获取知识库文档失败: " + String(error) },
      { status: 500 }
    );
  }
}
