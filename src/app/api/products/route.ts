import { NextRequest, NextResponse } from "next/server";
import { productManager } from "@/storage/database";

// GET /api/products - 获取所有产品
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const products = await productManager.getProducts({
      filters: status ? { status } : undefined,
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    const errorMessage = error?.message || error?.toString() || "获取产品列表失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/products - 创建新产品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.materialCode) {
      return NextResponse.json(
        { success: false, error: "物料编码不能为空" },
        { status: 400 }
      );
    }

    if (!body.projectName) {
      return NextResponse.json(
        { success: false, error: "项目名称不能为空" },
        { status: 400 }
      );
    }

    const product = await productManager.createProduct(body);

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    const errorMessage = error?.message || error?.toString() || "创建产品失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
