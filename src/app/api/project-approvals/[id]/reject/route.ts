import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import {
  projectApprovals,
  projectApprovalSteps,
  projects,
} from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// POST /api/project-approvals/[id]/reject - 拒绝审批
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approverId, rejectReason, isSystemAdmin } = body;

    // 验证必填字段
    if (!approverId) {
      return NextResponse.json(
        { success: false, error: "审批人 ID 不能为空" },
        { status: 400 }
      );
    }

    if (!rejectReason || !rejectReason.trim()) {
      return NextResponse.json(
        { success: false, error: "拒绝原因不能为空" },
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

    // 系统管理员/超级管理员可以跳过审批人检查
    if (!isSystemAdmin && approval.currentApproverId && approval.currentApproverId !== approverId) {
      return NextResponse.json(
        { success: false, error: "您不是当前审批人，无法审批" },
        { status: 403 }
      );
    }

    if (!rejectReason || !rejectReason.trim()) {
      return NextResponse.json(
        { success: false, error: "拒绝原因不能为空" },
        { status: 400 }
      );
    }

    // 使用事务
    await db.transaction(async (tx) => {
      // 更新当前步骤状态为已拒绝
      await tx
        .update(projectApprovalSteps)
        .set({
          status: "rejected",
          comment: rejectReason,
          approvedAt: new Date(),
        })
        .where(
          eq(projectApprovalSteps.approvalId, id)
        );

      // 更新审批记录状态为已拒绝
      await tx
        .update(projectApprovals)
        .set({
          status: "rejected",
          rejectReason,
          rejectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(projectApprovals.id, id));

      // 如果项目已存在（非 "pending" ID），更新项目的审批状态
      if (approval.projectId && approval.projectId !== "pending") {
        await tx
          .update(projects)
          .set({ approvalStatus: "rejected", approvalRequestId: id })
          .where(eq(projects.id, approval.projectId));
      }
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
      message: "审批已拒绝",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Reject Error]", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
