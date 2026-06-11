import { NextRequest, NextResponse } from "next/server";
import { userManager, loginLogManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";
import { parseUserAgent } from "@/lib/userAgentParser";

// POST /api/user/bind-mac - 用户绑定自己的MAC地址
export async function POST(request: NextRequest) {
  try {
    // 验证token
    let token = request.cookies.get("token")?.value;
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { macAddress } = body;

    // 验证MAC地址格式
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macAddress || !macRegex.test(macAddress)) {
      return NextResponse.json(
        { success: false, error: "MAC地址格式不正确" },
        { status: 400 }
      );
    }

    // 检查MAC地址是否已被其他用户绑定
    const existingUser = await userManager.getUserByMacAddress(macAddress.toUpperCase());
    if (existingUser && existingUser.id !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: "该MAC地址已被其他用户绑定" },
        { status: 400 }
      );
    }

    // 更新用户MAC地址
    const updatedUser = await userManager.updateUser(decoded.userId, {
      macAddress: macAddress.toUpperCase()
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 记录MAC地址绑定敏感操作日志
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
      sensitiveOperationType: "mac_bound",
    });

    // 返回用户信息（不包含密码）
    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(
      {
        success: true,
        data: userWithoutPassword,
        message: "MAC地址绑定成功",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error binding MAC address:", error);
    return NextResponse.json(
      { success: false, error: "绑定MAC地址失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/bind-mac - 用户解绑自己的MAC地址
export async function DELETE(request: NextRequest) {
  try {
    // 验证token
    let token = request.cookies.get("token")?.value;
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // 解绑MAC地址
    const updatedUser = await userManager.updateUser(decoded.userId, {
      macAddress: null
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 返回用户信息（不包含密码）
    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(
      {
        success: true,
        data: userWithoutPassword,
        message: "MAC地址已解绑",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unbinding MAC address:", error);
    return NextResponse.json(
      { success: false, error: "解绑MAC地址失败" },
      { status: 500 }
    );
  }
}
