import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { projectApprovalFlows } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// GET /api/approval-flows/[id] - 获取单个审批流程
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    const flow = await db
      .select()
      .from(projectApprovalFlows)
      .where(eq(projectApprovalFlows.id, id))
      .limit(1);

    if (flow.length === 0) {
      return NextResponse.json(
        { success: false, error: "审批流程不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: flow[0] });
  } catch (error: any) {
    console.error("Error fetching approval flow:", error);
    const errorMessage = error?.message || error?.toString() || "获取审批流程失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/approval-flows/[id] - 更新审批流程
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      departmentId,
      approvalType,
      isEnabled,
      level1ApproverId,
      level1ApproverRole,
      level2ApproverId,
      level2ApproverRole,
      level3ApproverId,
      level3ApproverRole,
    } = body;

    // 获取当前流程
    const currentFlow = await db
      .select()
      .from(projectApprovalFlows)
      .where(eq(projectApprovalFlows.id, id))
      .limit(1);

    if (currentFlow.length === 0) {
      return NextResponse.json(
        { success: false, error: "审批流程不存在" },
        { status: 404 }
      );
    }

    // 构建更新数据（支持部分更新）
    const updateData: any = {
      updatedAt: new Date(),
    };

    // 只有当字段存在时才更新
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { success: false, error: "流程名称不能为空" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (departmentId !== undefined) {
      updateData.departmentId = departmentId || null;
    }

    if (approvalType !== undefined) {
      if (!approvalType) {
        return NextResponse.json(
          { success: false, error: "审批类型不能为空" },
          { status: 400 }
        );
      }
      // 允许同一审批类型在不同部门有不同的配置
      updateData.approvalType = approvalType;
    }

    if (isEnabled !== undefined) {
      updateData.isEnabled = isEnabled;
    }

    if (level1ApproverId !== undefined) {
      // 一级审批人是必须的
      if (!level1ApproverId) {
        return NextResponse.json(
          { success: false, error: "一级审批人是必须的，请配置一级审批人" },
          { status: 400 }
        );
      }
      updateData.level1ApproverId = level1ApproverId || null;
    }

    if (level1ApproverRole !== undefined) {
      updateData.level1ApproverRole = level1ApproverRole || null;
    }

    // 如果配置了二级审批人，则必须配置二级审批角色
    if (level2ApproverId !== undefined && level2ApproverId && !level2ApproverRole) {
      return NextResponse.json(
        { success: false, error: "已配置二级审批人，请同时选择二级审批角色" },
        { status: 400 }
      );
    }

    if (level2ApproverId !== undefined) {
      updateData.level2ApproverId = level2ApproverId || null;
    }

    if (level2ApproverRole !== undefined) {
      updateData.level2ApproverRole = level2ApproverRole || null;
    }

    // 如果二级审批人未配置，则清空三级审批人（按顺序配置）
    if (level2ApproverId !== undefined && !level2ApproverId) {
      updateData.level3ApproverId = null;
      updateData.level3ApproverRole = null;
    }

    // 如果配置了三级审批人，则必须配置三级审批角色
    if (level3ApproverId !== undefined && level3ApproverId && !level3ApproverRole) {
      return NextResponse.json(
        { success: false, error: "已配置三级审批人，请同时选择三级审批角色" },
        { status: 400 }
      );
    }

    if (level3ApproverId !== undefined) {
      updateData.level3ApproverId = level3ApproverId || null;
    }

    if (level3ApproverRole !== undefined) {
      updateData.level3ApproverRole = level3ApproverRole || null;
    }

    // 更新审批流程
    const updatedFlow = await db
      .update(projectApprovalFlows)
      .set(updateData)
      .where(eq(projectApprovalFlows.id, id))
      .returning();

    if (updatedFlow.length === 0) {
      return NextResponse.json(
        { success: false, error: "审批流程不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedFlow[0] });
  } catch (error: any) {
    console.error("Error updating approval flow:", error);
    const errorMessage = error?.message || error?.toString() || "更新审批流程失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/approval-flows/[id] - 删除审批流程
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    const deletedFlow = await db
      .delete(projectApprovalFlows)
      .where(eq(projectApprovalFlows.id, id))
      .returning();

    if (deletedFlow.length === 0) {
      return NextResponse.json(
        { success: false, error: "审批流程不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deletedFlow[0] });
  } catch (error: any) {
    console.error("Error deleting approval flow:", error);
    const errorMessage = error?.message || error?.toString() || "删除审批流程失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
