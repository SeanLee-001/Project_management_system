import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// GET /api/users/options - 获取用户选项（用于下拉选择）
export async function GET(request: NextRequest) {
  try {
    const options = await userManager.getUserOptions();
    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error("Error fetching user options:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user options" },
      { status: 500 }
    );
  }
}
