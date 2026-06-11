import { NextRequest, NextResponse } from "next/server";
import { departmentManager } from "@/storage/database/departmentManager";
import { getUserFromToken } from "@/lib/auth";

// GET /api/departments - 获取所有部门
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 判断是否只获取启用的部门
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const departments = activeOnly
      ? await departmentManager.getActiveDepartments()
      : await departmentManager.getAllDepartments();

    return NextResponse.json({ success: true, data: departments });
  } catch (error) {
    console.error("获取部门列表失败:", error);
    return NextResponse.json({ success: false, error: "获取失败" }, { status: 500 });
  }
}

// POST /api/departments - 创建部门
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { departmentCode, departmentName, description, status } = body;

    if (!departmentCode || !departmentName) {
      return NextResponse.json(
        { success: false, error: "部门代码和名称不能为空" },
        { status: 400 }
      );
    }

    // 检查部门代码是否已存在
    const exists = await departmentManager.isDepartmentCodeExists(departmentCode);
    if (exists) {
      return NextResponse.json(
        { success: false, error: "部门代码已存在" },
        { status: 400 }
      );
    }

    const department = await departmentManager.createDepartment({
      departmentCode,
      departmentName,
      description,
      status,
    });

    return NextResponse.json({ success: true, data: department });
  } catch (error) {
    console.error("创建部门失败:", error);
    return NextResponse.json({ success: false, error: "创建失败" }, { status: 500 });
  }
}
