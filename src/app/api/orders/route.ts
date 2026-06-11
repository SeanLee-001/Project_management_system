import { NextRequest, NextResponse } from "next/server";
import { orderManager } from "@/storage/database";

// GET /api/orders - 获取所有订单或搜索订单
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const keyword = searchParams.get("keyword"); // 兼容 keyword 参数
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const customerCode = searchParams.get("customerCode");
    const customerName = searchParams.get("customerName");
    const status = searchParams.get("status");

    let orders;

    // 如果有任何高级查询参数，使用 advancedSearch
    if (year || month || startDate || endDate || customerCode || customerName || status) {
      const params: any = {};

      if (search || keyword) params.keyword = search || keyword;
      if (year) params.year = parseInt(year, 10);
      if (month) params.month = parseInt(month, 10);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (customerCode) params.customerCode = customerCode;
      if (customerName) params.customerName = customerName;
      if (status) params.status = status;

      orders = await orderManager.advancedSearch(params);
    } else if (search || keyword) {
      orders = await orderManager.search(search || keyword || "");
    } else {
      orders = await orderManager.getAll();
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "获取订单列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/orders - 创建订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.contractCode) {
      return NextResponse.json(
        { success: false, error: "合同编码不能为空" },
        { status: 400 }
      );
    }

    const order = await orderManager.create(body);
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order:", error);
    const errorMessage = error?.message || error?.toString() || "创建订单失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
