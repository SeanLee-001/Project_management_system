import { NextRequest, NextResponse } from "next/server";
import { ReportManager } from "@/storage/database/reportManager";
import { ReportDataAggregator } from "@/lib/report-aggregator";
import { generateMarkdownReport } from "@/lib/report-template-engine";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "缺少 reportId 参数" },
        { status: 400 }
      );
    }

    const existingReport = await ReportManager.getReportById(reportId);
    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: "报告不存在" },
        { status: 404 }
      );
    }

    const projectId = existingReport.projectId;
    const aggregatedData = await ReportDataAggregator.aggregate(projectId);

    if (!aggregatedData.project) {
      return NextResponse.json(
        { success: false, error: "原关联项目已不存在" },
        { status: 404 }
      );
    }

    const generatedAt = new Date();
    const generatedAtStr = generatedAt.toISOString();
    const config = (existingReport.config && typeof existingReport.config === "object") ? (existingReport.config as Record<string, unknown>) : {};
    const desc = ((config.description as string) || "") || "";

    const reportMarkdown = generateMarkdownReport(aggregatedData, {
      projectName: aggregatedData.project.name,
      dateFrom: aggregatedData.project.startDate || "创建日",
      dateTo: generatedAtStr.slice(0, 10),
      description: desc,
      generatedBy: ((config.generatedBy as string) || existingReport.createdBy) || "系统自动生成",
      generatedAt: generatedAtStr,
    });

    const newReport = await ReportManager.createReport({
      id: randomUUID(),
      projectId,
      title: existingReport.title || `${aggregatedData.project.name} - 综合报告 (重新生成)`,
      content: reportMarkdown,
      config: {
        description: desc,
        type: ((config.type as string) || "comprehensive"),
        status: "published",
        format: "markdown",
        generatedBy: ((config.generatedBy as string) || existingReport.createdBy) || "系统自动生成",
        generatedAt: generatedAtStr,
      } as any,
      createdBy: ((config.generatedBy as string) || existingReport.createdBy) || "系统自动生成",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });

    return NextResponse.json({
      success: true,
      data: newReport,
      previousReportId: reportId,
    });
  } catch (error: any) {
    console.error("重新生成报告失败:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "重新生成报告失败" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
