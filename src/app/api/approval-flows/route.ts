import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { projectApprovalFlows } from "@/storage/database/shared/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/approval-flows - 获取审批流程列表
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const approvalType = searchParams.get("approvalType");
    const isEnabled = searchParams.get("isEnabled");
    const includeDisabled = searchParams.get("includeDisabled") === "true";

    // 构建查询条件
    const conditions = [];

    // 默认只返回已启用的审批流程，除非显式要求包含已停用的
    if (!includeDisabled && isEnabled === null) {
      conditions.push(eq(projectApprovalFlows.isEnabled, true));
    } else if (isEnabled !== null) {
      conditions.push(eq(projectApprovalFlows.isEnabled, isEnabled === "true"));
    }

    if (approvalType) {
      conditions.push(eq(projectApprovalFlows.approvalType, approvalType));
    }

    let query = db
      .select()
      .from(projectApprovalFlows)
      .orderBy(desc(projectApprovalFlows.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const flows = await query;

    return NextResponse.json({ success: true, data: flows });
  } catch (error: any) {
    console.error("Error fetching approval flows:", error);
    const errorMessage = error?.message || error?.toString() || "获取审批流程列表失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/approval-flows/:id - 更新审批流程
export async function PUT(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "审批流程ID不能为空" },
        { status: 400 }
      );
    }

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

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "流程名称不能为空" },
        { status: 400 }
      );
    }

    if (!approvalType) {
      return NextResponse.json(
        { success: false, error: "审批类型不能为空" },
        { status: 400 }
      );
    }

    // 一级审批人是必须的
    if (!level1ApproverId) {
      return NextResponse.json(
        { success: false, error: "一级审批人是必须的，请配置一级审批人" },
        { status: 400 }
      );
    }

    // 如果配置了二级审批人，则必须配置二级审批角色
    if (level2ApproverId && !level2ApproverRole) {
      return NextResponse.json(
        { success: false, error: "已配置二级审批人，请同时选择二级审批角色" },
        { status: 400 }
      );
    }

    // 如果配置了三级审批人，则必须配置三级审批角色
    if (level3ApproverId && !level3ApproverRole) {
      return NextResponse.json(
        { success: false, error: "已配置三级审批人，请同时选择三级审批角色" },
        { status: 400 }
      );
    }

    // 更新审批流程
    await db
      .update(projectApprovalFlows)
      .set({
        name: name.trim() || null,
        description: description?.trim() || null,
        departmentId: departmentId || null,
        approvalType,
        isEnabled,
        level1ApproverId: level1ApproverId || null,
        level1ApproverRole: level1ApproverRole || null,
        level2ApproverId: level2ApproverId || null,
        level2ApproverRole: level2ApproverRole || null,
        level3ApproverId: level3ApproverId || null,
        level3ApproverRole: level3ApproverRole || null,
        updatedAt: new Date(),
      })
      .where(eq(projectApprovalFlows.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating approval flow:", error);
    const errorMessage = error?.message || error?.toString() || "更新审批流程失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/approval-flows - 创建审批流程
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      name,
      description,
      departmentId,
      approvalType,
      isEnabled = true,
      level1ApproverId,
      level1ApproverRole,
      level2ApproverId,
      level2ApproverRole,
      level3ApproverId,
      level3ApproverRole,
    } = body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "流程名称不能为空" },
        { status: 400 }
      );
    }

    if (!approvalType) {
      return NextResponse.json(
        { success: false, error: "审批类型不能为空" },
        { status: 400 }
      );
    }

    // 一级审批人是必须的
    if (!level1ApproverId) {
      return NextResponse.json(
        { success: false, error: "一级审批人是必须的，请配置一级审批人" },
        { status: 400 }
      );
    }

    // 如果配置了二级审批人，则必须配置二级审批角色
    if (level2ApproverId && !level2ApproverRole) {
      return NextResponse.json(
        { success: false, error: "已配置二级审批人，请同时选择二级审批角色" },
        { status: 400 }
      );
    }

    // 如果配置了三级审批人，则必须配置三级审批角色
    if (level3ApproverId && !level3ApproverRole) {
      return NextResponse.json(
        { success: false, error: "已配置三级审批人，请同时选择三级审批角色" },
        { status: 400 }
      );
    }

    // 检查同一部门同一审批类型是否已存在
    const existingFlows = await db
      .select()
      .from(projectApprovalFlows)
      .where(
        and(
          eq(projectApprovalFlows.departmentId, departmentId || null),
          eq(projectApprovalFlows.approvalType, approvalType)
        )
      );

    if (existingFlows.length > 0) {
      return NextResponse.json(
        { success: false, error: `该部门审批类型 "${approvalType}" 的流程已存在，请勿重复创建` },
        { status: 400 }
      );
    }

    // 创建审批流程
    const newFlow = await db
      .insert(projectApprovalFlows)
      .values({
        name: name.trim() || null,
        description: description?.trim() || null,
        departmentId: departmentId || null,
        approvalType,
        isEnabled,
        level1ApproverId: level1ApproverId || null,
        level1ApproverRole: level1ApproverRole || null,
        level2ApproverId: level2ApproverId || null,
        level2ApproverRole: level2ApproverRole || null,
        level3ApproverId: level3ApproverId || null,
        level3ApproverRole: level3ApproverRole || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, data: newFlow[0] });
  } catch (error: any) {
    console.error("Error creating approval flow:", error);
    const errorMessage = error?.message || error?.toString() || "创建审批流程失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
