import { NextResponse } from "next/server";
import { systemLogManager } from "@/storage/database";

// DELETE /api/system-logs/[id] - 删除单个日志
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await systemLogManager.deleteLog(id);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Log deleted successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Log not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error deleting system log:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete system log" },
      { status: 500 }
    );
  }
}
