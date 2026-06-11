import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { customerContacts } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";

// PUT /api/customers/{customerId}/contacts/{contactId} - 更新联系人
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ customerId: string; contactId: string }> }
) {
  try {
    const { customerId, contactId } = await params;
    const body = await request.json();

    const db = await getDb();

    const [contact] = await db
      .update(customerContacts)
      .set({
        contactType: body.contactType,
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        position: body.position,
      })
      .where(
        and(
          eq(customerContacts.customerId, customerId),
          eq(customerContacts.id, contactId)
        )
      )
      .returning();

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error: "联系人不存在",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("更新联系人失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "更新联系人失败",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/{customerId}/contacts/{contactId} - 删除指定联系人
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ customerId: string; contactId: string }> }
) {
  try {
    const { customerId, contactId } = await params;
    const db = await getDb();

    const result = await db
      .delete(customerContacts)
      .where(
        and(
          eq(customerContacts.customerId, customerId),
          eq(customerContacts.id, contactId)
        )
      );

    return NextResponse.json({
      success: true,
      message: "联系人删除成功",
    });
  } catch (error) {
    console.error("删除联系人失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "删除联系人失败",
      },
      { status: 500 }
    );
  }
}
