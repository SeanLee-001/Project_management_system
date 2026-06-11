import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";

// PUT - 标记所有消息为已读
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少userId参数",
        },
        { status: 400 }
      );
    }

    await messageManager.markAllAsRead(userId);

    return NextResponse.json({
      success: true,
      message: "所有消息已标记为已读",
    });
  } catch (error) {
    console.error("标记所有消息为已读失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "标记所有消息为已读失败",
      },
      { status: 500 }
    );
  }
}
