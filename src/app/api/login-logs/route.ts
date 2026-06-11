import { NextRequest, NextResponse } from "next/server";
import { loginLogManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";

// GET /api/login-logs - 获取登录日志列表
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权，请先登录" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "无效的认证信息" },
        { status: 401 }
      );
    }

    const currentUser = await userManager.getUserById(decoded.userId);
    if (!currentUser || currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以查看登录日志" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const userId = searchParams.get("userId") || undefined;
    const loginStatus = searchParams.get("loginStatus") || undefined;
    const isSensitiveOperation = searchParams.get("isSensitiveOperation");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const search = searchParams.get("search") || undefined;

    // 处理日期范围，确保包含整天
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setUTCHours(0, 0, 0, 0); // 设置为当天 00:00:00 UTC
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setUTCHours(23, 59, 59, 999); // 设置为当天 23:59:59.999 UTC
    }

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      loginLogManager.getLogs({
        skip,
        limit: pageSize,
        userId,
        loginStatus,
        isSensitiveOperation: isSensitiveOperation ? isSensitiveOperation === "true" : undefined,
        startDate,
        endDate,
        search,
      }),
      loginLogManager.getLogCount({
        userId,
        loginStatus,
        isSensitiveOperation: isSensitiveOperation ? isSensitiveOperation === "true" : undefined,
        startDate,
        endDate,
        search,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching login logs:", error);
    return NextResponse.json(
      { success: false, error: "获取登录日志失败" },
      { status: 500 }
    );
  }
}
