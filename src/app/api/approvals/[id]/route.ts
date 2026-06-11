import { NextRequest, NextResponse } from "next/server";
import { approvalManager } from "@/storage/database/approvalManager";

// GET /api/approvals/[id] - 获取审批详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const approval = await approvalManager.getById(id);
    if (!approval) {
      return NextResponse.json(
        {
          success: false,
          error: "审批申请不存在",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: approval,
    });
  } catch (error: any) {
    console.error("Error fetching approval:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "获取审批详情失败",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/approvals/[id] - 取消审批
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const approval = await approvalManager.cancel(id);

    return NextResponse.json({
      success: true,
      data: approval,
      message: "审批已取消",
    });
  } catch (error: any) {
    console.error("Error cancelling approval:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "取消审批失败",
      },
      { status: 500 }
    );
  }
}
