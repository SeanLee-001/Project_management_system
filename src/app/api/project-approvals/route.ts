import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import {
  projectApprovals,
  projectApprovalFlows,
  messages,
  users,
  projects,
} from "@/storage/database/shared/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { messageManager } from "@/storage/database/messageManager";
import { verifyToken } from "@/lib/auth";

// 有审批权限的角色
const APPROVER_ROLES = [
  "system_admin",
  "department_manager",
  "project_management",
  "project_manager",
  "quality_management",
];

// 检查用户是否有审批权限
async function checkUserApprovalPermission(userId: string): Promise<boolean> {
  const db = await getDb();
  const userList = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userList.length === 0) {
    return false;
  }

  const user = userList[0];
  return APPROVER_ROLES.includes(user.role);
}

// GET /api/project-approvals - 获取项目审批列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const approvalType = searchParams.get("approvalType");
    const applicantId = searchParams.get("applicantId");
    const currentApproverId = searchParams.get("currentApproverId");

    // 构建查询条件
    const conditions = [];

    if (projectId) {
      conditions.push(eq(projectApprovals.projectId, projectId));
    }

    if (status) {
      conditions.push(eq(projectApprovals.status, status));
    }

    if (approvalType) {
      conditions.push(eq(projectApprovals.approvalType, approvalType));
    }

    if (applicantId) {
      conditions.push(eq(projectApprovals.applicantId, applicantId));
    }

    if (currentApproverId) {
      conditions.push(eq(projectApprovals.currentApproverId, currentApproverId));
    }

    const db = await getDb();
    let query = db
      .select()
      .from(projectApprovals)
      .orderBy(desc(projectApprovals.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const approvals = await query;

    return NextResponse.json({ success: true, data: approvals });
  } catch (error: any) {
    console.error("Error fetching project approvals:", error);
    const errorMessage = error?.message || error?.toString() || "获取项目审批列表失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/project-approvals - 创建项目审批记录
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权，请先登录" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "无效的认证信息" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      projectId,
      approvalType,
      applicantId,
      applicantName,
      currentApproverId,
      currentApproverName,
      approvalData,
    } = body;

    // 验证必填字段
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "项目 ID 不能为空" },
        { status: 400 }
      );
    }

    if (!approvalType) {
      return NextResponse.json(
        { success: false, error: "审批类型不能为空" },
        { status: 400 }
      );
    }

    if (!applicantId) {
      return NextResponse.json(
        { success: false, error: "申请人 ID 不能为空" },
        { status: 400 }
      );
    }

    // 确保 approvalData 中的 customMembers 是字符串格式
    if (approvalData && approvalData.projectData) {
      const projectData = { ...approvalData.projectData };
      
      // 如果 customMembers 是数组，序列化为字符串
      if (Array.isArray(projectData.customMembers)) {
        projectData.customMembers = JSON.stringify(projectData.customMembers);
      }
      
      // 确保日期字段是字符串或 undefined，而不是 Date 对象
      const dateFields = ['startDate', 'endDate', 'orderDate', 'deliveryDate', 'contractDate', 'createdAt', 'updatedAt'];
      dateFields.forEach(field => {
        if (projectData[field] instanceof Date) {
          projectData[field] = projectData[field].toISOString();
        } else if (typeof projectData[field] === 'string' && projectData[field]) {
          // 保持字符串格式
        } else {
          projectData[field] = undefined;
        }
      });
      
      approvalData.projectData = projectData;
    }

    if (!approvalType) {
      return NextResponse.json(
        { success: false, error: "审批类型不能为空" },
        { status: 400 }
      );
    }

    if (!applicantId) {
      return NextResponse.json(
        { success: false, error: "申请人ID不能为空" },
        { status: 400 }
      );
    }

    // 如果传入了审批人，验证审批人是否有审批权限
    if (currentApproverId) {
      const hasPermission = await checkUserApprovalPermission(currentApproverId);
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: "所选用户无审批权限" },
          { status: 400 }
        );
      }
    }

    // 创建审批记录
    const db = await getDb();

    // 检查审批流程是否存在且已启用
    const flow = await db
      .select()
      .from(projectApprovalFlows)
      .where(eq(projectApprovalFlows.approvalType, approvalType))
      .limit(1);

    if (flow.length === 0) {
      return NextResponse.json(
        { success: false, error: `审批类型"${approvalType}"未配置审批流程` },
        { status: 400 }
      );
    }

    if (!flow[0].isEnabled) {
      return NextResponse.json(
        { success: false, error: `审批类型"${approvalType}"的审批流程已停用，无法创建审批记录` },
        { status: 400 }
      );
    }

    // 获取审批流程中的审批人信息
    const approvalFlow = flow[0];

    // 验证一级审批人是否已配置（一级审批是必须的）
    if (!approvalFlow.level1ApproverId) {
      return NextResponse.json(
        { success: false, error: `审批类型"${approvalType}"的审批流程未配置一级审批人，请先在审批流程配置中设置一级审批人后再提交` },
        { status: 400 }
      );
    }

    let firstApproverId = approvalFlow.level1ApproverId;
    let firstApproverRole = approvalFlow.level1ApproverRole;

    // 如果没有设置一级审批人，使用传入的审批人
    if (!firstApproverId && currentApproverId) {
      firstApproverId = currentApproverId;
    }

    const newApproval = await db
      .insert(projectApprovals)
      .values({
        projectId,
        approvalType,
        applicantId,
        applicantName,
        currentApproverId: firstApproverId || null,
        currentApproverName: firstApproverRole || null,
        status: "pending",
        currentLevel: "level_1",
        approvalData: approvalData ? JSON.stringify(approvalData) : null,
        createdAt: new Date(),
      })
      .returning();

    // 如果项目已存在（非 "pending" ID），更新项目的审批状态
    if (projectId && projectId !== "pending") {
      await db
        .update(projects)
        .set({ approvalStatus: "pending", approvalRequestId: newApproval[0].id })
        .where(eq(projects.id, projectId));
    }

    // 发送消息通知给一级审批人
    if (firstApproverId) {
      try {
        const approvalTypeNames: Record<string, string> = {
          new_project: "新建项目",
          edit_project: "编辑项目",
          delete_project: "删除项目",
          status_change: "状态变更",
          member_change: "成员变更",
        };

        await messageManager.sendMessageToUser({
          senderId: applicantId,
          receiverId: firstApproverId,
          title: `项目审批待办 - ${approvalTypeNames[approvalType] || approvalType}`,
          content: `您有一个新的项目审批待处理：

审批类型：${approvalTypeNames[approvalType] || approvalType}
申请人：${applicantName}
项目ID：${projectId}
申请时间：${new Date().toLocaleString("zh-CN")}

请及时前往项目审批页面进行处理。`,
          relatedId: newApproval[0].id,
          relatedType: "project_approval",
        });
      } catch (error) {
        console.error("发送审批消息失败:", error);
        // 不影响审批创建，只记录错误
      }
    }

    return NextResponse.json({ success: true, data: newApproval[0] });
  } catch (error: any) {
    console.error("Error creating project approval:", error);
    const errorMessage = error?.message || error?.toString() || "创建项目审批失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
