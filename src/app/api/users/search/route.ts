import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// GET /api/users/search?q=xxx - 模糊查询用户
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { success: false, error: "查询参数不能为空" },
        { status: 400 }
      );
    }

    const users = await userManager.searchUsers(query);
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search users" },
      { status: 500 }
    );
  }
}
