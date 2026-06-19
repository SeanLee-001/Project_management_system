import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("获取当前用户信息失败:", error);
    return NextResponse.json({ success: false, error: "获取用户信息失败" }, { status: 500 });
  }
}
