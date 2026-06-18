import { NextRequest, NextResponse } from "next/server";
import { approvalManager } from "@/storage/database/approvalManager";
import { messageManager } from "@/storage/database/messageManager";
import { userManager } from "@/storage/database/userManager";
import { delegationManager } from "@/storage/database/delegationManager";

// GET /api/approvals - 获取审批列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestType = searchParams.get("requestType");
    const status = searchParams.get("status");
    const approverId = searchParams.get("approverId");
    const applicantId = searchParams.get("applicantId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let approvals;
    if (approverId) {
      // 获取指定审批人的待审批列表
      approvals = await approvalManager.getByApproverId(approverId);
      // 同时获取代理人身份下的审批
      const activeProxies = await delegationManager.getActiveProxiesForApprover(approverId);
      for (const proxy of activeProxies) {
        const delegatedApprovals = await approvalManager.getByApproverId(proxy.delegatorId);
        // 过滤：只包含匹配代理审批类型的审批
        const matchingTypes = proxy.approvalTypes as string[];
        const filtered = delegatedApprovals.filter((a: any) => matchingTypes.includes(a.requestType));
        approvals.push(...filtered);
      }
    } else if (status) {
      // 获取指定状态的审批列表
      approvals = await approvalManager.getByStatus(status);
    } else if (requestType) {
      // 获取指定类型的审批列表
      approvals = await approvalManager.getByRequestType(requestType);
    } else if (applicantId || startDate || endDate) {
      // 高级查询
      approvals = await approvalManager.advancedSearch({
        requestType: requestType || undefined,
        status: status || undefined,
        applicantId: applicantId || undefined,
        approverId: approverId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } else {
      // 获取所有审批
      approvals = await approvalManager.getAll();
    }

    return NextResponse.json({
      success: true,
      data: approvals,
    });
  } catch (error: any) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "获取审批列表失败",
      },
      { status: 500 }
    );
  }
}

// POST /api/approvals - 创建审批申请
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { requestType, requestId, title, content, applicantId, applicantName, currentApproverId, currentApproverName, totalSteps, relatedData } = body;

    // 验证必填字段
    if (!requestType || !requestId || !title || !applicantId || !applicantName || !currentApproverId || !currentApproverName) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必填字段",
        },
        { status: 400 }
      );
    }

    // 创建审批申请
    const approval = await approvalManager.create({
      requestType,
      requestId,
      title,
      content,
      applicantId,
      applicantName,
      currentApproverId,
      currentApproverName,
      totalSteps,
      relatedData,
    });

    // 发送消息通知给审批人
    try {
      const approver = await userManager.getUserById(currentApproverId);
      if (approver) {
        await messageManager.sendMessageToUser({
          senderId: applicantId,
          receiverId: currentApproverId,
          title: `待审批：${title}`,
          content: `${applicantName} 提交了审批申请：${title}\n\n${content || ""}`,
          relatedId: approval.id,
          relatedType: "approval",
        });
      }
    } catch (msgError) {
      console.error("发送审批通知消息失败:", msgError);
      // 消息发送失败不影响审批创建
    }

    return NextResponse.json({
      success: true,
      data: approval,
    });
  } catch (error: any) {
    console.error("Error creating approval:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "创建审批申请失败",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/approvals - 清除待审批记录（管理员功能）
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { status } = body;
    
    if (status !== 'pending') {
      return NextResponse.json({ error: '只能清除待审批记录' }, { status: 400 });
    }
    
    // 删除所有待审批记录
    const success = await approvalManager.deleteByStatus('pending');
    
    return NextResponse.json({ 
      success: true, 
      count: success 
    });
    
  } catch (error: any) {
    console.error('清除待审批记录失败:', error);
    return NextResponse.json(
      { error: error?.message || '清除失败' }, 
      { status: 500 }
    );
  }
}
