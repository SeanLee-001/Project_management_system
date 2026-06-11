import { NextRequest, NextResponse } from "next/server";
import { customerManager } from "@/storage/database";
import { insertCustomerSchema } from "@/storage/database/shared/schema";

// GET /api/customers - 获取所有客户或搜索客户
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");

    const customers = await customerManager.getAll();

    // 如果有搜索关键词，进行模糊查询
    let filteredCustomers = customers;
    if (search && search.trim()) {
      const keyword = search.toLowerCase().trim();
      filteredCustomers = customers.filter((customer) => {
        return (
          customer.customerCode.toLowerCase().includes(keyword) ||
          customer.customerName.toLowerCase().includes(keyword) ||
          (customer.phone && customer.phone.toLowerCase().includes(keyword)) ||
          (customer.address && customer.address.toLowerCase().includes(keyword))
        );
      });
    }

    return NextResponse.json({ success: true, data: filteredCustomers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { success: false, error: "获取客户列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/customers - 创建客户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证输入数据
    const validatedData = insertCustomerSchema.parse(body);

    // 检查客户编号是否已存在
    const existingCustomer = await customerManager.getByCustomerCode(
      validatedData.customerCode
    );
    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: "客户编号已存在" },
        { status: 400 }
      );
    }

    // 处理null值和必填字段
    const dataToSend = {
      customerCode: validatedData.customerCode,
      customerName: validatedData.customerName,
      customerType: validatedData.customerType || "terminal",
      status: validatedData.status || "active",
      phone: validatedData.phone || undefined,
      address: validatedData.address || undefined,
    };

    const customer = await customerManager.create(dataToSend);
    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    if (error?.name === "ZodError" && error?.errors?.length > 0) {
      // 将Zod验证错误转换为更友好的中文提示
      const errorMessages = (error.errors || []).map((err: any) => {
        const field = err.path[0] || "字段";
        const message = err.message;
        return `${field}: ${message}`;
      }).join(", ");
      return NextResponse.json(
        { success: false, error: `数据验证失败: ${errorMessages}`, details: error.errors },
        { status: 400 }
      );
    }
    const errorMessage = error?.message || error?.toString() || "创建客户失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
