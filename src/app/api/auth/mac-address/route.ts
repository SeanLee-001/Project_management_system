import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/mac-address - 尝试获取客户端MAC地址
export async function GET(request: NextRequest) {
  try {
    // 重要说明：
    // 1. 浏览器出于安全和隐私考虑，JavaScript无法直接获取客户端MAC地址
    // 2. 后端只能看到直接连接的客户端MAC地址，如果客户端通过路由器/NAT连接，
    //    只能看到路由器的MAC地址
    // 3. 此API在不同环境下的可用性差异很大

    // 尝试从请求头中获取可能的MAC地址信息
    // 注意：这些方法在大多数情况下无法获取到真实的客户端MAC地址

    let detectedMacAddress = null;

    // 方法1: 尝试从X-Forwarded-For头获取（通常包含IP，不包含MAC）
    const xForwardedFor = request.headers.get("x-forwarded-for");
    const xRealIp = request.headers.get("x-real-ip");

    // 方法2: 从请求的连接信息中获取
    // Next.js在Node.js环境下可能无法直接访问底层网络连接
    // 这里返回说明信息，让前端了解技术限制

    const clientInfo = {
      ip: xForwardedFor || xRealIp || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      note: "由于浏览器安全和隐私限制，无法在浏览器端获取真实的客户端MAC地址。请使用MAC地址绑定功能，由管理员手动配置。",
    };

    return NextResponse.json({
      success: true,
      data: {
        macAddress: detectedMacAddress,
        info: clientInfo,
      },
    });
  } catch (error) {
    console.error("Error getting MAC address:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get MAC address",
        note: "MAC地址获取功能受限，建议手动输入或联系管理员绑定",
      },
      { status: 500 }
    );
  }
}
