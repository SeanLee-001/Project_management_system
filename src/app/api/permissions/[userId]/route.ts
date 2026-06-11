import { NextRequest, NextResponse } from "next/server";
import { permissionManager } from "@/storage/database";
import { getUserFromToken } from "@/lib/auth";

// GET /api/permissions/[userId] - 获取用户的所有权限（系统管理员或admin可访问）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // 检查权限：系统管理员或admin角色可以查看用户权限
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 允许 system_admin 和 admin 角色访问
    if (currentUser.role !== "system_admin" && currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "无权限访问" },
        { status: 403 }
      );
    }

    // 将扁平化的权限数据转换为按资源分组的数据格式
    const rawPermissions = await permissionManager.getUserPermissions(userId);
    
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
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { success: false, error: "获取用户权限失败" },
      { status: 500 }
    );
  }
}

// PUT /api/permissions/[userId] - 设置用户权限（系统管理员或admin可操作）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    console.log("[PUT /api/permissions/[userId]] Request received:", { userId });
    console.log("[PUT /api/permissions/[userId]] Request headers:", Object.fromEntries(request.headers.entries()));
    console.log("[PUT /api/permissions/[userId]] Cookies:", request.cookies.getAll());

    // 检查权限：系统管理员或admin角色可以设置用户权限
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      console.log("[PUT /api/permissions/[userId]] User not authenticated");
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    console.log("[PUT /api/permissions/[userId]] Current user:", currentUser.username, currentUser.role);

    // 允许 system_admin 和 admin 角色访问
    if (currentUser.role !== "system_admin" && currentUser.role !== "admin") {
      console.log("[PUT /api/permissions/[userId]] Permission denied for user:", currentUser.role);
      return NextResponse.json(
        { success: false, error: "无权限操作" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { resource, permissions } = body;

    console.log("[PUT /api/permissions/[userId]] Request body:", { userId, resource, permissions });

    if (!resource || !Array.isArray(permissions)) {
      console.log("[PUT /api/permissions/[userId]] Invalid parameters:", { resource, permissions });
      return NextResponse.json(
        { success: false, error: "参数错误：需要 resource 和 permissions" },
        { status: 400 }
      );
    }

    const result = await permissionManager.setUserPermissions(userId, resource, permissions);
    console.log("[PUT /api/permissions/[userId]] Permissions updated successfully:", result);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[PUT /api/permissions/[userId]] Error setting user permissions:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { success: false, error: "设置用户权限失败", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/permissions/[userId] - 删除用户的所有权限（系统管理员或admin可操作）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // 检查权限：系统管理员或admin角色可以删除用户权限
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 允许 system_admin 和 admin 角色访问
    if (currentUser.role !== "system_admin" && currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "无权限操作" },
        { status: 403 }
      );
    }

    const result = await permissionManager.removeUserAllPermissions(userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error removing user permissions:", error);
    return NextResponse.json(
      { success: false, error: "删除用户权限失败" },
      { status: 500 }
    );
  }
}
