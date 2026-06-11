import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import {
  projectApprovals,
  projectApprovalSteps,
  projects,
} from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";

// POST /api/project-approvals/[id]/cancel - 撤销项目审批
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "用户ID不能为空" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 获取审批记录
    const approval = await db
      .select()
      .from(projectApprovals)
      .where(eq(projectApprovals.id, id))
      .limit(1);

    if (!approval || approval.length === 0) {
      return NextResponse.json(
        { success: false, error: "审批记录不存在" },
        { status: 404 }
      );
    }

    const approvalRecord = approval[0];

    // 检查审批状态，只有pending状态的审批才能撤销
    if (approvalRecord.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "只能撤销待审批状态的审批" },
        { status: 400 }
      );
    }

    // 检查是否是申请人本人
    if (approvalRecord.applicantId !== userId) {
      return NextResponse.json(
        { success: false, error: "只有申请人本人才能撤销审批" },
        { status: 403 }
      );
    }

    // 检查是否有任何一级审批（approved状态的步骤）
    const approvedSteps = await db
      .select()
      .from(projectApprovalSteps)
      .where(
        and(
          eq(projectApprovalSteps.approvalId, id),
          eq(projectApprovalSteps.status, "approved")
        )
      );

    if (approvedSteps.length > 0) {
      return NextResponse.json(
        { success: false, error: "已有审批通过的步骤，无法撤销" },
        { status: 400 }
      );
    }

    // 使用事务更新审批状态和项目的审批状态
    await db.transaction(async (tx) => {
      // 更新审批状态为cancelled
      await tx
        .update(projectApprovals)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(projectApprovals.id, id));

      // 如果审批关联的是已创建的项目（非 "pending" ID），更新项目的审批状态
      if (approvalRecord.projectId && approvalRecord.projectId !== "pending") {
        await tx
          .update(projects)
          .set({
            approvalStatus: "none",
            approvalRequestId: null,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, approvalRecord.projectId));
      }
    });

    return NextResponse.json({
      success: true,
      message: "审批已撤销",
    });
  } catch (error: any) {
    console.error("Error cancelling project approval:", error);
    const errorMessage = error?.message || error?.toString() || "撤销审批失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
