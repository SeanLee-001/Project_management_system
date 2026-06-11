import { NextRequest, NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";
import { messages } from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { getDb } from "coze-coding-dev-sdk";

// 获取已上传的APK列表
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    // 查询所有移动端APP相关的消息
    const appMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.relatedType, "mobile_app"))
      .orderBy(desc(messages.createdAt));

    // 检查每个APK文件是否存在
    const appList = appMessages.map((msg) => {
      if (msg.documentUrl) {
        const filename = msg.documentUrl.split("/").pop() || "";
        const filepath = path.join("/tmp", filename);
        const exists = fs.existsSync(filepath);

        return {
          id: msg.id,
          title: msg.title,
          description: msg.content,
          version: extractVersion(msg.title),
          filename,
          downloadUrl: msg.documentUrl,
          exists,
          createdAt: msg.createdAt,
        };
      }
      return null;
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: appList,
    });
  } catch (error) {
    console.error("获取APK列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取失败" },
      { status: 500 }
    );
  }
}

// 从标题中提取版本号
function extractVersion(title: string): string {
  const match = title.match(/版本([\d.]+)/);
  return match ? match[1] : "1.0.0";
}
