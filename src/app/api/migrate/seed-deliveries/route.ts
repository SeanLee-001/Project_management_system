import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { deliveries } from "@/storage/database/shared/schema";
import { sql, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    console.log("Starting to seed deliveries data...");

    const db = await getDb();

    // 检查是否已有数据
    const existing = await db.select({ count: sql<number>`count(*)` }).from(deliveries);
    const existingCount = Number(existing[0]?.count || 0);
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Deliveries table already has ${existingCount} records, skipping seed`,
        count: existingCount,
      });
    }

    // 读取种子数据
    const seedPath = path.join(process.cwd(), "scripts", "delivery-seed-data.json");
    const raw = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    const notes = raw.deliveryNotes || [];

    // 获取关联数据用于映射
    const orders = await db.execute(sql`SELECT id, order_number, customer_name FROM orders LIMIT 50`);
    const users = await db.execute(sql`SELECT id, username, full_name FROM users LIMIT 50`);
    const projects = await db.execute(sql`SELECT id, name, customer_name FROM projects LIMIT 50`);

    const orderMap: Record<string, any> = {};
    (orders.rows || []).forEach((o: any) => { orderMap[o.customer_name] = o; });
    const projMap: Record<string, any> = {};
    (projects.rows || []).forEach((p: any) => { projMap[p.customer_name] = p; });
    const userMap: Record<string, any> = {};
    (users.rows || []).forEach((u: any) => { userMap[u.full_name] = u; });

    let inserted = 0;
    const skipped: string[] = [];

    for (const note of notes) {
      const ord = orderMap[note.companyName];
      const proj = projMap[note.companyName];
      const user = userMap[note.receiver] || userMap[note.shippedByName];

      try {
        // 检查是否已存在
        const dup = await db.select({ id: deliveries.id })
          .from(deliveries)
          .where(eq(deliveries.deliveryNumber, note.noteNumber))
          .limit(1);

        if (dup.length > 0) {
          skipped.push(note.noteNumber);
          continue;
        }

        const statusMap: Record<string, string> = {
          pending: "pending",
          in_progress: "shipped",
          completed: "delivered",
          cancelled: "cancelled",
        };

        await db.insert(deliveries).values({
          id: note.id,
          deliveryNumber: note.noteNumber,
          orderId: ord?.id || null,
          orderNumber: ord?.order_number || note.orderNumber,
          customerId: null,
          customerName: note.companyName,
          projectId: proj?.id || null,
          projectName: proj?.name || null,
          contactPerson: note.receiver,
          contactPhone: note.contactPhone,
          deliveryAddress: note.deliveryAddress,
          plannedDeliveryDate: note.deliveryDate ? new Date(`${note.deliveryDate}T10:00:00+08:00`) : null,
          status: statusMap[note.status] || "pending",
          items: JSON.stringify(note.items || []),
          totalQuantity: note.totalQuantity || 0,
          remarks: note.remarks || null,
          shippedBy: user?.id || null,
          shippedByName: user?.full_name || note.shippedByName,
          receivedBy: note.receiver,
          createdBy: user?.id || null,
        });

        inserted++;
      } catch (e: any) {
        console.error(`Skip ${note.noteNumber}: ${e.message}`);
        skipped.push(`${note.noteNumber} (error: ${e.message})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted} deliveries`,
      inserted,
      skipped: skipped.slice(0, 5),
      total: notes.length,
    });
  } catch (error) {
    console.error("Error seeding deliveries:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to seed deliveries" },
      { status: 500 }
    );
  }
}
