import { NextRequest, NextResponse } from "next/server";
import { projectManager } from "@/storage/database/projectManager";

// POST /api/test/simple-project - 测试简单项目创建
export async function POST() {
  try {
    const projectData = {
      name: "简单测试项目",
      description: "测试日期和自定义成员",
      status: "active",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      orderDate: "2024-01-15",
      deliveryDate: "2024-12-15",
      contractDate: "2024-01-10",
      customMembers: JSON.stringify([
        { id: "1", role: "测试角色", name: "张三", phone: "13800138000" }
      ]),
    };

    console.log("Creating simple project with data:", projectData);
    const project = await projectManager.createProject(projectData as any);

    return NextResponse.json({
      success: true,
      message: "简单项目创建成功",
      data: project,
    });
  } catch (error: any) {
    console.error("Failed to create simple project:", error);
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
