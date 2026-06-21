import { NextRequest, NextResponse } from "next/server";
import { ReportManager } from "@/storage/database/reportManager";

function transformReport(r: any) {
  const config = (r.config && typeof r.config === "object") ? r.config : {};
  return {
    ...r,
    description: r.description || config.description || "",
    type: r.type || config.type || "comprehensive",
    status: r.status || config.status || "published",
    format: r.format || config.format || "markdown",
    generatedBy: r.generatedBy || config.generatedBy || r.createdBy || "",
    generatedAt: r.generatedAt || config.generatedAt || r.createdAt || "",
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await ReportManager.getReportById(id);

    if (!report) {
      return NextResponse.json(
        { success: false, error: "报告不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transformReport(report) });
  } catch (error: any) {
    console.error("获取报告详情失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "获取报告详情失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await ReportManager.deleteReport(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "报告不存在或删除失败" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    console.error("删除报告失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "删除报告失败" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
