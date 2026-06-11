import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";

// GET - 获取指定用户的消息列表（个人消息+系统通告）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const messagesList = await messageManager.getMessagesByReceiverId(userId);

    // 为每条消息添加发送者信息
    const messagesWithSender = await Promise.all(
      messagesList.map(async (message) => {
        // 这里需要获取发送者信息，但为了简化，暂时返回消息本身
        return message;
      })
    );

    return NextResponse.json({
      success: true,
      data: messagesWithSender,
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
