import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { codingCategories } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// DELETE /api/coding-categories/[id] - 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const deleted = await db
      .delete(codingCategories)
      .where(eq(codingCategories.id, id))
      .returning();

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({
        success: false,
        error: '分类不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Error deleting coding category:', error);
    return NextResponse.json({
      success: false,
      error: '删除分类失败'
    }, { status: 500 });
  }
}
