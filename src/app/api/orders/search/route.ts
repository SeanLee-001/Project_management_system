import { NextRequest, NextResponse } from "next/server";
import { like } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { orders } from "@/storage/database/shared/schema";

// GET /api/orders/search - 搜索订单（支持订单号模糊查询）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("orderNumber");
    const mode = searchParams.get("mode");

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "订单号不能为空" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 模糊查询订单号
    if (mode === "fuzzy") {
      const results = await db
        .select()
        .from(orders)
        .where(like(orders.orderNumber, `%${orderNumber}%`))
        .orderBy(orders.createdAt);

      return NextResponse.json({
        success: true,
        data: results,
      });
    }

    // 精确查询订单号
    const results = await db
      .select()
      .from(orders)
      .where(like(orders.orderNumber, `${orderNumber}%`))
      .orderBy(orders.createdAt);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("Error searching orders:", error);
    const errorMessage = error?.message || error?.toString() || "搜索订单失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
