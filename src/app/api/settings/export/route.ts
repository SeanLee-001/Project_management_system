import { NextRequest, NextResponse } from "next/server";
import { systemManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { getUserFromToken } from "@/lib/auth";

// GET /api/settings/export - 导出系统设置（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 检查用户是否是系统管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以导出设置" },
        { status: 403 }
      );
    }

    // 导出所有系统设置
    const settings = await systemManager.getSettings();
    const companyName = await systemManager.getCompanyName();
    const companyLogo = await systemManager.getCompanyLogo();
    const systemVersion = await systemManager.getSystemVersion();
    const alertStyle = await systemManager.getAlertStyle();

    const exportData = {
      version: "1.0.0",
      exportTime: new Date().toISOString(),
      companyName,
      companyLogo,
      systemVersion,
      alertStyle,
      allSettings: settings,
    };

    // 返回 JSON 下载
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="system-settings-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting settings:", error);
    return NextResponse.json(
      { success: false, error: "导出设置失败", details: String(error) },
      { status: 500 }
    );
  }
}
