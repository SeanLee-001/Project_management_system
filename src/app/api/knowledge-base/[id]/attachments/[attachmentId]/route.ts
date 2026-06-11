import { NextRequest, NextResponse } from 'next/server';
import { knowledgeBaseManager } from '@/storage/database/knowledgeBaseManager';
import { UserRole } from '@/storage/database/shared/schema';

// DELETE /api/knowledge-base/[id]/attachments/[attachmentId] - 删除附件（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;
    // TODO: 验证用户权限，只有管理员可以删除附件
    // const user = await getCurrentUser(request);
    // if (user.role !== UserRole.SYSTEM_ADMIN) {
    //   return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    // }

    const result = await knowledgeBaseManager.deleteAttachment(attachmentId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: '附件不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除附件失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      },
      { status: 500 }
    );
  }
}
