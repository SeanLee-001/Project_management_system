import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import { getDb } from "coze-coding-dev-sdk";
import { messages } from "@/storage/database/shared/schema";
import { userManager } from "@/storage/database/userManager";
import { UserRole } from "@/storage/database/shared/schema";

// 初始化S3Storage
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// POST /api/software-releases/upload - 上传软件发布包
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const senderId = formData.get("senderId") as string;
    const version = formData.get("version") as string;
    const releaseNotes = formData.get("releaseNotes") as string;

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
    ].includes(sender.role as any);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员或部门经理才能上传软件发布包" },
        { status: 403 }
      );
    }

    // 验证文件类型（只允许 .exe 和 .dmg 文件）
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".exe") && !fileName.endsWith(".dmg") && !fileName.endsWith(".appimage")) {
      return NextResponse.json(
        { success: false, error: "只支持上传 .exe、.dmg 或 .AppImage 文件" },
        { status: 400 }
      );
    }

    // 验证文件大小（限制为 500MB）
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "文件大小不能超过 500MB" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);

    // 构造文件路径
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `software-releases/${version ? `${version}_` : ""}${safeFileName}`;

    // 上传到S3
    const uploadResult = await storage.uploadFile({
      fileContent,
      fileName: fileKey,
      contentType: file.type || "application/octet-stream",
    });

    // 获取签名URL（有效期30天）
    const signedUrl = await storage.generatePresignedUrl({
      key: uploadResult,
      expireTime: 30 * 24 * 60 * 60, // 30天
    });

    // 构造消息标题
    const messageTitle = version
      ? `项目管理系统 ${version} 版本发布`
      : `项目管理系统 ${file.name} 版本发布`;

    // 构造消息内容
    const messageContent = releaseNotes || "最新版本的项目管理系统桌面客户端已发布，请点击下方链接下载。";

    // 创建系统通告消息
    const db = await getDb();
    const [newMessage] = await db
      .insert(messages)
      .values({
        type: "announcement",
        title: messageTitle,
        content: messageContent,
        senderId: senderId,
        receiverId: null,
        isRead: false,
        readAt: null,
        isPinned: true, // 软件发布消息默认置顶
        documentUrl: signedUrl,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newMessage,
      message: "软件发布包上传成功",
      fileName: file.name,
      downloadUrl: signedUrl,
    });
  } catch (error) {
    console.error("上传软件发布包失败:", error);
    return NextResponse.json(
      { success: false, error: "上传软件发布包失败: " + String(error) },
      { status: 500 }
    );
  }
}
