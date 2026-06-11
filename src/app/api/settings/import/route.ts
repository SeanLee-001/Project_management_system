import { NextRequest, NextResponse } from "next/server";
import { systemManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { getUserFromToken } from "@/lib/auth";

// POST /api/settings/import - 导入系统设置（仅管理员）
export async function POST(request: NextRequest) {
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
        { success: false, error: "只有系统管理员可以导入设置" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { companyName, companyLogo, systemVersion, alertStyle } = body;

    // 验证必需字段
    if (!companyName) {
      return NextResponse.json(
        { success: false, error: "导出文件格式无效：缺少 company_name" },
        { status: 400 }
      );
    }

    // 导入设置
    await systemManager.setCompanyName(companyName);

    if (companyLogo !== undefined) {
      await systemManager.setCompanyLogo(companyLogo);
    }

    if (systemVersion !== undefined) {
      await systemManager.setSystemVersion(systemVersion);
    }

    if (alertStyle !== undefined) {
      await systemManager.setAlertStyle(alertStyle);
    }

    // 导入所有设置（如果存在）
    if (body.allSettings && Array.isArray(body.allSettings)) {
      for (const setting of body.allSettings) {
        if (setting.key && setting.value) {
          await systemManager.upsertSetting(
            setting.key,
            setting.value,
            setting.description
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "设置导入成功",
      data: {
        companyName,
        companyLogo,
        systemVersion,
        alertStyle,
      },
    });
  } catch (error) {
    console.error("Error importing settings:", error);
    return NextResponse.json(
      { success: false, error: "导入设置失败", details: String(error) },
      { status: 500 }
    );
  }
}
