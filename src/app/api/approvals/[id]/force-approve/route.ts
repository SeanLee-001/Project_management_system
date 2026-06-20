import { NextRequest, NextResponse } from "next/server";
import { approvalManager } from "@/storage/database/approvalManager";
import { userManager } from "@/storage/database/userManager";

// POST /api/approvals/[id]/force-approve - 管理员一键审核（跳过所有审批步骤）
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
        { success: false, error: "缺少审批人信息" },
        { status: 400 }
      );
    }

    // 验证调用者是否为系统管理员
    const user = await userManager.getUserById(approverId);
    if (!user || user.role !== "system_admin") {
      return NextResponse.json(
        { success: false, error: "仅系统管理员可执行一键审核" },
        { status: 403 }
      );
    }

    const approval = await approvalManager.forceApprove(
      id,
      approverId,
      approverName,
      note
    );

    return NextResponse.json({
      success: true,
      data: approval,
    });
  } catch (error: any) {
    console.error("Error force approving:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "一键审核失败" },
      { status: 500 }
    );
  }
}
