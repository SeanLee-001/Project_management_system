import { NextRequest, NextResponse } from "next/server";
import { taskManager } from "@/storage/database";

// GET /api/tasks - 获取所有任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;

    const tasks = await taskManager.getTasks({
      filters: projectId
        ? { projectId, ...(status && { status }) }
        : status
        ? { status }
        : undefined,
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    const errorMessage = error?.message || error?.toString() || "获取任务列表失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/tasks - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "任务标题不能为空" },
        { status: 400 }
      );
    }
    if (!body.projectId) {
      return NextResponse.json(
        { success: false, error: "项目ID不能为空" },
        { status: 400 }
      );
    }

    const task = await taskManager.createTask(body);

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating task:", error);
    const errorMessage = error?.message || error?.toString() || "创建任务失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
