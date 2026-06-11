import { NextRequest, NextResponse } from "next/server";
import { userManager, loginLogManager } from "@/storage/database";
import { systemLogManager } from "@/storage/database/systemLogManager";
import { generateToken } from "@/lib/auth";
import { parseUserAgent } from "@/lib/userAgentParser";

// POST /api/auth/login - 用户登录
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
      // 记录登录失败日志
      const userAgent = request.headers.get("user-agent") || "Unknown";
      const loginIP = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || request.headers.get("x-real-ip")
        || request.headers.get("cf-connecting-ip")
        || "127.0.0.1";

      await systemLogManager.createLog({
        action: "login",
        resource: "system",
        userId: null,
        username: username,
        fullName: null,
        details: JSON.stringify({ error: "User not found" }),
        ipAddress: loginIP,
        userAgent: userAgent,
        status: "failed",
        errorMessage: "User not found",
      });

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
      // 记录登录失败日志
      const userAgent = request.headers.get("user-agent") || "Unknown";
      const loginIP = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || request.headers.get("x-real-ip")
        || request.headers.get("cf-connecting-ip")
        || "127.0.0.1";

      await systemLogManager.createLog({
        action: "login",
        resource: "system",
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        details: JSON.stringify({ error: "Invalid password" }),
        ipAddress: loginIP,
        userAgent: userAgent,
        status: "failed",
        errorMessage: "Invalid password",
      });

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

    // 解析用户代理
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // 获取上次登录信息，检测IP变更
    const lastLoginLog = await loginLogManager.getLastLoginByUser(user.id);
    const previousIP = lastLoginLog?.ipAddress;
    const isIPChanged = previousIP && previousIP !== loginIP;

    // 检测是否为敏感操作
    const isSensitiveOperation = !!isIPChanged;
    let sensitiveOperationType: string | null = null;
    if (isIPChanged) {
      sensitiveOperationType = "ip_changed";
    }

    // 记录登录日志
    await loginLogManager.createLog({
      userId: user.id,
      username: user.username,
      employeeNumber: user.employeeNumber || undefined,
      fullName: user.fullName || undefined,
      loginTime: new Date(),
      ipAddress: loginIP,
      previousIpAddress: previousIP || undefined,
      userAgent: userAgent,
      deviceType: deviceType,
      browser: browser,
      os: os,
      loginMethod: "password",
      loginStatus: "success",
      isSensitiveOperation: isSensitiveOperation,
      sensitiveOperationType: sensitiveOperationType || undefined,
    });

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

    const cookieOptions: any = {
      httpOnly: true,
      secure: false, // 开发环境设置为 false
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    };

    // 开发环境下不设置 domain，让浏览器自动处理
    if (process.env.NODE_ENV === "production") {
      cookieOptions.secure = true;
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    // 清除旧的 cookie（如果存在）
    response.cookies.delete("token");
    // 设置新的 cookie
    response.cookies.set("token", token, cookieOptions);

    console.log("[Login] Cookie set successfully:", { token: token.substring(0, 20) + "...", options: cookieOptions });

    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json(
      { success: false, error: "登录失败" },
      { status: 500 }
    );
  }
}
