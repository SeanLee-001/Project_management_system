import { NextRequest, NextResponse } from "next/server";
import { departmentManager } from "@/storage/database/departmentManager";
import { getUserFromToken } from "@/lib/auth";

// GET /api/departments/[id] - 获取部门详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const department = await departmentManager.getDepartmentById(id);

    if (!department) {
      return NextResponse.json({ success: false, error: "部门不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: department });
  } catch (error) {
    console.error("获取部门详情失败:", error);
    return NextResponse.json({ success: false, error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/departments/[id] - 更新部门
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { departmentCode, departmentName, description, status } = body;

    // 如果更新了部门代码，检查是否已存在
    if (departmentCode) {
      const exists = await departmentManager.isDepartmentCodeExists(
        departmentCode,
        id
      );
      if (exists) {
        return NextResponse.json(
          { success: false, error: "部门代码已存在" },
          { status: 400 }
        );
      }
    }

    const department = await departmentManager.updateDepartment(id, {
      departmentCode,
      departmentName,
      description,
      status,
    });

    return NextResponse.json({ success: true, data: department });
  } catch (error) {
    console.error("更新部门失败:", error);
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/departments/[id] - 删除部门
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    await departmentManager.deleteDepartment(id);

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("删除部门失败:", error);
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
