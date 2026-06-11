import { NextRequest, NextResponse } from "next/server";
import { systemManager } from "@/storage/database";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { verifyToken, getUserFromToken } from "@/lib/auth";

// GET /api/settings - 获取系统设置
export async function GET(request: NextRequest) {
  try {
    const companyName = await systemManager.getCompanyName();
    const companyLogo = await systemManager.getCompanyLogo();
    const systemVersion = await systemManager.getSystemVersion();
    const alertStyle = await systemManager.getAlertStyle();

    return NextResponse.json({
      success: true,
      data: {
        companyName,
        companyLogo,
        systemVersion,
        alertStyle,
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings", details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/settings - 更新系统设置（仅管理员）
export async function PUT(request: NextRequest) {
  try {
    // 从cookie中获取token
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 验证token并获取用户信息
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // 从数据库获取用户信息
    const user = await userManager.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 401 }
      );
    }

    // 检查用户是否是系统管理员
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以修改系统设置" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { companyName, companyLogo, systemVersion, alertStyle } = body;

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: "companyName is required" },
        { status: 400 }
      );
    }

    // 更新公司名称
    await systemManager.setCompanyName(companyName);

    // 更新公司logo（如果提供了）
    if (companyLogo !== undefined) {
      await systemManager.setCompanyLogo(companyLogo);
    }

    // 更新系统版本号（如果提供了）
    if (systemVersion !== undefined) {
      await systemManager.setSystemVersion(systemVersion);
    }

    // 更新系统提示风格（如果提供了）
    if (alertStyle !== undefined) {
      await systemManager.setAlertStyle(alertStyle);
    }

    const updatedCompanyName = await systemManager.getCompanyName();
    const updatedCompanyLogo = await systemManager.getCompanyLogo();
    const updatedSystemVersion = await systemManager.getSystemVersion();
    const updatedAlertStyle = await systemManager.getAlertStyle();

    return NextResponse.json({
      success: true,
      data: {
        companyName: updatedCompanyName,
        companyLogo: updatedCompanyLogo,
        systemVersion: updatedSystemVersion,
        alertStyle: updatedAlertStyle,
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings", details: String(error) },
      { status: 500 }
    );
  }
}
