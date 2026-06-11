import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { systemSettings, users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

const USER_APPROVAL_PERMISSIONS_KEY = "user_approval_permissions";

// GET /api/user-approval-permissions - 获取所有用户的审批权限
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    // 从 systemSettings 表获取用户审批权限配置
    const permissionSettings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, USER_APPROVAL_PERMISSIONS_KEY))
      .limit(1);

    let userPermissions: Record<string, string[]> = {};

    if (permissionSettings.length > 0) {
      try {
        userPermissions = JSON.parse(permissionSettings[0].value);
      } catch (error) {
        console.error("Error parsing user approval permissions:", error);
        userPermissions = {};
      }
    }

    return NextResponse.json({ success: true, data: userPermissions });
  } catch (error: any) {
    console.error("Error fetching user approval permissions:", error);
    const errorMessage = error?.message || error?.toString() || "获取用户审批权限失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
