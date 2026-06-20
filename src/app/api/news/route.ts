import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { newsArticles } from "@/storage/database/shared/schema";
import { desc, eq, and, gte, lte, sql, lt } from "drizzle-orm";
import { getUserFromToken } from "@/lib/auth";

const CATEGORIES = ["automation", "ai", "chip", "electronics"];
const CATEGORY_LABELS: Record<string, string> = {
  automation: "自动化",
  ai: "人工智能",
  chip: "芯片",
  electronics: "电子技术",
};

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const db = await getDb(newsArticles);

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const category = searchParams.get("category") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const conditions = [];

    if (category && CATEGORIES.includes(category)) {
      conditions.push(eq(newsArticles.category, category));
    }

    if (dateFrom) {
      conditions.push(gte(newsArticles.publishDate, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(newsArticles.publishDate, new Date(dateTo)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(newsArticles).where(where);
    const total = totalResult[0]?.count ?? 0;

    const articles = await db
      .select()
      .from(newsArticles)
      .where(where)
      .orderBy(desc(newsArticles.publishDate))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: articles,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("GET /api/news error:", error);
    return NextResponse.json({ success: false, error: "获取新闻失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== "system_admin") {
      return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
    }

    const db = await getDb(newsArticles);
    const body = await request.json();

    const { action } = body;

    if (action === "cleanup") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const deleted = await db.delete(newsArticles).where(lt(newsArticles.createdAt, thirtyDaysAgo)).returning();
      return NextResponse.json({ success: true, data: { deleted: deleted.length } });
    }

    const { articles: newArticles } = body;
    if (!Array.isArray(newArticles) || newArticles.length === 0) {
      return NextResponse.json({ success: false, error: "articles 数组不能为空" }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 先清理超过 30 天的旧记录
    await db.delete(newsArticles).where(lt(newsArticles.createdAt, thirtyDaysAgo));

    // 检查当前是否有超过 300 条（30天×10条），若有则删除最旧的
    const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(newsArticles);
    const currentCount = countResult[0]?.count ?? 0;
    if (currentCount + newArticles.length > 300) {
      const excessCount = currentCount + newArticles.length - 300;
      const oldestArticles = await db
        .select({ id: newsArticles.id })
        .from(newsArticles)
        .orderBy(newsArticles.createdAt)
        .limit(excessCount);
      if (oldestArticles.length > 0) {
        const idsToDelete = oldestArticles.map((a) => a.id);
        await db.delete(newsArticles).where(sql`${newsArticles.id} IN ${idsToDelete}`);
      }
    }

    const inserted = [];
    for (const article of newArticles) {
      if (!article.title || !article.source || !article.category || !article.publishDate) continue;
      if (!CATEGORIES.includes(article.category)) continue;

      const [result] = await db
        .insert(newsArticles)
        .values({
          title: String(article.title).slice(0, 500),
          summary: article.summary ? String(article.summary) : null,
          source: String(article.source).slice(0, 200),
          sourceUrl: article.sourceUrl ? String(article.sourceUrl) : null,
          category: article.category,
          publishDate: new Date(article.publishDate),
          imageUrl: article.imageUrl ? String(article.imageUrl) : null,
        })
        .returning();
      inserted.push(result);
    }

    return NextResponse.json({ success: true, data: { inserted: inserted.length, articles: inserted } });
  } catch (error) {
    console.error("POST /api/news error:", error);
    return NextResponse.json({ success: false, error: "保存新闻失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== "system_admin") {
      return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
    }

    const db = await getDb(newsArticles);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const deleted = await db.delete(newsArticles).where(lt(newsArticles.createdAt, thirtyDaysAgo)).returning();

    // 按每天每类别保留最多 10 条
    // 简化处理：删除超出 300 条的最旧记录
    const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(newsArticles);
    const total = countResult[0]?.count ?? 0;
    if (total > 300) {
      const oldestArticles = await db
        .select({ id: newsArticles.id })
        .from(newsArticles)
        .orderBy(newsArticles.createdAt)
        .limit(total - 300);
      if (oldestArticles.length > 0) {
        const idsToDelete = oldestArticles.map((a) => a.id);
        await db.delete(newsArticles).where(sql`${newsArticles.id} IN ${idsToDelete}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { deletedOld: deleted.length, totalAfterCleanup: total > 300 ? 300 : total },
    });
  } catch (error) {
    console.error("DELETE /api/news error:", error);
    return NextResponse.json({ success: false, error: "清理新闻失败" }, { status: 500 });
  }
}
