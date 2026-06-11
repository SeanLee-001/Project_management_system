import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import {
  projectApprovals,
  projectApprovalSteps,
  users,
} from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// POST /api/project-approvals/[id]/transfer - 转交审批
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { targetUserId, reason } = body;

    // 验证必填字段
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "接收人 ID 不能为空" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 获取当前审批记录
    const approvals = await db
      .select()
      .from(projectApprovals)
      .where(eq(projectApprovals.id, id))
      .limit(1);

    if (!approvals || approvals.length === 0) {
      return NextResponse.json(
        { success: false, error: "审批记录不存在" },
        { status: 404 }
      );
    }

    const approval = approvals[0];

    // 检查审批状态
    if (approval.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `当前审批状态为${approval.status}，无法操作` },
        { status: 400 }
      );
    }

    // 验证接收人是否存在
    const targetUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: "接收人不存在" },
        { status: 404 }
      );
    }

    const targetUser = targetUsers[0];

    // 使用事务
    await db.transaction(async (tx) => {
      // 更新当前步骤的审批人
      await tx
        .update(projectApprovalSteps)
        .set({
          approverId: targetUserId,
          approverName: targetUser.name,
        })
        .where(
          eq(projectApprovalSteps.approvalId, id)
        );

      // 更新审批记录的当前审批人
      await tx
        .update(projectApprovals)
        .set({
          currentApproverId: targetUserId,
          currentApproverName: targetUser.name,
          updatedAt: new Date(),
        })
        .where(eq(projectApprovals.id, id));
    });

    // 获取更新后的审批记录
    const updatedApproval = await db
      .select()
      .from(projectApprovals)
      .where(eq(projectApprovals.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: updatedApproval[0],
      message: "审批已转交",
    });
  } catch (error: any) {
    console.error("Error transferring project approval:", error);
    const errorMessage = error?.message || error?.toString() || "转交审批失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
