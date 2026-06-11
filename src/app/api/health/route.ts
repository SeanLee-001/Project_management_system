import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// GET /api/health - 健康检查和环境信息
export async function GET(request: NextRequest) {
  try {
    const protocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol;
    const host = request.headers.get("host") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 获取admin用户信息
    const adminUser = await userManager.getUserByUsername("admin");

    const healthInfo = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || "unknown",
        FORCE_HTTPS: process.env.FORCE_HTTPS === "true",
        protocol: protocol,
        host: host,
      },
      adminUser: adminUser ? {
        username: adminUser.username,
        email: adminUser.email,
        fullName: adminUser.fullName,
        isActive: adminUser.isActive,
        role: adminUser.role,
        createdAt: adminUser.createdAt,
      } : null,
      request: {
        userAgent: userAgent,
      },
    };

    return NextResponse.json(healthInfo, { status: 200 });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
