import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";

// PUT - 标记消息为已读
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const message = await messageManager.markAsRead(id);

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("标记消息为已读失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "标记消息为已读失败",
      },
      { status: 500 }
    );
  }
}
