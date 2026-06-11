import { NextRequest, NextResponse } from "next/server";
import { projectManager } from "@/storage/database/projectManager";

// POST /api/test/medium-project - 测试中等复杂度的项目创建
export async function POST() {
  try {
    const projectData: any = {
      name: "中等测试项目",
      description: "测试更多字段",
      status: "active",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      projectCode: "TEST001",
      orderDate: "2024-01-15",
      deliveryDate: "2024-12-15",
      quantity: "10",
      contractDate: "2024-01-10",
      customMembers: JSON.stringify([
        { id: "1", role: "测试角色", name: "张三", phone: "13800138000" }
      ]),
    };

    // 不包含空字符串字段，让它们为 undefined/null
    console.log("Creating medium project with data:", projectData);
    const project = await projectManager.createProject(projectData);

    return NextResponse.json({
      success: true,
      message: "中等项目创建成功",
      data: project,
    });
  } catch (error: any) {
    console.error("Failed to create medium project:", error);
    return NextResponse.json(
      {
        success: false,
        message: "创建失败",
        error: error?.message || "未知错误",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
