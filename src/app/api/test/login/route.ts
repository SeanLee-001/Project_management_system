import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { generateToken } from "@/lib/auth";

// POST /api/test/login - 临时测试登录API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // 查找用户 - 支持用户名或工号
    let user = await userManager.getUserByUsername(username);

    // 如果通过用户名未找到，尝试通过工号查找
    if (!user) {
      user = await userManager.getUserByEmployeeNumber(username);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // 检查用户是否激活
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "该账号被停用不允许登录" },
        { status: 401 }
      );
    }

    // 验证密码
    const isValid = await userManager.verifyPassword(user, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // 检查用户审核状态
    if (user.approvalStatus === "pending") {
      return NextResponse.json(
        { success: false, error: "您的账户正在等待系统管理员审核，请耐心等待" },
        { status: 403 }
      );
    }

    if (user.approvalStatus === "rejected") {
      return NextResponse.json(
        { success: false, error: "您的账户审核未通过，请联系管理员" },
        { status: 403 }
      );
    }

    // 更新登录信息
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const loginIP = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || request.headers.get("x-real-ip")
      || request.headers.get("cf-connecting-ip")
      || "127.0.0.1";

    await userManager.updateLoginInfo(user.id, userAgent, loginIP);

    // 生成token
    const token = generateToken(user.id);

    // 设置token cookie
    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isFirstLogin: user.isFirstLogin,
        },
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json(
      { success: false, error: "登录失败" },
      { status: 500 }
    );
  }
}
