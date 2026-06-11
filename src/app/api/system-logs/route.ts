import { NextRequest, NextResponse } from "next/server";
import { systemLogManager } from "@/storage/database";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { verifyToken } from "@/lib/auth";

// GET /api/system-logs - 获取系统日志列表（仅系统管理员）
export async function GET(request: NextRequest) {
  try {
    // 从cookie中获取token
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 验证token并获取用户信息
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // 从数据库获取用户信息
    const user = await userManager.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 401 }
      );
    }

    // 检查用户是否是系统管理员
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以查看系统日志" },
        { status: 403 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      systemLogManager.getLogs({
        skip,
        limit,
        filters: {
          userId: userId || undefined,
          action: action || undefined,
          resource: resource || undefined,
          status: status as any || undefined,
        },
        search,
      }),
      systemLogManager.getLogCount({
        filters: {
          userId: userId || undefined,
          action: action || undefined,
          resource: resource || undefined,
          status: status as any || undefined,
        },
        search,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch system logs" },
      { status: 500 }
    );
  }
}

// DELETE /api/system-logs - 清空所有日志或删除旧日志（仅系统管理员）
export async function DELETE(request: NextRequest) {
  try {
    // 从cookie中获取token
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 验证token并获取用户信息
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // 从数据库获取用户信息
    const user = await userManager.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 401 }
      );
    }

    // 检查用户是否是系统管理员
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以删除系统日志" },
        { status: 403 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days"); // 如果指定days参数，删除指定天数前的日志

    let count: number;
    if (days) {
      const daysNum = parseInt(days);
      if (isNaN(daysNum) || daysNum <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid days parameter" },
          { status: 400 }
        );
      }
      count = await systemLogManager.deleteOldLogs(daysNum);
    } else {
      count = await systemLogManager.deleteAllLogs();
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${count} log(s)`,
      count,
    });
  } catch (error) {
    console.error("Error deleting system logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete system logs" },
      { status: 500 }
    );
  }
}
