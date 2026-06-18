import { NextRequest, NextResponse } from "next/server";
import { delegationManager } from "@/storage/database/delegationManager";
import { getUserFromToken } from "@/lib/auth";

// PUT /api/delegations/[id] - 更新代理设置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await delegationManager.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "代理设置不存在" }, { status: 404 });
    }

    if (existing.delegatorId !== user.id) {
      return NextResponse.json({ error: "无权限修改" }, { status: 403 });
    }

    const body = await request.json();
    const { proxyId, approvalTypes, startDate, endDate } = body;

    if (proxyId && proxyId === user.id) {
      return NextResponse.json({ error: "不能将自己设置为代理人" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (proxyId !== undefined) updateData.proxyId = proxyId;
    if (approvalTypes !== undefined) {
      if (!Array.isArray(approvalTypes) || approvalTypes.length === 0) {
        return NextResponse.json({ error: "请至少选择一种代理审批类型" }, { status: 400 });
      }
      // 检查是否与其他生效代理冲突（排除自身）
      const conflicting = await delegationManager.findConflictingTypes(
        existing.delegatorId,
        approvalTypes,
        id
      );
      if (conflicting.length > 0) {
        const labels: Record<string, string> = {
          order: "订单审批",
          contract: "合同审批",
          new_project: "新增项目",
          edit_project: "编辑项目",
          delete_project: "删除项目",
        };
        const names = conflicting.map((t: string) => labels[t] || t).join("、");
        return NextResponse.json(
          { error: `以下审批类型已有生效中的代理人：${names}，不能重复指派` },
          { status: 400 }
        );
      }
      updateData.approvalTypes = approvalTypes;
    }
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;

    const result = await delegationManager.update(id, updateData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("更新代理设置失败:", error);
    return NextResponse.json({ error: "更新代理设置失败" }, { status: 500 });
  }
}

// DELETE /api/delegations/[id] - 取消代理设置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await delegationManager.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "代理设置不存在" }, { status: 404 });
    }

    if (existing.delegatorId !== user.id) {
      return NextResponse.json({ error: "无权限取消" }, { status: 403 });
    }

    await delegationManager.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("取消代理设置失败:", error);
    return NextResponse.json({ error: "取消代理设置失败" }, { status: 500 });
  }
}
