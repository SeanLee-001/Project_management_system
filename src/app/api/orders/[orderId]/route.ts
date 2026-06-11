import { NextRequest, NextResponse } from "next/server";
import { orderManager } from "@/storage/database";

// GET /api/orders/[orderId] - 获取单个订单
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const order = await orderManager.getById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { success: false, error: "获取订单失败" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[orderId] - 更新订单
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();

    // 检查订单是否存在
    const existingOrder = await orderManager.getById(orderId);
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    const order = await orderManager.update(orderId, body);
    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error("Error updating order:", error);
    const errorMessage = error?.message || error?.toString() || "更新订单失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[orderId] - 删除订单
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // 检查订单是否存在
    const existingOrder = await orderManager.getById(orderId);
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    const order = await orderManager.delete(orderId);
    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    const errorMessage = error?.message || error?.toString() || "删除订单失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
