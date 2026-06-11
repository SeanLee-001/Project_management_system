import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { systemSettings } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

const USER_APPROVAL_PERMISSIONS_KEY = "user_approval_permissions";

// GET /api/user-approval-permissions/[userId] - 获取指定用户的审批权限
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const db = await getDb();
    const { userId } = await params;

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

    const permissions = userPermissions[userId] || [];

    return NextResponse.json({ success: true, data: permissions });
  } catch (error: any) {
    console.error("Error fetching user approval permissions:", error);
    const errorMessage = error?.message || error?.toString() || "获取用户审批权限失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/user-approval-permissions/[userId] - 更新用户的审批权限
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const db = await getDb();
    const { userId } = await params;
    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: "权限格式错误，必须为数组" },
        { status: 400 }
      );
    }

    // 获取当前所有用户的审批权限配置
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

    // 更新指定用户的审批权限
    if (permissions.length === 0) {
      // 如果权限为空，删除该用户的权限配置
      delete userPermissions[userId];
    } else {
      userPermissions[userId] = permissions;
    }

    // 保存回 systemSettings 表
    const newPermissionsValue = JSON.stringify(userPermissions);

    if (permissionSettings.length > 0) {
      // 更新现有配置
      await db
        .update(systemSettings)
        .set({
          value: newPermissionsValue,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, USER_APPROVAL_PERMISSIONS_KEY));
    } else {
      // 创建新配置
      await db.insert(systemSettings).values({
        key: USER_APPROVAL_PERMISSIONS_KEY,
        value: newPermissionsValue,
        description: "用户审批权限配置，格式：{ userId: [approvalType1, approvalType2, ...] }",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, data: permissions });
  } catch (error: any) {
    console.error("Error updating user approval permissions:", error);
    const errorMessage = error?.message || error?.toString() || "更新用户审批权限失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
