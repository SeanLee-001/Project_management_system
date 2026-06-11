import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";
import { userManager } from "@/storage/database/userManager";
import { UserRole } from "@/storage/database/shared/schema";

// POST - 发送系统通告（管理员权限）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, senderId } = body;

    if (!senderId || !title || !content) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数",
        },
        { status: 400 }
      );
    }

    // 验证发送者是否是管理员
    const sender = await userManager.getUserById(senderId);
    if (!sender) {
      return NextResponse.json(
        {
          success: false,
          error: "用户不存在",
        },
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
        {
          success: false,
          error: "只有管理员才能发送通告",
        },
        { status: 403 }
      );
    }

    const message = await messageManager.sendAnnouncement({
      senderId,
      title,
      content,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("发送通告失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "发送通告失败",
      },
      { status: 500 }
    );
  }
}
