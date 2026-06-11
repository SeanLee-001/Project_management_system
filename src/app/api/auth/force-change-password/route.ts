import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { verifyToken, generateToken } from "@/lib/auth";

// POST /api/auth/force-change-password - 强制修改密码（首次登录）
export async function POST(request: NextRequest) {
  try {
    // 获取token并验证
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 验证token并获取用户ID
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // 获取用户信息
    const user = await userManager.getUserById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 验证当前密码
    const isValidPassword = await userManager.verifyPassword(user, currentPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // 强制修改密码（同时清除 isFirstLogin 标记）
    const updatedUser = await userManager.forceChangePassword(user.id, newPassword);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to update password" },
        { status: 500 }
      );
    }

    // 生成新的 token
    const newToken = generateToken(user.id);

    // 返回用户信息（不包含密码）和新 token
    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = updatedUser;

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: userWithoutPassword,
          token: newToken,
        },
      },
      { status: 200 }
    );

    // 设置新的 cookie
    const isSecure = request.nextUrl.protocol === "https:";
    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: isSecure, // 只在 HTTPS 时设置为 true
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error force changing password:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
}
