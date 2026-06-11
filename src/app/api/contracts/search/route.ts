import { NextRequest, NextResponse } from "next/server";
import { like } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { contracts } from "@/storage/database/shared/schema";

// GET /api/contracts/search - 搜索合同（支持合同编码模糊查询）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractCode = searchParams.get("contractCode");
    const mode = searchParams.get("mode");

    if (!contractCode) {
      return NextResponse.json(
        { success: false, error: "合同编码不能为空" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 模糊查询合同编码
    if (mode === "fuzzy") {
      const results = await db
        .select()
        .from(contracts)
        .where(like(contracts.contractCode, `%${contractCode}%`))
        .orderBy(contracts.createdAt);

      return NextResponse.json({
        success: true,
        data: results,
      });
    }

    // 精确查询合同编码（前缀匹配）
    const results = await db
      .select()
      .from(contracts)
      .where(like(contracts.contractCode, `${contractCode}%`))
      .orderBy(contracts.createdAt);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("Error searching contracts:", error);
    const errorMessage = error?.message || error?.toString() || "搜索合同失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
