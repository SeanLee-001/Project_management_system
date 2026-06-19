import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { projectApprovalFlows, users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

/**
 * 数据库迁移：初始化项目审批流程配置
 *
 * 运行此脚本后，将在 project_approval_flows 表中插入项目相关的审批流程
 */
export async function POST(_request: NextRequest) {
  try {
    const db = await getDb();

    // 检查是否已存在项目审批流程
    const existingFlows = await db
      .select()
      .from(projectApprovalFlows);
    
    const hasNewProjectFlow = existingFlows.some(flow => flow.approvalType === 'new_project');

    if (hasNewProjectFlow) {
      return NextResponse.json({
        success: true,
        message: "项目审批流程已存在",
        data: existingFlows.filter(f => f.approvalType === 'new_project'),
      });
    }

    // 查找系统管理员用户作为默认审批人
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "system_admin" as any))
      .limit(1);

    const defaultLevel1ApproverId = adminUsers.length > 0 ? adminUsers[0].id : null;
    const defaultLevel1ApproverRole = "system_admin";
    const defaultLevel2ApproverRole = "project_manager";
    const defaultLevel3ApproverRole = "department_manager";

    if (!defaultLevel1ApproverId) {
      return NextResponse.json(
        { success: false, error: "未找到系统管理员用户，请先创建管理员账户" },
        { status: 400 }
      );
    }

    // 项目审批流程配置
    const projectFlows = [
      {
        name: "新建项目审批流程",
        description: "新建项目时需要进行审批",
        approvalType: "new_project",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "编辑项目审批流程",
        description: "编辑项目时需要进行审批",
        approvalType: "edit_project",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "删除项目审批流程",
        description: "删除项目时需要进行审批",
        approvalType: "delete_project",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "项目状态变更审批流程",
        description: "变更项目状态时需要进行审批",
        approvalType: "status_change",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "项目成员变更审批流程",
        description: "变更项目成员时需要进行审批",
        approvalType: "member_change",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
    ];

    // 批量插入项目审批流程
    await db.insert(projectApprovalFlows).values(projectFlows);

    return NextResponse.json({
      success: true,
      message: "迁移成功：已添加项目审批流程配置",
      data: {
        flowsAdded: projectFlows.length,
      },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "迁移失败",
      },
      { status: 500 }
    );
  }
}
