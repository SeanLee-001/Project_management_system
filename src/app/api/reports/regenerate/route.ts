import { NextRequest, NextResponse } from "next/server";
import { ReportManager } from "@/storage/database/reportManager";
import { ReportDataAggregator } from "@/lib/report-aggregator";
import { generateMarkdownReport } from "@/lib/report-template-engine";

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

    const generatedAt = new Date().toISOString();
    const reportMarkdown = generateMarkdownReport(aggregatedData, {
      projectName: aggregatedData.project.name,
      dateFrom: aggregatedData.project.startDate || "创建日",
      dateTo: new Date().toISOString().slice(0, 10),
      description: existingReport.description || "",
      generatedBy: existingReport.generatedBy || "系统自动生成",
      generatedAt,
    });

    // Re-create as a new report record (snapshot)
    const { randomUUID } = require("crypto");
    const newReport = await ReportManager.createReport({
      id: randomUUID(),
      projectId,
      title: existingReport.title || `${aggregatedData.project.name} - 综合报告 (重新生成)`,
      description: existingReport.description || "",
      type: existingReport.type || "comprehensive",
      status: "published",
      format: "markdown",
      data: aggregatedData as any,
      content: reportMarkdown,
      generatedBy: existingReport.generatedBy || "系统自动生成",
      generatedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
