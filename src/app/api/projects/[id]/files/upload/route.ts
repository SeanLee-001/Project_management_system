import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { assetFiles } from "@/storage/database/shared/schema";
import { S3Storage } from "coze-coding-dev-sdk";

// 支持的文件类型
const ALLOWED_FILE_TYPES = {
  // 文档
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // 图片
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  // 压缩包
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
} as const;

const ALLOWED_MIME_TYPES = Object.values(ALLOWED_FILE_TYPES);

// POST /api/projects/[id]/files/upload - 上传文件
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string || "/";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "未提供文件" },
        { status: 400 }
      );
    }

    // 验证文件类型（基于扩展名和 MIME 类型）
    const fileNameLower = file.name.toLowerCase();
    const validExtensions = [
      ".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx",
      ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif",
      ".bmp", ".zip", ".rar", ".7z"
    ];

    const hasValidExtension = validExtensions.some(ext => fileNameLower.endsWith(ext));

    // 检查扩展名或 MIME 类型是否有效
    const isValidFileType = hasValidExtension || ALLOWED_MIME_TYPES.includes(file.type as any);

    if (!isValidFileType) {
      console.error("Invalid file type:", { fileName: file.name, fileType: file.type });
      return NextResponse.json(
        {
          success: false,
          error: `不支持的文件类型。支持的格式：PDF、Word、Excel、PPT、TXT、图片（JPG/PNG/GIF/BMP）、压缩包（ZIP/RAR/7Z）`,
        },
        { status: 400 }
      );
    }

    // 初始化 S3Storage
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    });

    // 上传文件到 S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 原始文件名（保存到数据库）
    const originalFileName = file.name;

    // 根据文件扩展名推断 MIME 类型（如果文件对象的 type 不准确）
    let contentType = file.type;
    if (!contentType || contentType === "") {
      // 根据扩展名推断 MIME 类型
      const extMap: Record<string, string> = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".zip": "application/zip",
        ".rar": "application/x-rar-compressed",
        ".7z": "application/x-7z-compressed",
      };

      for (const [ext, mime] of Object.entries(extMap)) {
        if (fileNameLower.endsWith(ext)) {
          contentType = mime;
          break;
        }
      }
    }

    // 如果仍然无法确定 MIME 类型，使用默认值
    if (!contentType) {
      contentType = "application/octet-stream";
    }

    // 提取文件扩展名
    const fileExtension = fileNameLower.match(/\.[0-9a-z]+$/)?.[0] || "";

    // 生成安全的 S3 文件名（使用 UUID + 扩展名）
    const safeFileName = `${crypto.randomUUID()}${fileExtension}`;

    // 生成 S3 key（确保路径不以 / 开头，且不包含连续的 //）
    let normalizedPath = path.startsWith("/") ? path.slice(1) : path;

    // 如果路径为空或只有/，不添加路径前缀
    let s3FileName = safeFileName;
    if (normalizedPath && normalizedPath !== "/") {
      s3FileName = `${normalizedPath}/${safeFileName}`.replace(/\/+/g, "/");
    }

    const s3Key = await storage.uploadFile({
      fileContent: buffer,
      fileName: s3FileName,
      contentType,
    });

    // 保存文件信息到数据库（使用原始文件名）
    const db = await getDb();
    const now = new Date();
    const fileRecord = {
      id: crypto.randomUUID(),
      projectId: id,
      fileName: originalFileName, // 保存原始文件名（可能包含中文）
      fileKey: s3Key, // S3 存储的安全文件名
      fileSize: String(file.size),
      fileType: contentType,
      filePath: path || "/", // 确保filePath不为空
      description: null,
      uploadedBy: null, // 可选字段，当前版本暂不记录上传人
      createdAt: now,
      updatedAt: now,
    };

    const [insertedFile] = await db.insert(assetFiles).values(fileRecord).returning();

    return NextResponse.json({ success: true, file: fileRecord });
  } catch (error) {
    console.error("Error uploading file:", error);
    const errorMessage = error instanceof Error ? error.message : "上传文件失败";
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
