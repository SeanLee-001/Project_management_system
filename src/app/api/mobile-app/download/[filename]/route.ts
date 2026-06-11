import { NextRequest, NextResponse } from "next/server";
import * as path from "path";

// 下载APK文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 验证文件名
    if (!filename || !filename.endsWith(".apk")) {
      return NextResponse.json(
        { success: false, error: "无效的文件名" },
        { status: 400 }
      );
    }

    const filepath = path.join("/tmp", filename);

    const fs = require("fs");

    // 检查文件是否存在
    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { success: false, error: "文件不存在" },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(filepath);

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("下载APK失败:", error);
    return NextResponse.json(
      { success: false, error: "下载失败" },
      { status: 500 }
    );
  }
}
