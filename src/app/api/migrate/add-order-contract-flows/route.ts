import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { projectApprovalFlows } from "@/storage/database/shared/schema";

/**
 * 数据库迁移：添加订单和合同审批流程配置
 *
 * 运行此脚本后，将在 project_approval_flows 表中插入以下审批流程：
 * - new_order: 新建订单审批
 * - edit_order: 编辑订单审批
 * - delete_order: 删除订单审批
 * - new_contract: 新建合同审批
 * - edit_contract: 编辑合同审批
 * - delete_contract: 删除合同审批
 *
 * 默认配置：
 * - 一级审批人：管理员（用户ID为'1'）
 * - 二级审批人：项目经理
 * - 三级审批人：部门经理
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查迁移是否已执行
    const existingFlow = await db
      .select()
      .from(projectApprovalFlows)
      .where(sql`approval_type = 'new_order'`);

    if (existingFlow.length > 0) {
      return NextResponse.json({
        success: true,
        message: "迁移已执行过，无需重复执行",
      });
    }

    // 默认审批人配置
    const defaultLevel1ApproverId = "1"; // 管理员
    const defaultLevel1ApproverRole = "system_admin";
    const defaultLevel2ApproverRole = "project_manager"; // 项目经理
    const defaultLevel3ApproverRole = "department_manager"; // 部门经理

    // 插入订单审批流程
    const orderFlows = [
      {
        name: "新建订单审批流程",
        description: "新建订单时需要进行审批",
        approvalType: "new_order",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "编辑订单审批流程",
        description: "编辑订单时需要进行审批",
        approvalType: "edit_order",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "删除订单审批流程",
        description: "删除订单时需要进行审批",
        approvalType: "delete_order",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
    ];

    // 插入合同审批流程
    const contractFlows = [
      {
        name: "新建合同审批流程",
        description: "新建合同时需要进行审批",
        approvalType: "new_contract",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "编辑合同审批流程",
        description: "编辑合同时需要进行审批",
        approvalType: "edit_contract",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
      {
        name: "删除合同审批流程",
        description: "删除合同时需要进行审批",
        approvalType: "delete_contract",
        isEnabled: true,
        level1ApproverId: defaultLevel1ApproverId,
        level1ApproverRole: defaultLevel1ApproverRole,
        level2ApproverId: null,
        level2ApproverRole: defaultLevel2ApproverRole,
        level3ApproverId: null,
        level3ApproverRole: defaultLevel3ApproverRole,
      },
    ];

    // 批量插入订单审批流程
    await db.insert(projectApprovalFlows).values(orderFlows);

    // 批量插入合同审批流程
    await db.insert(projectApprovalFlows).values(contractFlows);

    return NextResponse.json({
      success: true,
      message: "迁移成功：已添加订单和合同审批流程配置",
      data: {
        orderFlowsAdded: orderFlows.length,
        contractFlowsAdded: contractFlows.length,
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

// 导入 sql 函数
import { sql } from "drizzle-orm";
