import { NextRequest, NextResponse } from "next/server";
import { approvalManager } from "@/storage/database/approvalManager";
import { getDb } from "coze-coding-dev-sdk";
import { approvalRequests, approvalHistory, orders, contracts } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";

// POST /api/approvals/[id]/cancel - 撤销审批申请
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
      .from(approvalRequests)
      .where(eq(approvalRequests.id, id))
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

    // 检查是否有任何审批历史记录（说明已经有审批人审批过）
    const history = await db
      .select()
      .from(approvalHistory)
      .where(eq(approvalHistory.requestId, id));

    if (history.length > 0) {
      return NextResponse.json(
        { success: false, error: "已有审批通过的步骤，无法撤销" },
        { status: 400 }
      );
    }

    // 使用事务更新审批状态和关联的订单/合同的审批状态
    await db.transaction(async (tx) => {
      // 更新审批状态为cancelled
      await tx
        .update(approvalRequests)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(approvalRequests.id, id));

      // 根据请求类型更新关联的订单或合同的审批状态
      if (approvalRecord.requestType === "order") {
        await tx
          .update(orders)
          .set({
            approvalStatus: "none",
            approvalRequestId: null,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, approvalRecord.requestId));
      } else if (approvalRecord.requestType === "contract") {
        await tx
          .update(contracts)
          .set({
            approvalStatus: "none",
            approvalRequestId: null,
            updatedAt: new Date(),
          })
          .where(eq(contracts.id, approvalRecord.requestId));
      }
    });

    invalidateCache("approvals:");
    invalidateCache("orders:");
    invalidateCache("contracts:");
    return NextResponse.json({
      success: true,
      message: "审批已撤销",
    });
  } catch (error: any) {
    console.error("Error cancelling approval:", error);
    const errorMessage = error?.message || error?.toString() || "撤销审批失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
