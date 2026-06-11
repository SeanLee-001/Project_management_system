import { NextRequest, NextResponse } from "next/server";
import { taskManager } from "@/storage/database";

// GET /api/projects/[id]/tasks - 获取指定项目的所有任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tasks = await taskManager.getTasks({
      filters: { projectId: id },
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error("Error fetching project tasks:", error);
    const errorMessage = error?.message || error?.toString() || "获取项目任务列表失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tasks - 为指定项目创建新任务
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log("[POST /api/projects/[id]/tasks] Request body:", body);
    console.log("[POST /api/projects/[id]/tasks] Project ID from URL:", id);

    // 验证必填字段
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "任务标题不能为空" },
        { status: 400 }
      );
    }

    // 将项目ID添加到任务数据中
    const taskData = {
      ...body,
      projectId: id,
    };

    console.log("[POST /api/projects/[id]/tasks] Task data to insert:", taskData);

    const task = await taskManager.createTask(taskData);

    console.log("[POST /api/projects/[id]/tasks] Created task:", task);

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/projects/[id]/tasks] Error:", error);
    const errorMessage = error?.message || error?.toString() || "创建任务失败";
    const errorDetails = error?.issues ? JSON.stringify(error.issues) : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
