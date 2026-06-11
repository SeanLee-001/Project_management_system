import { NextRequest, NextResponse } from "next/server";
import { projectManager } from "@/storage/database/projectManager";

// POST /api/test/create-full-project - 测试完整项目创建（模拟前端请求）
export async function POST() {
  try {
    const projectData: any = {
      name: "完整测试项目",
      description: "测试完整字段",
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

    console.log("Creating project with data:", projectData);
    const project = await projectManager.createProject(projectData);

    return NextResponse.json({
      success: true,
      message: "完整项目创建成功",
      data: project,
    });
  } catch (error: any) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      {
        success: false,
        message: "创建失败",
        error: error.message,
        stack: error.stack,
        details: String(error),
      },
      { status: 500 }
    );
  }
}
