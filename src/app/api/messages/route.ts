import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";
import { userManager } from "@/storage/database/userManager";
import { UserRole } from "@/storage/database/shared/schema";

// GET - 获取当前用户的消息列表
export async function GET() {
  try {
    // 从session或token获取当前用户ID
    // 这里简化处理，实际需要从认证信息中获取
    // 暂时返回空列表
    return NextResponse.json({
      success: true,
      data: [],
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

// POST - 发送个人消息
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { receiverId, title, content } = body;

    // 从session或token获取当前用户ID
    // 这里简化处理，实际需要从认证信息中获取
    const senderId = body.senderId; // 暂时从body获取

    if (!senderId || !receiverId || !title || !content) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数",
        },
        { status: 400 }
      );
    }

    // 验证接收者是否存在
    const receiver = await userManager.getUserById(receiverId);
    if (!receiver) {
      return NextResponse.json(
        {
          success: false,
          error: "接收者不存在",
        },
        { status: 404 }
      );
    }

    const message = await messageManager.sendMessageToUser({
      senderId,
      receiverId,
      title,
      content,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("发送消息失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "发送消息失败",
      },
      { status: 500 }
    );
  }
}
