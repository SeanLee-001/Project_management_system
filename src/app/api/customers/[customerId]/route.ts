import { NextRequest, NextResponse } from "next/server";
import { customerManager } from "@/storage/database";
import { updateCustomerSchema } from "@/storage/database/shared/schema";

// PUT /api/customers/[customerId] - 更新客户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const body = await request.json();
    const validatedData = updateCustomerSchema.parse(body);

    // 处理null值转换为undefined
    const dataToSend = {
      ...validatedData,
      phone: validatedData.phone || undefined,
      address: validatedData.address || undefined,
    };

    const customer = await customerManager.update(customerId, dataToSend);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "客户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    if (error.name === "ZodError") {
      const errorMessages = error.errors.map((err: any) => {
        const field = err.path[0] || "字段";
        const message = err.message;
        return `${field}: ${message}`;
      }).join(", ");
      return NextResponse.json(
        { success: false, error: `数据验证失败: ${errorMessages}`, details: error.errors },
        { status: 400 }
      );
    }
    const errorMessage = error?.message || error?.toString() || "更新客户失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[customerId] - 删除客户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const customer = await customerManager.delete(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "客户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    const errorMessage = error?.message || error?.toString() || "删除客户失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
