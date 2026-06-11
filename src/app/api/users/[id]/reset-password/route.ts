import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { getUserFromToken, isSystemAdmin } from "@/lib/auth";

// POST /api/users/[id]/reset-password - 重置用户密码（仅系统管理员）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // 检查权限：只有系统管理员可以重置其他用户的密码
    const currentUser = await getUserFromToken(request);

    if (!currentUser || !isSystemAdmin(currentUser)) {
      return NextResponse.json(
        { success: false, error: "无权限操作" },
        { status: 403 }
      );
    }

    // 获取要重置密码的用户
    const user = await userManager.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 检查是否尝试重置自己的密码
    if (currentUser && user.id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: "不能重置自己的密码，请使用修改密码功能" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newPassword } = body;

    // 验证新密码
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "新密码至少需要6个字符" },
        { status: 400 }
      );
    }

    // 重置密码
    const updatedUser = await userManager.updatePassword(userId, newPassword);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "重置密码失败" },
        { status: 500 }
      );
    }

    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error("Error resetting user password:", error);
    return NextResponse.json(
      { success: false, error: "重置密码失败" },
      { status: 500 }
    );
  }
}
