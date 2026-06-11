import { NextRequest, NextResponse } from "next/server";
import { approvalManager } from "@/storage/database/approvalManager";

// POST /api/approvals/[id]/approve - 审批通过
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approverId, approverName, note } = body;

    if (!approverId || !approverName) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少审批人信息",
        },
        { status: 400 }
      );
    }

    const approval = await approvalManager.approve(id, approverId, approverName, note);

    return NextResponse.json({
      success: true,
      data: approval,
      message: "审批已通过",
    });
  } catch (error: any) {
    console.error("Error approving approval:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "审批通过失败",
      },
      { status: 500 }
    );
  }
}
