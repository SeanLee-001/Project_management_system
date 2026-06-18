import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database/userManager";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const departmentId = searchParams.get("departmentId") || undefined;

    if (!q.trim() && !departmentId) {
      return NextResponse.json([]);
    }

    const results = await userManager.searchUsers(q.trim(), departmentId);
    return NextResponse.json(results);
  } catch (error) {
    console.error("搜索用户失败:", error);
    return NextResponse.json({ error: "搜索用户失败" }, { status: 500 });
  }
}
