import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { customerContacts, insertCustomerContactSchema } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";

// GET /api/customers/{customerId}/contacts - 获取指定客户的所有联系人
export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const db = await getDb();

    const contacts = await db
      .select()
      .from(customerContacts)
      .where(eq(customerContacts.customerId, customerId))
      .orderBy(customerContacts.createdAt);

    return NextResponse.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    console.error("获取联系人列表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取联系人列表失败",
      },
      { status: 500 }
    );
  }
}

// POST /api/customers/{customerId}/contacts - 创建新联系人
export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const body = await request.json();

    // 验证必填字段
    if (!body.contactName) {
      return NextResponse.json(
        {
          success: false,
          error: "联系人姓名不能为空",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    const [contact] = await db
      .insert(customerContacts)
      .values({
        customerId,
        contactType: body.contactType || "procurement",
        contactName: body.contactName,
        contactPhone: body.contactPhone || null,
        contactEmail: body.contactEmail || null,
        position: body.position || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("创建联系人失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建联系人失败",
      },
      { status: 500 }
    );
  }
}
