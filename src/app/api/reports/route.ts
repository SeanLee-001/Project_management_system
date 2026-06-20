import { NextRequest, NextResponse } from "next/server";
import { ReportManager } from "@/storage/database/reportManager";
import { ReportDataAggregator } from "@/lib/report-aggregator";
import { generateMarkdownReport } from "@/lib/report-template-engine";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const projectId = sp.get("projectId");
    const page = sp.get("page") ? parseInt(sp.get("page")!) : 1;
    const pageSize = sp.get("pageSize") ? parseInt(sp.get("pageSize")!) : 20;
    const dateFrom = sp.get("dateFrom") || undefined;
    const dateTo = sp.get("dateTo") || undefined;

    const result = await ReportManager.getReportList({
      projectId: projectId || undefined,
      page,
      pageSize,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("获取报告列表失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "获取报告列表失败" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
