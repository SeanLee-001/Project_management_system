import { NextRequest, NextResponse } from "next/server";
import { departmentPermissionManager } from "@/storage/database/departmentPermissionManager";
import { getUserFromToken } from "@/lib/auth";

// GET /api/department-permissions/[departmentId] - 获取部门权限
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { departmentId } = await params;
    const permissions = await departmentPermissionManager.getDepartmentPermissions(departmentId);

    // 转换为按资源分组的数据格式
    const groupedPermissions: Record<string, string[]> = {};
    permissions.forEach((perm: any) => {
      if (!groupedPermissions[perm.resource]) {
        groupedPermissions[perm.resource] = [];
      }
      groupedPermissions[perm.resource].push(perm.permission);
    });

    return NextResponse.json({ success: true, data: groupedPermissions });
  } catch (error) {
    console.error("获取部门权限失败:", error);
    return NextResponse.json({ success: false, error: "获取失败" }, { status: 500 });
  }
}

// POST /api/department-permissions/[departmentId] - 设置部门权限
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { departmentId } = await params;
    const body = await request.json();
    const { permissions } = body; // permissions: Array<{ resource: string; permission: string }>

    await departmentPermissionManager.setDepartmentPermissions(
      departmentId,
      permissions
    );

    return NextResponse.json({ success: true, message: "权限设置成功" });
  } catch (error) {
    console.error("设置部门权限失败:", error);
    return NextResponse.json({ success: false, error: "设置失败" }, { status: 500 });
  }
}
