import { NextRequest, NextResponse } from 'next/server';
import { knowledgeBaseManager } from '@/storage/database/knowledgeBaseManager';
import { S3Storage } from 'coze-coding-dev-sdk';

// GET /api/knowledge-base/[id]/attachments - 获取知识库附件列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attachments = await knowledgeBaseManager.getAttachmentsByKnowledgeBaseId(id);

    return NextResponse.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    console.error('获取附件列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
      },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-base/[id]/attachments - 上传附件（仅管理员）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: 验证用户权限，只有管理员可以上传附件
    // const user = await getCurrentUser(request);
    // if (user.role !== UserRole.SYSTEM_ADMIN) {
    //   return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
    // }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: '不支持的文件类型，仅支持 PDF、PPT、PPTX、XLS、XLSX、DOC、DOCX' },
        { status: 400 }
      );
    }

    // 生成文件名：knowledge-base/知识库ID/UUID_原文件名
    const fileName = `knowledge-base/${id}/${file.name}`;

    // 初始化 S3Storage
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    // 读取文件内容
    const fileBuffer = await file.arrayBuffer();

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: Buffer.from(fileBuffer),
      fileName,
      contentType: fileType,
    });

    // 生成签名 URL
    const fileUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400, // 1天有效期
    });

    // 保存附件记录
    const attachment = await knowledgeBaseManager.uploadAttachment({
      knowledgeBaseId: id,
      fileName: file.name,
      fileUrl,
      fileSize: file.size.toString(),
      fileType: getFileTypeLabel(fileType),
      uploadedBy: 'admin', // TODO: 从session获取真实用户ID
    });

    return NextResponse.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    console.error('上传附件失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '上传失败',
      },
      { status: 500 }
    );
  }
}

// 辅助函数：获取文件类型标签
function getFileTypeLabel(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return typeMap[mimeType] || 'other';
}
