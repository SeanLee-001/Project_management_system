import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// POST /api/auth/forgot-password - 验证用户名和邮箱（用于忘记密码场景）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email } = body;

    console.log(`[Forgot Password] Verification attempt - username: ${username}, email: ${email}`);

    // 验证必填字段
    if (!username || !email) {
      return NextResponse.json(
        { success: false, error: "用户名和邮箱是必填项" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await userManager.getUserByUsername(username);

    // 用户不存在
    if (!user) {
      console.log(`[Forgot Password] User not found - username: ${username}`);
      return NextResponse.json(
        { success: false, error: "用户名不存在" },
        { status: 404 }
      );
    }

    // 邮箱不匹配
    if (user.email !== email) {
      console.log(`[Forgot Password] Email mismatch - expected: ${user.email}, provided: ${email}`);
      return NextResponse.json(
        {
          success: false,
          error: "邮箱与注册时不一致，请确认您输入的邮箱是否正确"
        },
        { status: 404 }
      );
    }

    // 验证成功，返回用户信息（不含密码）
    const { password, passwordExpireAt, ...userWithoutSensitiveData } = user;

    console.log(`[Forgot Password] Verification successful - username: ${username}`);

    return NextResponse.json(
      {
        success: true,
        message: "身份验证成功",
        data: userWithoutSensitiveData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying user:", error);
    return NextResponse.json(
      { success: false, error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}
