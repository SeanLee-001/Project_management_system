import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserFromToken } from "@/lib/auth";
import { ReportDataAggregator } from "@/lib/report-aggregator";
import { ReportManager } from "@/storage/database/reportManager";
import { randomUUID } from "crypto";

function getAnthropicClient(): Anthropic {
  const apiKey =
    process.env.MCAI_LLM_API_KEY ||
    process.env.COZE_WORKLOAD_IDENTITY_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  const baseURL =
    process.env.MCAI_LLM_BASE_URL ||
    process.env.COZE_INTEGRATION_MODEL_BASE_URL ||
    "https://proxy.monkeycode-ai.com/v1";

  return new Anthropic({ apiKey, baseURL });
}

function getModel(): string {
  return process.env.MCAI_LLM_MODEL || process.env.COZE_INTEGRATION_MODEL || "monkeycode-basic/qwen3.5-plus";
}

function buildSystemPrompt(): string {
  return `你是一个专业的项目管理系统智能报告生成器。你的职责是根据提供的项目数据、行业动态和风险分析，生成专业、全面的项目总结报告。

报告结构要求：
1. 项目概况 - 项目基本信息、当前状态、核心指标
2. 任务执行情况 - 任务完成率、进度分析、延期风险
3. 合同与订单 - 合同金额、执行状态、回款情况
4. 财务分析 - 收入支出、资金流向、预算执行
5. 审批进度 - 审批流程状态、待处理事项
6. 风险分析 - 识别的主要风险、等级评估、应对建议
7. 行业动态 - 相关行业趋势、对项目的影响分析
8. 团队表现 - 成员工作量、协作情况
9. 改进建议 - 基于数据的优化建议
10. 总结 - 项目整体评估和下阶段重点

格式要求：
- 使用 Markdown 格式
- 数据引用要具体，包含数字和日期
- 分析要有深度，不只是罗列数据
- 建议要具体可行
- 语言专业、简洁
- 使用表格展示关键数据对比`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "未登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { projectId, requirements = "", files = [] } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ success: false, error: "缺少 projectId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const aggregatedData = await ReportDataAggregator.aggregate(projectId);
    if (!aggregatedData.project) {
      return new Response(JSON.stringify({ success: false, error: "未找到指定项目" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newsResponse = await fetch(`${request.nextUrl.origin}/api/news-fetch`);
    const newsData = newsResponse.ok ? await newsResponse.json() : { data: [] };

    const riskResponse = await fetch(`${request.nextUrl.origin}/api/project-risk-analysis`);
    const riskData = riskResponse.ok ? await riskResponse.json() : { data: { analyses: [], summary: {} } };

    const projectNews = (newsData.data || []).filter((n: any) => n.relevance === "high");
    const projectRisks = (riskData.data?.analyses || []).find((a: any) => a.projectId === projectId);

    const userMessage = `请为以下项目生成一份综合报告。

## 项目数据
${JSON.stringify(aggregatedData, null, 2)}

## 行业动态
${JSON.stringify(projectNews.slice(0, 5), null, 2)}

## 风险分析
${JSON.stringify(projectRisks || {}, null, 2)}

## 用户要求
${requirements || "请生成标准的项目综合报告"}

## 补充文件
${files.length > 0 ? files.map((f: any) => `- ${f.name}`).join("\n") : "无补充文件"}`;

    const client = getAnthropicClient();
    const model = getModel();
    const encoder = new TextEncoder();

    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "generating" })}\n\n`));

          const llmStream = client.messages.stream({
            model,
            max_tokens: 8192,
            system: buildSystemPrompt(),
            messages: [{ role: "user", content: userMessage }],
          });

          for await (const event of llmStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          const projectName = aggregatedData.project.name || "未知项目";
          const reportId = randomUUID();
          const now = new Date();

          const reportConfig = {
            description: requirements || `${projectName} 项目 AI 综合分析报告`,
            type: "ai_comprehensive",
            status: "published",
            format: "markdown",
          };

          await ReportManager.createReport({
            id: reportId,
            projectId,
            title: `${projectName} - AI 智能报告`,
            content: fullContent,
            config: { ...reportConfig, generatedAt: now.toISOString(), generatedBy: user.username || user.id } as any,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now,
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: "completed",
                reportId,
                title: `${projectName} - AI 智能报告`,
              })}\n\n`,
            ),
          );

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error: any) {
          console.error("AI report generation error:", error?.message || error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "AI 报告生成失败，请稍后重试" })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("AI report API error:", error?.message || error);
    return new Response(JSON.stringify({ success: false, error: "报告服务异常" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
