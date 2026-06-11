import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import {
  projectApprovals,
  projectApprovalSteps,
  projects,
  users,
  contracts,
} from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { projectManager } from "@/storage/database";
import { messageManager } from "@/storage/database/messageManager";

// POST /api/project-approvals/[id]/approve - 通过审批
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approverId, isSystemAdmin, comment } = body;

    // 验证必填字段
    if (!approverId) {
      return NextResponse.json(
        { success: false, error: "审批人 ID 不能为空" },
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

    // 系统管理员/超级管理员跳过所有审核流程，直接到最后一级
    let nextLevel = null;
    let finalStatus = "approved";
    
    if (isSystemAdmin) {
      // 直接到最后一级
      nextLevel = null;
      finalStatus = "approved";
    } else {
      // 正常审批流程
      if (approval.currentLevel === "level_1") {
        nextLevel = "level_2";
        finalStatus = "pending";
      } else if (approval.currentLevel === "level_2") {
        nextLevel = "level_3";
        finalStatus = "pending";
      } else if (approval.currentLevel === "level_3") {
        // 最后一级审批，直接通过
        nextLevel = null;
        finalStatus = "approved";
      }
    }

    // 使用事务
    await db.transaction(async (tx) => {
      if (isSystemAdmin) {
        // 系统管理员审批：标记所有步骤为已通过
        await tx
          .update(projectApprovalSteps)
          .set({
            status: "approved",
            comment: comment || "管理员审批通过",
            approvedAt: new Date(),
          })
          .where(
            eq(projectApprovalSteps.approvalId, id)
          );
      } else {
        // 正常审批流程：更新当前步骤状态为已通过
        await tx
          .update(projectApprovalSteps)
          .set({
            status: "approved",
            comment: comment || null,
            approvedAt: new Date(),
          })
          .where(
            eq(projectApprovalSteps.approvalId, id)
          );
      }

      // 如果有下一级，创建下一级审批步骤
      if (nextLevel) {
        // 这里应该从审批流程配置中获取下一级审批人
        // 简化处理，暂时使用默认逻辑
        // 实际应该查询 projectApprovalFlows 表
        nextApproverId = approval.applicantId; // 临时使用申请人作为下一级
        nextApproverName = approval.applicantName;

        await tx.insert(projectApprovalSteps).values({
          approvalId: id,
          level: nextLevel,
          approverId: nextApproverId,
          approverName: nextApproverName,
          status: "pending",
          createdAt: new Date(),
        });

        // 更新审批记录的当前审批人和层级
        await tx
          .update(projectApprovals)
          .set({
            currentLevel: nextLevel,
            currentApproverId: nextApproverId,
            currentApproverName: nextApproverName,
            updatedAt: new Date(),
          })
          .where(eq(projectApprovals.id, id));

        finalStatus = "pending";
      } else {
        // 审批流程结束，更新为已通过
        await tx
          .update(projectApprovals)
          .set({
            status: "approved",
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(projectApprovals.id, id));

        // 根据审批类型执行相应操作
        if (finalStatus === "approved") {
          try {
            console.log("[Approve Final] approvalType:", approval.approvalType, "projectId:", approval.projectId);
            const approvalData = approval.approvalData ? JSON.parse(approval.approvalData) : {};
            console.log("[Approve Final] approvalData keys:", Object.keys(approvalData));

            switch (approval.approvalType) {
              case "delete_project":
                // 删除项目
                await tx.delete(projects).where(eq(projects.id, approval.projectId));
                break;

              case "edit_project":
                // 更新项目
                if (approvalData.updates) {
                  // 处理日期字段，确保是有效的格式
                  const updateData: any = { updatedAt: new Date() };
                  const dateFields = ['startDate', 'endDate', 'orderDate', 'deliveryDate', 'contractDate'];
                  
                  Object.entries(approvalData.updates).forEach(([key, value]: [string, any]) => {
                    if (dateFields.includes(key)) {
                      // 日期字段特殊处理
                      if (value instanceof Date) {
                        updateData[key] = value;
                      } else if (typeof value === 'string' && value) {
                        const dateValue = new Date(value);
                        updateData[key] = isNaN(dateValue.getTime()) ? null : dateValue;
                      } else if (value === null || value === '' || value === undefined) {
                        updateData[key] = null;
                      } else {
                        // 其他类型尝试转换
                        const dateValue = new Date(value);
                        updateData[key] = isNaN(dateValue.getTime()) ? null : dateValue;
                      }
                    } else {
                      // 非日期字段直接使用
                      updateData[key] = value;
                    }
                  });
                  
                  await tx.update(projects)
                    .set(updateData)
                    .where(eq(projects.id, approval.projectId));
                  // 更新项目的审批状态
                  await tx.update(projects)
                    .set({ approvalStatus: "approved", approvalRequestId: id })
                    .where(eq(projects.id, approval.projectId));
                }
                break;

              case "status_change":
                // 更新项目状态
                if (approvalData.newStatus) {
                  await tx.update(projects)
                    .set({ status: approvalData.newStatus, updatedAt: new Date() })
                    .where(eq(projects.id, approval.projectId));
                  // 更新项目的审批状态
                  await tx.update(projects)
                    .set({ approvalStatus: "approved", approvalRequestId: id })
                    .where(eq(projects.id, approval.projectId));
                }
                break;

              case "member_change":
                // 更新项目成员
                if (approvalData.customMembers) {
                  await tx.update(projects)
                    .set({ customMembers: approvalData.customMembers, updatedAt: new Date() })
                    .where(eq(projects.id, approval.projectId));
                  // 更新项目的审批状态
                  await tx.update(projects)
                    .set({ approvalStatus: "approved", approvalRequestId: id })
                    .where(eq(projects.id, approval.projectId));
                }
                break;

              case "new_project":
                // 新建项目
                const projectData = approvalData.projectData || {};
                console.log("[New Project] Raw projectData:", JSON.stringify(projectData, null, 2));
                let processedProjectData: any = {};
                try {
                  // 处理日期字段，将字符串转换为 Date 对象
                  processedProjectData = { ...projectData };
                  console.log("[New Project] Initial processedProjectData:", JSON.stringify(processedProjectData, null, 2));
                  const dateFields = [
                    'startDate', 'endDate', 'orderDate', 'deliveryDate', 'contractDate', 'createdAt', 'updatedAt'
                  ];

                  dateFields.forEach(field => {
                    const value = processedProjectData[field];
                    // 检查字段是否存在且不为空字符串
                    if (value !== undefined && value !== null && value !== "") {
                      if (typeof value === 'string') {
                        const dateValue = new Date(value);
                        // 检查日期是否有效
                        if (!isNaN(dateValue.getTime())) {
                          processedProjectData[field] = dateValue;
                        } else {
                          // 如果日期无效，设置为 undefined
                          processedProjectData[field] = undefined;
                        }
                      } else if (value instanceof Date) {
                        // 如果已经是 Date 对象，保持不变
                        processedProjectData[field] = value;
                      } else {
                        // 其他类型，尝试转换
                        const dateValue = new Date(value);
                        if (!isNaN(dateValue.getTime())) {
                          processedProjectData[field] = dateValue;
                        } else {
                          processedProjectData[field] = undefined;
                        }
                      }
                    } else if (field === 'createdAt' || field === 'updatedAt') {
                      // 对于 createdAt 和 updatedAt，如果没有值，设置为当前时间
                      processedProjectData[field] = new Date();
                    } else {
                      // 如果字段为空字符串、null 或 undefined，设置为 undefined
                      processedProjectData[field] = undefined;
                    }
                  });
                  
                  // 确保 createdAt 和 updatedAt 存在
                  if (!processedProjectData.createdAt) {
                    processedProjectData.createdAt = new Date();
                  }
                  if (!processedProjectData.updatedAt) {
                    processedProjectData.updatedAt = new Date();
                  }
                  
                  console.log("创建项目的数据:", JSON.stringify(processedProjectData, null, 2));
                  
                  // 创建项目
                  const newProjects = await tx.insert(projects).values(processedProjectData).returning();

                  if (newProjects.length > 0) {
                    const newProjectId = newProjects[0].id;

                    // 更新审批记录的 projectId
                    await tx.update(projectApprovals)
                      .set({ projectId: newProjectId, updatedAt: new Date() })
                      .where(eq(projectApprovals.id, id));

                    // 更新项目的审批状态
                    await tx.update(projects)
                      .set({ approvalStatus: "approved", approvalRequestId: id })
                      .where(eq(projects.id, newProjectId));
                  }
                } catch (error) {
                  console.error("创建项目失败:", error);
                  console.error("错误详情:", {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    processedProjectData: JSON.stringify(processedProjectData, (key, value) =>
                      typeof value === 'bigint' ? value.toString() : value
                    )
                  });
                  throw error;
                }
                break;

              case "edit_contract":
                // 更新合同
                if (approvalData.updates && approvalData.contractId) {
                  const updateData: any = { updatedAt: new Date() };
                  Object.entries(approvalData.updates).forEach(([key, value]: [string, any]) => {
                    if (value?.new !== undefined) {
                      updateData[key] = value.new;
                    }
                  });
                  await tx.update(contracts)
                    .set(updateData)
                    .where(eq(contracts.id, approvalData.contractId));
                  // 更新合同的审批状态
                  await tx.update(contracts)
                    .set({ approvalStatus: "approved", approvalRequestId: id })
                    .where(eq(contracts.id, approvalData.contractId));
                }
                break;

              case "delete_contract":
                // 删除合同
                if (approvalData.contractId) {
                  await tx.delete(contracts).where(eq(contracts.id, approvalData.contractId));
                }
                break;

              default:
                console.warn(`未知的审批类型: ${approval.approvalType}`);
            }
          } catch (error) {
            console.error("执行审批操作失败:", error);
            // 抛出错误，使事务回滚
            throw error;
          }
        }
      }
    });

    // 获取更新后的审批记录
    const updatedApproval = await db
      .select()
      .from(projectApprovals)
      .where(eq(projectApprovals.id, id))
      .limit(1);

    // 如果审批流程结束（finalStatus === "approved"），向项目成员发送消息
    if (finalStatus === "approved" && approval.approvalType === "new_project") {
      try {
        // 获取项目信息
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.id, approval.projectId))
          .limit(1);

        if (project.length > 0 && project[0].customMembers) {
          const customMembers = JSON.parse(project[0].customMembers);

          // 遍历所有成员，发送消息
          for (const member of customMembers) {
            if (member.id) {
              // 检查是否是系统用户
              const userList = await db
                .select()
                .from(users)
                .where(eq(users.id, member.id))
                .limit(1);

              if (userList.length > 0) {
                // 是系统用户，发送消息
                await messageManager.sendMessageToUser({
                  senderId: approval.applicantId,
                  receiverId: member.id,
                  title: `项目审批通过通知 - ${project[0].name}`,
                  content: `您好，

项目 ${project[0].name} 审批已通过，您已被分配到该项目。

项目编号：${project[0].projectCode || '-'}
项目状态：${project[0].status}

您可以点击下方按钮查看项目详情。`,
                  relatedId: project[0].id,
                  relatedType: "project",
                });
              }
            }
          }
        }

        // 向申请人发送消息通知项目已创建
        await messageManager.sendMessageToUser({
          senderId: "system",
          receiverId: approval.applicantId,
          title: `项目创建成功 - ${project[0].name}`,
          content: `您的项目 ${project[0].name} 已通过审批并成功创建。

项目编号：${project[0].projectCode || '-'}
您可以点击下方按钮查看项目详情。`,
          relatedId: project[0].id,
          relatedType: "project",
        });
      } catch (error) {
        console.error("发送项目成员通知失败:", error);
        // 不影响审批结果
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedApproval[0],
      message: finalStatus === "approved" ? "审批已通过" : "已提交下一级审批",
    });
  } catch (error: any) {
    console.error("Error approving project approval:", error);
    console.error("错误详情:", {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      where: error?.where,
      schema: error?.schema,
      table: error?.table,
      column: error?.column,
    });
    const errorMessage = error?.message || error?.toString() || "审批失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: error?.message },
      { status: 500 }
    );
  }
}
