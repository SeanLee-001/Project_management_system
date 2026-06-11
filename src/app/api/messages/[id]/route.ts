import { NextResponse } from "next/server";
import { messageManager } from "@/storage/database/messageManager";

// DELETE - 删除消息
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await messageManager.deleteMessage(id);

    return NextResponse.json({
      success: true,
      message: "消息删除成功",
    });
  } catch (error) {
    console.error("删除消息失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "删除消息失败",
      },
      { status: 500 }
    );
  }
}
