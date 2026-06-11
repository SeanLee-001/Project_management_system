import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

// GET /api/test-auth - 测试认证是否正常工作
export async function GET(request: NextRequest) {
  try {
    console.log("[GET /api/test-auth] Cookies:", request.cookies.getAll());

    const currentUser = await getUserFromToken(request);

    if (currentUser) {
      return NextResponse.json({
        success: true,
        message: "认证成功",
        user: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "未登录",
        cookies: request.cookies.getAll(),
      }, { status: 401 });
    }
  } catch (error) {
    console.error("Error in test-auth:", error);
    return NextResponse.json({
      success: false,
      error: "测试认证失败",
    }, { status: 500 });
  }
}
