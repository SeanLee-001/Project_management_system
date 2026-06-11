import { NextRequest, NextResponse } from "next/server";
import { userManager, loginLogManager } from "@/storage/database";
import { verifyToken, generateToken } from "@/lib/auth";
import { parseUserAgent } from "@/lib/userAgentParser";

// POST /api/auth/change-password - 修改密码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "currentPassword and newPassword are required" },
        { status: 400 }
      );
    }

    // 如果没有提供userId，则从token获取
    let targetUserId = userId;
    if (!targetUserId) {
      const token = request.cookies.get("token")?.value;
      if (!token) {
        return NextResponse.json(
          { success: false, error: "Not authenticated" },
          { status: 401 }
        );
      }

      try {
        const decoded = await verifyToken(token);
        if (!decoded || !decoded.userId) {
          return NextResponse.json(
            { success: false, error: "Invalid token" },
            { status: 401 }
          );
        }
        targetUserId = decoded.userId;
      } catch (tokenError) {
        return NextResponse.json(
          { success: false, error: "Failed to verify token" },
          { status: 401 }
        );
      }
    }

    // 查找用户
    const user = await userManager.getUserById(targetUserId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 验证当前密码
    const isValid = await userManager.verifyPassword(user, currentPassword);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // 更新密码
    const updatedUser = await userManager.updatePassword(targetUserId, newPassword);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to update password" },
        { status: 500 }
      );
    }

    // 生成新的token
    const newToken = generateToken(updatedUser.id);

    // 记录密码修改敏感操作日志
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const loginIP = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || request.headers.get("x-real-ip")
      || request.headers.get("cf-connecting-ip")
      || "127.0.0.1";
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    await loginLogManager.createLog({
      userId: updatedUser.id,
      username: updatedUser.username,
      employeeNumber: updatedUser.employeeNumber || undefined,
      fullName: updatedUser.fullName || undefined,
      loginTime: new Date(),
      ipAddress: loginIP,
      userAgent: userAgent,
      deviceType: deviceType,
      browser: browser,
      os: os,
      loginMethod: "password",
      loginStatus: "success",
      isSensitiveOperation: true,
      sensitiveOperationType: "password_changed",
    });

    const { password, ...userWithoutPassword } = updatedUser;

    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token: newToken,
      }
    });

    // 设置新的cookie
    const isSecure = process.env.FORCE_HTTPS === "true";
    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password", details: String(error) },
      { status: 500 }
    );
  }
}
