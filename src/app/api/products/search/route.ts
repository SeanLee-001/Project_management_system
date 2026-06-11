import { NextRequest, NextResponse } from "next/server";
import { productManager } from "@/storage/database";

// GET /api/products/search?code=xxx&mode=fuzzy - 根据物料编码查询产品
// mode 参数：
// - fuzzy: 模糊查询，返回匹配的产品列表（默认）
// - exact: 精确查询，返回单个产品
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const mode = searchParams.get("mode") || "fuzzy";

    if (!code) {
      return NextResponse.json(
        { success: false, error: "物料编码不能为空" },
        { status: 400 }
      );
    }

    if (mode === "exact") {
      // 精确查询模式
      const product = await productManager.getProductByMaterialCode(code);

      if (!product) {
        return NextResponse.json(
          { success: false, error: "未找到该物料编码对应的产品" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: product });
    } else {
      // 模糊查询模式（默认）
      const products = await productManager.searchProductsByMaterialCode(code);

      if (products.length === 0) {
        return NextResponse.json(
          { success: false, error: "未找到匹配的产品" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: products });
    }
  } catch (error: any) {
    console.error("Error searching product:", error);
    const errorMessage = error?.message || error?.toString() || "查询产品失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
