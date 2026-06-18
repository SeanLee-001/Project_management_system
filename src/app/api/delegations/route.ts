import { NextRequest, NextResponse } from "next/server";
import { delegationManager } from "@/storage/database/delegationManager";
import { messageManager } from "@/storage/database/messageManager";
import { userManager } from "@/storage/database/userManager";
import { getUserFromToken } from "@/lib/auth";

// GET /api/delegations - 获取代理设置列表（支持筛选）
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const agentName = searchParams.get("agentName") || undefined;
    const approvalType = searchParams.get("approvalType") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const createdAtStart = searchParams.get("createdAtStart") || undefined;
    const createdAtEnd = searchParams.get("createdAtEnd") || undefined;

    const hasFilter = agentName || approvalType || startDate || endDate || createdAtStart || createdAtEnd;

    let delegations;
    if (hasFilter) {
      delegations = await delegationManager.search({
        delegatorId: user.id,
        agentName,
        approvalType,
        startDate,
        endDate,
        createdAtStart,
        createdAtEnd,
      });
    } else {
      delegations = await delegationManager.getByDelegator(user.id);
    }

    return NextResponse.json(delegations);
  } catch (error) {
    console.error("获取代理设置失败:", error);
    return NextResponse.json({ error: "获取代理设置失败" }, { status: 500 });
  }
}

// POST /api/delegations - 创建代理设置
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { proxyId, approvalTypes, startDate, endDate } = body;

    if (!proxyId || !approvalTypes || !startDate || !endDate) {
      return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
    }

    if (proxyId === user.id) {
      return NextResponse.json({ error: "不能将自己设置为代理人" }, { status: 400 });
    }

    if (!Array.isArray(approvalTypes) || approvalTypes.length === 0) {
      return NextResponse.json({ error: "请至少选择一种代理审批类型" }, { status: 400 });
    }

    const conflicting = await delegationManager.findConflictingTypes(
      user.id,
      approvalTypes
    );
    if (conflicting.length > 0) {
      const labels: Record<string, string> = {
        order: "订单审批",
        contract: "合同审批",
        new_project: "新增项目",
        edit_project: "编辑项目",
        delete_project: "删除项目",
      };
      const names = conflicting.map((t) => labels[t] || t).join("、");
      return NextResponse.json(
        { error: `以下审批类型已有生效中的代理人：${names}，不能重复指派` },
        { status: 400 }
      );
    }

    const delegation = await delegationManager.create({
      delegatorId: user.id,
      proxyId,
      approvalTypes,
      startDate,
      endDate,
    });

    // 通知代理人
    const proxyUser = await userManager.getUserById(proxyId);
    if (proxyUser) {
      try {
        await messageManager.sendMessageToUser({
          senderId: user.id,
          receiverId: proxyId,
          title: "代理人设置通知",
          content: `${user.fullName || user.username} 已将审批权限代理给您（${startDate} 至 ${endDate}），代理类型：${approvalTypes.join("、")}。请在审批列表查看待处理审批。`,
        });
      } catch {
        // 通知失败不影响主流程
      }
    }

    return NextResponse.json(delegation, { status: 201 });
  } catch (error) {
    console.error("创建代理设置失败:", error);
    return NextResponse.json({ error: "创建代理设置失败" }, { status: 500 });
  }
}
