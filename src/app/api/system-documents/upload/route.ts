import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import { getDb } from "coze-coding-dev-sdk";
import { messages, users, UserRole } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";
import { userManager } from "@/storage/database/userManager";

// 初始化S3Storage
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// POST /api/system-documents/upload - 上传/更新系统文档
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const senderId = formData.get("senderId") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请上传文件" },
        { status: 400 }
      );
    }

    if (!senderId) {
      return NextResponse.json(
        { success: false, error: "缺少发送者ID" },
        { status: 400 }
      );
    }

    // 验证发送者是否是管理员
    const sender = await userManager.getUserById(senderId);
    if (!sender) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 检查是否是管理员角色
    const isAdmin = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DEPARTMENT_MANAGER,
      UserRole.PROJECT_MANAGER,
    ].includes(sender.role as any);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "只有管理员才能上传系统文档" },
        { status: 403 }
      );
    }

    // 验证文件类型（只允许markdown文件）
    if (file.type !== "text/markdown" && !file.name.endsWith(".md")) {
      return NextResponse.json(
        { success: false, error: "只支持上传Markdown文件（.md）" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);

    // 上传到S3
    const fileKey = `system-documents/system-manual.md`;
    const uploadResult = await storage.uploadFile({
      fileContent,
      fileName: fileKey,
      contentType: "text/markdown",
    });

    // 获取签名URL
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 365 * 24 * 60 * 60, // 1年有效期
    });

    // 查询是否已存在系统文档消息
    const db = await getDb();
    const [existingMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.type, "system_document"));

    if (existingMessage) {
      // 更新现有消息
      const [updatedMessage] = await db
        .update(messages)
        .set({
          documentUrl: signedUrl,
        })
        .where(eq(messages.id, existingMessage.id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updatedMessage,
        message: "系统文档更新成功",
      });
    } else {
      // 创建新的系统文档消息
      const [newMessage] = await db
        .insert(messages)
        .values({
          type: "system_document",
          title: "生产系统操作说明书",
          content: "本系统操作说明书供所有用户参考使用。",
          senderId: senderId,
          receiverId: null,
          isRead: false,
          readAt: null,
          isPinned: true, // 系统文档默认置顶
          documentUrl: signedUrl,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newMessage,
        message: "系统文档创建成功",
      });
    }
  } catch (error) {
    console.error("上传系统文档失败:", error);
    return NextResponse.json(
      { success: false, error: "上传系统文档失败: " + String(error) },
      { status: 500 }
    );
  }
}
