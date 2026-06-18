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
    return NextResponse.json(departments);
  } catch (error) {
    console.error("获取部门列表失败:", error);
    return NextResponse.json({ error: "获取部门列表失败" }, { status: 500 });
  }
}
