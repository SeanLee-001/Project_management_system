import { NextRequest, NextResponse } from 'next/server';
import { taskManager, projectManager } from '@/storage/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    let tasks = [];
    if (projectId) {
      tasks = await taskManager.getTasks({ projectId });
    } else {
      tasks = await taskManager.getTasks({});
    }
    
    const projects = await projectManager.getProjects({});

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        projects,
      },
    });
  } catch (error: any) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取任务列表失败' },
      { status: 500 }
    );
  }
}
