import { NextRequest, NextResponse } from 'next/server';
import { knowledgeBaseManager } from '@/storage/database/knowledgeBaseManager';
import { UserRole } from '@/storage/database/shared/schema';

// GET /api/knowledge-base/[id] - 获取知识库详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const kb = await knowledgeBaseManager.getKnowledgeBaseById(id);
    
    if (!kb) {
      return NextResponse.json(
        { success: false, error: '知识库不存在' },
        { status: 404 }
      );
    }

    // 获取附件列表
    const attachments = await knowledgeBaseManager.getAttachmentsByKnowledgeBaseId(id);

    return NextResponse.json({
      success: true,
      data: { ...kb, attachments },
    });
  } catch (error) {
    console.error('获取知识库详情失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
      },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge-base/[id] - 更新知识库（仅管理员）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // TODO: 验证用户权限，只有管理员可以编辑
    // const user = await getCurrentUser(request);
    // if (user.role !== UserRole.SYSTEM_ADMIN) {
    //   return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    // }

    const { title, content, category, tags } = body;

    const kb = await knowledgeBaseManager.updateKnowledgeBase(id, {
      title,
      content,
      category,
      tags,
      updatedBy: 'admin', // TODO: 从session获取真实用户ID
    });

    if (!kb) {
      return NextResponse.json(
        { success: false, error: '知识库不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: kb,
    });
  } catch (error) {
    console.error('更新知识库失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge-base/[id] - 删除知识库（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: 验证用户权限，只有管理员可以删除
    // const user = await getCurrentUser(request);
    // if (user.role !== UserRole.SYSTEM_ADMIN) {
    //   return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    // }

    const result = await knowledgeBaseManager.deleteKnowledgeBase(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: '知识库不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除知识库失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      },
      { status: 500 }
    );
  }
}
