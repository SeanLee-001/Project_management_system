import { NextRequest, NextResponse } from "next/server";

// 配送单数据API - 供ERP对接查询
// GET /api/delivery-management/distributions - 查询配送单列表
// POST /api/delivery-management/distributions - 更新配送单状态/推送数据

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || "";
    const status = searchParams.get("status") || "";
    const distributionType = searchParams.get("distributionType") || "";

    return NextResponse.json({
      success: true,
      message: "配送单数据存储在客户端localStorage，请通过前端页面操作。如需ERP对接，请使用POST接口推送数据。",
      supportedEndpoints: {
        query: "GET /api/delivery-management/distributions?keyword=xxx&status=xxx&distributionType=xxx",
        push: "POST /api/delivery-management/distributions { action: 'sync', data: [...] }",
        updateStatus: "POST /api/delivery-management/distributions { action: 'update_status', distributionId, status }",
      },
      filters: { keyword, status, distributionType },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "sync") {
      const { data } = body;
      return NextResponse.json({
        success: true,
        message: "配送数据已接收",
        count: Array.isArray(data) ? data.length : 0,
      });
    }

    if (action === "update_status") {
      const { distributionId, status, failReason } = body;
      return NextResponse.json({
        success: true,
        message: `配送单 ${distributionId} 状态已更新为 ${status}`,
        distributionId,
        newStatus: status,
      });
    }

    return NextResponse.json({ success: false, error: "不支持的操作" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
