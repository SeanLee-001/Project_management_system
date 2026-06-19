import { NextRequest, NextResponse } from "next/server";
import { departmentManager } from "@/storage/database/departmentManager";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const departments = await departmentManager.getActiveDepartments();
    return NextResponse.json({ success: true, data: departments });
  } catch (error) {
    console.error("获取部门列表失败:", error);
    return NextResponse.json({ success: false, error: "获取部门列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { departmentCode, departmentName, description, status } = body;

    if (!departmentCode || !departmentCode.trim()) {
      return NextResponse.json({ success: false, error: "部门代码不能为空" }, { status: 400 });
    }
    if (!departmentName || !departmentName.trim()) {
      return NextResponse.json({ success: false, error: "部门名称不能为空" }, { status: 400 });
    }

    const existing = await departmentManager.getDepartmentByCode(departmentCode.trim());
    if (existing) {
      return NextResponse.json({ success: false, error: `部门代码 ${departmentCode} 已存在` }, { status: 409 });
    }

    const validStatus = status === "inactive" ? "inactive" : "active";

    const department = await departmentManager.createDepartment({
      departmentCode: departmentCode.trim(),
      departmentName: departmentName.trim(),
      description: description || undefined,
      status: validStatus,
    });

    return NextResponse.json({ success: true, data: department }, { status: 201 });
  } catch (error) {
    console.error("创建部门失败:", error);
    return NextResponse.json({ success: false, error: "创建部门失败" }, { status: 500 });
  }
}
