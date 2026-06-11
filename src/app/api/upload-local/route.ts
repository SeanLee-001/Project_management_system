import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import path from "path";

// POST /api/upload-local - 本地上传文件 (用于系统 Logo 等)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "只支持 JPEG、PNG、GIF、WebP 格式" },
        { status: 400 }
      );
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "文件大小不能超过 5MB" },
        { status: 400 }
      );
    }

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = file.name.split(".").pop() || "png";
    const fileName = `logo_${timestamp}_${randomStr}.${ext}`;
    const filePath = join(uploadDir, fileName);

    // 转换并保存文件
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // 返回公共可访问的 URL
    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        url: publicUrl,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("Error uploading file locally:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "上传失败",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
