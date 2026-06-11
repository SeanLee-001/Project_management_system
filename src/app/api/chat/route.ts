import { NextRequest } from "next/server";
import { LLMClient, Config } from "coze-coding-dev-sdk";
import { getUserFromToken } from "@/lib/auth";

// 系统提示词 - 定义智能体的角色和能力
const SYSTEM_PROMPT = `你是一个专业的项目管理系统智能助手，名字叫"非凡小助手"。你的职责是帮助用户理解和使用项目管理系统。

系统功能介绍：
1. 项目看板：查看项目统计信息和状态概览，包含项目数量、任务数量、合同金额、订单金额等汇总数据
2. 项目列表：管理所有项目（创建、编辑、删除项目），支持导入导出功能
3. 项目详情：查看和管理项目下的任务，支持甘特图视图
4. 任务管理：创建、编辑、删除任务，设置优先级和状态，支持任务分配和进度跟踪
5. 合同管理：管理项目合同和附件，支持导入导出
6. 订单管理：管理订单信息和付款进度，支持导入导出
7. 客户管理：管理客户信息和联系人，支持导入导出
8. 产品管理：管理产品信息，支持产品图片上传，支持导入导出
9. 消息中心：查看个人消息和系统通告，支持知识库文档下载
10. 知识库管理：上传和管理知识库文档，支持多种文件格式（PDF、Word、Excel等）
11. 权限管理：为用户分配资源访问权限（仅系统管理员）
12. 后台管理：系统设置、用户管理、角色管理、数据库配置等（仅系统管理员）
13. 数据统计看板：可视化展示项目、任务、合同、订单等统计数据
14. 移动端APP：支持React Native移动端访问

用户角色：
- 系统管理员：拥有所有权限，可以访问后台管理、数据库配置、系统设置等
- 部门经理：可以审核用户，有较高权限
- 项目经理：管理项目和任务，可审批项目申请
- 各类专业工程师：机械、电气、视觉、软件、算法工程师等，负责专业领域任务
- 采购、计划、生产、质量、现场、商务、安全等角色：负责各自领域工作
- 项目成员：基础的查看和编辑权限

项目状态：
- active（进行中）
- completed（已完成）
- paused（已暂停）

项目审批状态：
- pending（待审批）
- approved（已通过）
- rejected（已拒绝）

任务状态：
- todo（待办）
- in_progress（进行中）
- completed（已完成）

任务优先级：
- low（低）
- medium（中）
- high（高）

数据库配置功能：
- 支持配置远程数据库连接
- 支持测试数据库连接
- 支持保存、下载、导入、应用数据库配置
- 支持切换本地/远程数据库

导入导出功能：
- 支持项目、订单、合同、客户、产品数据导入导出
- 导入模板包含详细字段说明
- 支持Excel格式导入导出

回答要求：
1. 用中文回答，语气友好、专业
2. 对于系统功能问题，提供清晰的操作指引
3. 对于项目管理相关问题，给出专业的建议
4. 如果用户询问自己没有权限的功能，友好地告知并建议联系管理员
5. 保持简洁，避免冗长
6. 如果需要查看具体数据，引导用户到对应的模块
7. 对于数据库配置问题，提醒用户需要管理员权限
8. 对于导入导出问题，引导用户下载导入模板参考字段说明`;

// POST /api/chat - 聊天接口（流式输出）
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份（可选，根据需求决定是否需要登录）
    const user = await getUserFromToken(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "未授权，请先登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ success: false, error: "请提供有效的消息内容" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 构建消息历史
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];

    // 初始化LLM客户端
    const config = new Config();
    const client = new LLMClient(config);

    // 创建转换流
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 使用流式调用
          const llmStream = client.stream(messages, {
            model: "doubao-seed-1-6-251015",
            temperature: 0.7,
            caching: "disabled",
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              // 发送数据块
              const data = JSON.stringify({ content: text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // 发送结束标记
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("LLM streaming error:", error);
          const errorData = JSON.stringify({ error: "AI响应失败，请稍后重试" });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // 返回SSE流
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ success: false, error: "聊天服务异常" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
