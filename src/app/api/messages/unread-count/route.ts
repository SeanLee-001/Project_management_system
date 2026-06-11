import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";

// GET - 获取未读消息数量
export async function GET(request: Request) {
  try {
    // 从session或token获取当前用户ID
    // 这里简化处理，实际需要从认证信息中获取
    // 暂时返回userId从query参数获取
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({
        success: true,
        data: { count: 0 },
      });
    }

    const count = await messageManager.getUnreadCount(userId);

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("获取未读消息数量失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取未读消息数量失败",
      },
      { status: 500 }
    );
  }
}
