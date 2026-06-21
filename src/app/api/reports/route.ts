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

    const transformed = {
      ...result,
      data: result.data.map(transformReport),
    };

    return NextResponse.json({ success: true, ...transformed });
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
