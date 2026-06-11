import { NextRequest, NextResponse } from "next/server";
import { approvalManager } from "@/storage/database/approvalManager";

// GET /api/approvals/[id]/history - 获取审批历史
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const history = await approvalManager.getHistory(id);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error("Error fetching approval history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "获取审批历史失败",
      },
      { status: 500 }
    );
  }
}
