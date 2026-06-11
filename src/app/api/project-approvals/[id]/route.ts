import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import {
  projectApprovals,
  projectApprovalSteps,
  users,
} from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// GET /api/project-approvals/[id] - 获取项目审批详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 获取审批步骤
    const steps = await db
      .select()
      .from(projectApprovalSteps)
      .where(eq(projectApprovalSteps.approvalId, id))
      .orderBy(projectApprovalSteps.createdAt);

    // 获取申请人信息
    const applicant = await db
      .select()
      .from(users)
      .where(eq(users.id, approval[0].applicantId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        ...approval[0],
        steps,
        applicant: applicant[0] || null,
      },
    });
  } catch (error: any) {
    console.error("Error fetching project approval detail:", error);
    const errorMessage = error?.message || error?.toString() || "获取项目审批详情失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
