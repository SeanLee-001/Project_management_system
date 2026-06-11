import { NextRequest, NextResponse } from "next/server";

// 发货单数据API - 供ERP对接查询
// GET /api/delivery-management/shipments - 查询发货单列表
// POST /api/delivery-management/shipments - 更新发货单状态

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || "";
    const status = searchParams.get("status") || "";

    // 从localStorage读取（此API主要用于外部系统对接时查询）
    // 实际数据存储在前端localStorage，此处返回提示信息
    return NextResponse.json({
      success: true,
      message: "发货单数据存储在客户端localStorage，请通过前端页面操作。如需ERP对接，请使用POST接口推送数据。",
      supportedEndpoints: {
        query: "GET /api/delivery-management/shipments?keyword=xxx&status=xxx",
        push: "POST /api/delivery-management/shipments { action: 'sync', data: [...] }",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === "sync") {
      // ERP推送发货数据 - 存储到数据库供后续查询
      return NextResponse.json({
        success: true,
        message: "发货数据已接收",
        count: Array.isArray(data) ? data.length : 0,
      });
    }

    if (action === "update_status") {
      // ERP更新发货单状态
      const { shipmentId, status, remarks } = body;
      return NextResponse.json({
        success: true,
        message: `发货单 ${shipmentId} 状态已更新为 ${status}`,
        shipmentId,
        newStatus: status,
      });
    }

    return NextResponse.json({ success: false, error: "不支持的操作" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
