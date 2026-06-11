import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";

// POST /api/users/[id]/reject - 审核拒绝用户
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rejectReason } = body;

    // 验证token，确保只有管理员才能审核
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权访问" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "无效的token" },
        { status: 401 }
      );
    }

    // 获取当前用户
    const currentUser = await userManager.getUserById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 检查是否为系统管理员
    if (currentUser.role !== "system_admin") {
      return NextResponse.json(
        { success: false, error: "只有系统管理员才能审核用户" },
        { status: 403 }
      );
    }

    // 获取要审核的用户
    const user = await userManager.getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 更新用户审核状态为拒绝
    const updatedUser = await userManager.updateUser(id, {
      approvalStatus: "rejected",
      approvedBy: currentUser.id,
      approvedAt: new Date(),
      rejectReason: rejectReason || "未提供拒绝原因",
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "审核失败" },
        { status: 500 }
      );
    }

    const { password, ...userWithoutPassword } = updatedUser;

    // 添加审核人信息到响应中
    const responseData = {
      ...userWithoutPassword,
      approver: {
        id: currentUser.id,
        username: currentUser.username,
        fullName: currentUser.fullName,
      },
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error rejecting user:", error);
    return NextResponse.json(
      { success: false, error: "审核失败" },
      { status: 500 }
    );
  }
}
