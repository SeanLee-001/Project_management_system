import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// POST /api/auth/reset-password - 忘记密码后重置密码（无需旧密码验证）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPassword, confirmPassword } = body;

    // 验证必填字段
    if (!userId || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "userId, newPassword, and confirmPassword are required" },
        { status: 400 }
      );
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // 验证两次密码一致
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await userManager.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 更新密码并取消首次登录标记
    const updatedUser = await userManager.forceChangePassword(userId, newPassword);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to reset password" },
        { status: 500 }
      );
    }

    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully",
        data: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
