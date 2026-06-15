import { NextRequest, NextResponse } from 'next/server';
import { taskManager } from '@/storage/database';

export async function GET(request: NextRequest) {
  try {
    const tasks = await taskManager.getTasks({});
    
    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取任务列表失败' },
      { status: 500 }
    );
  }
}
