import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { deliveries, orders, users } from "@/storage/database/shared/schema";
import { eq, like, and, or, desc, sql } from "drizzle-orm";
import { getUserFromToken } from "@/lib/auth";

// GET - 获取送货列表
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || "";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // 构建查询条件
    const conditions = [];
    
    if (keyword) {
      conditions.push(
        or(
          like(deliveries.deliveryNumber, `%${keyword}%`),
          like(deliveries.customerName, `%${keyword}%`),
          like(deliveries.projectName, `%${keyword}%`),
          like(deliveries.contactPerson, `%${keyword}%`),
          like(deliveries.contactPhone, `%${keyword}%`)
        )
      );
    }
    
    if (status) {
      conditions.push(eq(deliveries.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(deliveries)
      .where(whereClause);
    const total = Number(countResult[0]?.count) || 0;

    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const list = await db
      .select()
      .from(deliveries)
      .where(whereClause)
      .orderBy(desc(deliveries.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("获取送货列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取送货列表失败" },
      { status: 500 }
    );
  }
}

// POST - 创建送货单
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    // 生成送货单号
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    
    // 获取当天送货单数量
    const todayCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(deliveries);

    const sequence = String(Number(todayCount[0]?.count) + 1 || 1).padStart(4, "0");
    const deliveryNumber = `DL${year}${month}${day}${sequence}`;

    // 如果有订单ID，获取订单信息
    let orderInfo: any = null;
    if (body.orderId) {
      const ordersResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, body.orderId))
        .limit(1);
      orderInfo = ordersResult[0];
    }

    // 获取当前用户信息（通过 token 验证，不信任客户端请求头）
    let userInfo: any = null;
    let verifiedUserId: string | null = null;
    const currentUser = await getUserFromToken(request);
    if (currentUser) {
      verifiedUserId = currentUser.id;
      const usersResult = await db
        .select()
        .from(users)
        .where(eq(users.id, currentUser.id))
        .limit(1);
      userInfo = usersResult[0];
    }

    const insertData = {
      deliveryNumber,
      orderId: body.orderId || null,
      orderNumber: body.orderNumber || orderInfo?.orderNumber || null,
      customerId: body.customerId || orderInfo?.customerId || null,
      customerName: body.customerName || orderInfo?.customerName || null,
      projectId: body.projectId || null,
      projectName: body.projectName || null,
      contactPerson: body.contactPerson || null,
      contactPhone: body.contactPhone || null,
      deliveryAddress: body.deliveryAddress || null,
      plannedDeliveryDate: body.plannedDeliveryDate ? new Date(body.plannedDeliveryDate) : null,
      actualDeliveryDate: body.actualDeliveryDate ? new Date(body.actualDeliveryDate) : null,
      status: body.status || "pending",
      items: body.items ? JSON.stringify(body.items) : null,
      totalQuantity: body.totalQuantity || 0,
      remarks: body.remarks || null,
      shippedBy: verifiedUserId || null,
      shippedByName: userInfo?.fullName || userInfo?.username || null,
      receivedBy: body.receivedBy || null,
      createdBy: verifiedUserId || null,
    };

    const result = await db
      .insert(deliveries)
      .values(insertData)
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: "送货单创建成功",
    });
  } catch (error) {
    console.error("创建送货单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建送货单失败" },
      { status: 500 }
    );
  }
}
