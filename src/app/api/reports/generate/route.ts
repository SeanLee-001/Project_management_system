import { NextRequest, NextResponse } from "next/server";
import { ReportManager } from "@/storage/database/reportManager";
import { ReportDataAggregator } from "@/lib/report-aggregator";
import { generateMarkdownReport } from "@/lib/report-template-engine";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const projectId = sp.get("projectId");
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");
    const description = sp.get("description") || "";
    const generatedBy = sp.get("generatedBy") || "系统自动生成";

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少 projectId 参数" },
        { status: 400 }
      );
    }

    const aggregatedData = await ReportDataAggregator.aggregate(projectId, dateFrom || undefined, dateTo || undefined);

    if (!aggregatedData.project) {
      return NextResponse.json(
        { success: false, error: "未找到指定项目" },
        { status: 404 }
      );
    }

    const generatedAt = new Date();
    const generatedAtStr = generatedAt.toISOString();
    const reportMarkdown = generateMarkdownReport(aggregatedData, {
      projectName: aggregatedData.project.name,
      dateFrom: dateFrom || aggregatedData.project.startDate || "创建日",
      dateTo: dateTo || generatedAtStr.slice(0, 10),
      description,
      generatedBy,
      generatedAt: generatedAtStr,
    });

    const reportId = randomUUID();

    const report = await ReportManager.createReport({
      id: reportId,
      projectId,
      title: `${aggregatedData.project.name} - 综合报告`,
      content: reportMarkdown,
      config: {
        description: description || `${aggregatedData.project.name} 项目综合数据分析报告`,
        type: "comprehensive",
        status: "published",
        format: "markdown",
        generatedBy,
        generatedAt: generatedAtStr,
      } as any,
      createdBy: generatedBy || "系统自动生成",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("生成报告失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "生成报告失败" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
