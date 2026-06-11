import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { permissionManager, type ResourceType, type PermissionType } from "@/storage/database";

// GET /api/user-permissions - 获取当前用户的权限 或 获取所有用户权限（admin）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // 如果指定了userId，获取指定用户的权限（需要admin权限）
    if (userId) {
      const currentUser = await getUserFromToken(request);
      if (!currentUser) {
        return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
      }
      
      // 获取指定用户的所有权限
      const permissions = await permissionManager.getUserPermissions(userId);
      
      // 按资源分组
      const groupedPermissions: Record<string, string[]> = {};
      for (const perm of permissions) {
        if (!groupedPermissions[perm.resource]) {
          groupedPermissions[perm.resource] = [];
        }
        groupedPermissions[perm.resource].push(perm.permission);
      }
      
      return NextResponse.json({ success: true, data: { [userId]: groupedPermissions } });
    }

    // 验证用户身份（获取当前用户权限）
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
    }

    // 系统管理员拥有所有权限
    if (user.role === "system_admin") {
      const allResources: ResourceType[] = [
        "projects",
        "tasks",
        "users",
        "customers",
        "customer_contacts",
        "contracts",
        "orders",
        "products",
        "config"
      ];

      const permissionsByResource: Record<string, string[]> = {};
      allResources.forEach(resource => {
        permissionsByResource[resource] = ["view", "edit", "delete"];
      });

      return NextResponse.json({
        success: true,
        data: {
          [user.id]: permissionsByResource,
        },
      });
    }

    // 获取普通用户的所有权限
    const permissions = await permissionManager.getUserPermissions(user.id);

    // 将权限转换为资源-权限映射
    const permissionsByResource: Record<string, string[]> = {};

    for (const perm of permissions) {
      if (!permissionsByResource[perm.resource]) {
        permissionsByResource[perm.resource] = [];
      }
      permissionsByResource[perm.resource].push(perm.permission);
    }

    return NextResponse.json({
      success: true,
      data: {
        [user.id]: permissionsByResource,
      },
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { success: false, error: "获取用户权限失败" },
      { status: 500 }
    );
  }
}

// POST /api/user-permissions - 添加用户权限
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    // 允许 system_admin 和 admin 角色操作
    if (currentUser.role !== "system_admin" && currentUser.role !== "admin") {
      return NextResponse.json({ success: false, error: "无权限操作" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, resource, permission } = body;

    if (!userId || !resource || !permission) {
      return NextResponse.json(
        { success: false, error: "参数错误：需要 userId, resource, permission" },
        { status: 400 }
      );
    }

    const result = await permissionManager.addPermission({ userId, resource, permission });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error adding permission:", error);
    return NextResponse.json(
      { success: false, error: "添加权限失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/user-permissions - 删除用户权限
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    // 允许 system_admin 和 admin 角色操作
    if (currentUser.role !== "system_admin" && currentUser.role !== "admin") {
      return NextResponse.json({ success: false, error: "无权限操作" }, { status: 403 });
    }

    let userId: string, resource: string, permission: string;
    try {
      const body = await request.json();
      userId = body.userId;
      resource = body.resource;
      permission = body.permission;
    } catch {
      return NextResponse.json(
        { success: false, error: "请求参数格式错误" },
        { status: 400 }
      );
    }

    if (!userId || !resource || !permission) {
      return NextResponse.json(
        { success: false, error: "参数错误：需要 userId, resource, permission" },
        { status: 400 }
      );
    }

    // 删除指定权限
    await permissionManager.removeUserResourcePermission(userId, resource as ResourceType, permission as PermissionType);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing permission:", error);
    return NextResponse.json(
      { success: false, error: "删除权限失败" },
      { status: 500 }
    );
  }
}
