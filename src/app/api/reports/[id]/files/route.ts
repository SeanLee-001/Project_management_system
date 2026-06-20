import { NextRequest, NextResponse } from "next/server";
import { ReportManager } from "@/storage/database/reportManager";
import { randomUUID } from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const files = await ReportManager.getReportFiles(reportId);
    return NextResponse.json({ success: true, data: files });
  } catch (error: any) {
    console.error("获取报告文件列表失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "获取报告文件列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const body = await request.json();
    const { fileName, fileSize, fileUrl, mimeType } = body;

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "缺少 fileName 参数" },
        { status: 400 }
      );
    }

    const file = await ReportManager.uploadReportFile({
      id: randomUUID(),
      reportId,
      fileName,
      fileSize: fileSize || 0,
      fileUrl: fileUrl || "",
      mimeType: mimeType || "application/octet-stream",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: file });
  } catch (error: any) {
    console.error("上传报告文件失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "上传报告文件失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "缺少 fileId 参数" },
        { status: 400 }
      );
    }

    const deleted = await ReportManager.deleteReportFile(fileId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "文件不存在或删除失败" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    console.error("删除报告文件失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "删除报告文件失败" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
