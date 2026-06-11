import { NextRequest, NextResponse } from "next/server";
import { permissionManager } from "@/storage/database";
import { getUserFromToken } from "@/lib/auth";

// GET /api/permissions/my - 获取当前登录用户的权限（任何登录用户可访问）
export async function GET(request: NextRequest) {
  try {
    // 获取当前登录用户
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 将扁平化的权限数据转换为按资源分组的数据格式
    const rawPermissions = await permissionManager.getUserPermissions(currentUser.id);
    
    // 按资源分组
    const groupedPermissions: Record<string, string[]> = {};
    rawPermissions.forEach((perm: any) => {
      if (!groupedPermissions[perm.resource]) {
        groupedPermissions[perm.resource] = [];
      }
      groupedPermissions[perm.resource].push(perm.permission);
    });
    
    return NextResponse.json({ success: true, data: groupedPermissions });
  } catch (error) {
    console.error("Error fetching current user permissions:", error);
    return NextResponse.json(
      { success: false, error: "获取权限失败" },
      { status: 500 }
    );
  }
}
