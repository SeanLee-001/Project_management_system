import { NextRequest, NextResponse } from "next/server";
import { userManager, loginLogManager } from "@/storage/database";
import { systemLogManager } from "@/storage/database/systemLogManager";
import { generateToken } from "@/lib/auth";
import { parseUserAgent } from "@/lib/userAgentParser";

// POST /api/auth/mac-login - 基于MAC地址的自动登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { macAddress } = body;

    if (!macAddress) {
      return NextResponse.json(
        { success: false, error: "MAC address is required" },
        { status: 400 }
      );
    }

    // 验证MAC地址格式（格式：00:11:22:33:44:55）
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid MAC address format. Expected format: 00:11:22:33:44:55" },
        { status: 400 }
      );
    }

    // 查找绑定的用户
    const user = await userManager.getUserByMacAddress(macAddress);

    if (!user) {
      // 记录MAC地址登录失败日志
      const userAgent = request.headers.get("user-agent") || "Unknown";
      const loginIP = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || request.headers.get("x-real-ip")
        || request.headers.get("cf-connecting-ip")
        || "127.0.0.1";

      await systemLogManager.createLog({
        action: "login",
        resource: "system",
        userId: null,
        username: null,
        fullName: null,
        details: JSON.stringify({ method: "mac_address", macAddress, error: "User not found" }),
        ipAddress: loginIP,
        userAgent: userAgent,
        status: "failed",
        errorMessage: "No user bound to this MAC address",
      });

      return NextResponse.json(
        { success: false, error: "No user bound to this MAC address" },
        { status: 404 }
      );
    }

    // 检查用户是否激活
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "该账号被停用不允许登录" },
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
      const rejectReason = user.rejectReason || "未知原因";
      return NextResponse.json(
        { success: false, error: `您的账户审核未通过，原因：${rejectReason}` },
        { status: 403 }
      );
    }

    // 获取客户端IP地址
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip");

    let loginIP: string | null = null;

    if (forwarded) {
      loginIP = forwarded.split(",")[0].trim();
    } else if (realIP) {
      loginIP = realIP;
    } else if (cfConnectingIP) {
      loginIP = cfConnectingIP;
    } else {
      // 开发环境或直接连接的情况
      loginIP = "127.0.0.1";
    }

    // 获取User-Agent信息
    const userAgent = request.headers.get("user-agent") || "Unknown";

    console.log(`[MAC Login] User ${user.username} logged in from IP: ${loginIP}, MAC: ${macAddress}`);

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
      loginMethod: "mac",
      loginStatus: "success",
      isSensitiveOperation: isSensitiveOperation,
      sensitiveOperationType: sensitiveOperationType || undefined,
    });

    // 更新登录信息（登录时间、终端和IP地址）
    await userManager.updateLoginInfo(user.id, userAgent, loginIP);

    // 记录MAC地址登录日志
    await systemLogManager.createLog({
      action: "login",
      resource: "system",
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      details: JSON.stringify({ method: "mac_address", macAddress }),
      ipAddress: loginIP,
      userAgent: userAgent,
      status: "success",
    });

    // 生成 token
    const token = generateToken(user.id);

    // 返回用户信息和 token
    const { password, passwordExpireAt, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: userWithoutPassword,
          token,
          message: "Successfully logged in via MAC address",
        },
      },
      { status: 200 }
    );

    // 设置 cookie
    // 根据请求协议动态设置 secure 标志
    const protocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol;
    const isSecure = protocol === "https:" || process.env.FORCE_HTTPS === "true";

    console.log(`[MAC Login] Setting cookie with secure=${isSecure}, protocol=${protocol}`);

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error logging in via MAC address:", error);
    return NextResponse.json(
      { success: false, error: "Failed to login via MAC address" },
      { status: 500 }
    );
  }
}
