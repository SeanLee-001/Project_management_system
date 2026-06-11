import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { deliveries } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// GET - 获取单个送货单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "送货单不存在" },
        { status: 404 }
      );
    }

    // 解析items字段
    const delivery = { ...result[0] };
    if (delivery.items && typeof delivery.items === "string") {
      try {
        delivery.items = JSON.parse(delivery.items);
      } catch {
        delivery.items = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    console.error("获取送货单详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取送货单详情失败" },
      { status: 500 }
    );
  }
}

// PUT - 更新送货单
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    // 检查送货单是否存在
    const existing = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "送货单不存在" },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};
    
    if (body.orderId !== undefined) updateData.orderId = body.orderId;
    if (body.orderNumber !== undefined) updateData.orderNumber = body.orderNumber;
    if (body.customerId !== undefined) updateData.customerId = body.customerId;
    if (body.customerName !== undefined) updateData.customerName = body.customerName;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.projectName !== undefined) updateData.projectName = body.projectName;
    if (body.contactPerson !== undefined) updateData.contactPerson = body.contactPerson;
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone;
    if (body.deliveryAddress !== undefined) updateData.deliveryAddress = body.deliveryAddress;
    if (body.plannedDeliveryDate !== undefined) updateData.plannedDeliveryDate = body.plannedDeliveryDate ? new Date(body.plannedDeliveryDate) : null;
    if (body.actualDeliveryDate !== undefined) updateData.actualDeliveryDate = body.actualDeliveryDate ? new Date(body.actualDeliveryDate) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.items !== undefined) updateData.items = typeof body.items === "string" ? body.items : JSON.stringify(body.items);
    if (body.totalQuantity !== undefined) updateData.totalQuantity = body.totalQuantity;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.shippedBy !== undefined) updateData.shippedBy = body.shippedBy;
    if (body.shippedByName !== undefined) updateData.shippedByName = body.shippedByName;
    if (body.receivedBy !== undefined) updateData.receivedBy = body.receivedBy;

    updateData.updatedAt = new Date();

    const result = await db
      .update(deliveries)
      .set(updateData)
      .where(eq(deliveries.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: "送货单更新成功",
    });
  } catch (error) {
    console.error("更新送货单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新送货单失败" },
      { status: 500 }
    );
  }
}

// DELETE - 删除送货单
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // 检查送货单是否存在
    const existing = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "送货单不存在" },
        { status: 404 }
      );
    }

    // 检查状态，只有pending状态的送货单可以删除
    if (existing[0].status !== "pending") {
      return NextResponse.json(
        { success: false, error: "只有待送货状态的送货单可以删除" },
        { status: 400 }
      );
    }

    await db.delete(deliveries).where(eq(deliveries.id, id));

    return NextResponse.json({
      success: true,
      message: "送货单删除成功",
    });
  } catch (error) {
    console.error("删除送货单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除送货单失败" },
      { status: 500 }
    );
  }
}
