import { NextRequest, NextResponse } from "next/server";
import { loginLogManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";

// GET /api/login-logs/stats - 获取登录统计数据
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
        { success: false, error: "只有系统管理员可以查看统计数据" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day 或 month

    // 处理日期范围，确保包含整天
    let startDate: Date;
    let endDate: Date;
    
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setUTCHours(23, 59, 59, 999); // 设置为当天 23:59:59.999 UTC
    } else {
      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
    }
    
    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setUTCHours(0, 0, 0, 0); // 设置为当天 00:00:00 UTC
    } else {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    // 并行获取各种统计数据
    const [
      loginStatsByDate,
      loginStatsByMonth,
      sensitiveOperationStats,
      activeUsers,
      loginMethodStats,
      deviceTypeStats,
      browserStats,
      loginHourDistribution,
      totalLogins,
      sensitiveCount,
    ] = await Promise.all([
      loginLogManager.getLoginStatsByDate(startDate, endDate),
      loginLogManager.getLoginStatsByMonth(startDate, endDate),
      loginLogManager.getSensitiveOperationStats(startDate, endDate),
      loginLogManager.getActiveUsers(startDate, endDate, 20),
      loginLogManager.getLoginMethodStats(startDate, endDate),
      loginLogManager.getDeviceTypeStats(startDate, endDate),
      loginLogManager.getBrowserStats(startDate, endDate),
      loginLogManager.getLoginHourDistribution(startDate, endDate),
      loginLogManager.getLogCount({ startDate, endDate, loginStatus: "success" }),
      loginLogManager.getLogCount({ startDate, endDate, isSensitiveOperation: true }),
    ]);

    // 计算平均登录时长（需要从成功登录记录中计算）
    const logs = await loginLogManager.getLogs({
      startDate,
      endDate,
      loginStatus: "success",
      limit: 1000,
    });

    let totalDuration = 0;
    let durationCount = 0;
    for (const log of logs) {
      if (log.loginDuration) {
        totalDuration += log.loginDuration;
        durationCount++;
      }
    }
    const avgLoginDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalLogins,
          sensitiveCount,
          avgLoginDuration,
          uniqueUsers: activeUsers.length,
        },
        loginStatsByDate,
        loginStatsByMonth,
        sensitiveOperationStats,
        activeUsers,
        loginMethodStats,
        deviceTypeStats,
        browserStats,
        loginHourDistribution,
      },
    });
  } catch (error) {
    console.error("Error fetching login stats:", error);
    return NextResponse.json(
      { success: false, error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
