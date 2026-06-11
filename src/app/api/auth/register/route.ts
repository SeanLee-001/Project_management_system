import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// POST /api/auth/register - 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, fullName, role, phone } = body;

    // 验证必填字段
    if (!username || !email || !password || !phone) {
      return NextResponse.json(
        { success: false, error: "Username, email, password and phone are required" },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // 验证手机号格式（简单的11位数字验证）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // 禁止注册系统管理员角色
    if (role === "system_admin") {
      return NextResponse.json(
        { success: false, error: "新注册用户不能注册系统管理员角色" },
        { status: 403 }
      );
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await userManager.getUserByUsername(username);
    if (existingUserByUsername) {
      return NextResponse.json(
        { success: false, error: "Username already exists" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await userManager.getUserByEmail(email);
    if (existingUserByEmail) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 400 }
      );
    }

    // 创建新用户（默认为待审核状态）
    const newUser = await userManager.createUser({
      username,
      email,
      password,
      fullName: fullName || username,
      role: role || "project_member",
      isActive: true,
      phone, // 添加phone字段
    });

    // 返回用户信息（不包含密码）
    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      {
        success: true,
        data: {
          user: userWithoutPassword,
        },
        message: "注册成功，请等待系统管理员审核",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register user" },
      { status: 500 }
    );
  }
}
