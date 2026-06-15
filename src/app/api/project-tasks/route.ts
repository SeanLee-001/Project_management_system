import { NextRequest, NextResponse } from 'next/server';
import { taskManager, projectManager } from '@/storage/database';
import { logger } from '@/lib/logger';

const MODULE = 'project-tasks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    const tasks = await taskManager.getTasks(projectId ? { filters: { projectId } } : {});
    const projects = await projectManager.getProjects({});

    return NextResponse.json({
      success: true,
      data: { tasks, projects },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取任务列表失败';
    logger.error(MODULE, message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
