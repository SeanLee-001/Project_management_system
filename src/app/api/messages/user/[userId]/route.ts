import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";
import { userManager } from "@/storage/database/userManager";

// GET - 获取指定用户的消息列表（系统管理员可查看所有消息，普通用户仅看个人+系统消息）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    let isAdmin = false;
    try {
      const user = await userManager.getUserById(userId);
      isAdmin = user?.role === "system_admin";
    } catch {
      // role lookup failed, fall back to user-scoped messages
    }

    const messagesList = isAdmin
      ? await messageManager.getAllMessages()
      : await messageManager.getMessagesByReceiverId(userId);

    return NextResponse.json({
      success: true,
      data: messagesList,
    });
  } catch (error) {
    console.error("获取消息列表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取消息列表失败",
      },
      { status: 500 }
    );
  }
}
