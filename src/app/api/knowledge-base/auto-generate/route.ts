import { NextRequest, NextResponse } from 'next/server';
import { knowledgeBaseManager } from '@/storage/database/knowledgeBaseManager';

// POST /api/knowledge-base/auto-generate - 自动生成知识库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, projectId, projectName, taskId, taskTitle } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: '类型不能为空' },
        { status: 400 }
      );
    }

    let kb;

    if (type === 'project') {
      if (!projectId || !projectName) {
        return NextResponse.json(
          { success: false, error: '项目ID和项目名称不能为空' },
          { status: 400 }
        );
      }
      kb = await knowledgeBaseManager.autoGenerateForProject(
        projectId,
        projectName
        // TODO: 从session获取真实用户ID
      );
    } else if (type === 'task') {
      if (!taskId || !taskTitle) {
        return NextResponse.json(
          { success: false, error: '任务ID和任务标题不能为空' },
          { status: 400 }
        );
      }
      kb = await knowledgeBaseManager.autoGenerateForTask(
        taskId,
        taskTitle
        // TODO: 从session获取真实用户ID
      );
    } else {
      return NextResponse.json(
        { success: false, error: '无效的类型' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: kb,
    });
  } catch (error) {
    console.error('自动生成知识库失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成失败',
      },
      { status: 500 }
    );
  }
}
