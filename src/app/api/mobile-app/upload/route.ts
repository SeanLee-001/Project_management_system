import { NextRequest, NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";
import { messages } from "@/storage/database/shared/schema";
import { getDb } from "coze-coding-dev-sdk";
import * as fs from "fs";

// 上传APK文件
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const version = formData.get("version") as string;
    const description = formData.get("description") as string;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "未找到文件" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".apk")) {
      return NextResponse.json(
        { success: false, error: "仅支持APK文件" },
        { status: 400 }
      );
    }

    // 保存文件到 /tmp 目录
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `project-management-v${version || "1.0.0"}-${Date.now()}.apk`;
    const filepath = `/tmp/${filename}`;

    fs.writeFileSync(filepath, buffer);

    // 创建下载URL (通过API提供下载)
    const downloadUrl = `/api/mobile-app/download/${filename}`;

    // 创建系统公告消息
    const now = new Date();
    const messageData = {
      title: `📱 移动端APP更新 - 版本${version || "1.0.0"}`,
      content: `新版本已发布！${description || "修复已知问题，提升用户体验。"}\n\n点击下方按钮下载安装。`,
      type: "announcement",
      senderId: null,
      receiverId: null,
      isRead: false,
      isPinned: true,
      documentUrl: downloadUrl,
      relatedId: null,
      relatedType: "mobile_app",
      createdAt: now,
      readAt: null,
    };

    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        messageId: message.id,
        downloadUrl,
        filename,
        version,
      },
    });
  } catch (error) {
    console.error("上传APK失败:", error);
    return NextResponse.json(
      { success: false, error: "上传失败" },
      { status: 500 }
    );
  }
}
