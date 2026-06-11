import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { loginLogManager } from "@/storage/database";

// POST /api/migrate/seed-login-logs - 生成测试登录日志数据
export async function POST(request: NextRequest) {
  try {
    // 获取所有活跃用户
    const allUsers = await userManager.getUsers({ limit: 100 });
    const users = allUsers.filter(u => u.isActive);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: "没有找到活跃用户，请先创建用户" },
        { status: 400 }
      );
    }

    const browsers = ["Chrome 120", "Firefox 121", "Edge 120", "Safari 17"];
    const osList = ["Windows 10", "Windows 11", "macOS 14.2", "Ubuntu 22.04"];
    const deviceTypes = ["desktop", "mobile", "tablet"];
    const loginMethods = ["password", "mac"];
    const sensitiveTypes = ["ip_changed", "password_changed", "mac_bound"];

    // 为每个用户生成最近30天的登录日志
    const now = new Date();
    let totalLogs = 0;

    for (const user of users.slice(0, 10)) { // 最多取10个用户
      // 每个用户生成 5-15 条登录记录
      const numLogs = Math.floor(Math.random() * 11) + 5;
      
      for (let i = 0; i < numLogs; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const hours = Math.floor(Math.random() * 12) + 8; // 8:00 - 20:00
        const minutes = Math.floor(Math.random() * 60);
        
        const loginTime = new Date(now);
        loginTime.setDate(loginTime.getDate() - daysAgo);
        loginTime.setHours(hours, minutes, 0, 0);
        
        const loginDuration = Math.floor(Math.random() * 28800) + 300; // 5分钟到8小时
        
        const ipAddress = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const previousIpAddress = i > 0 && Math.random() > 0.85 ? `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : undefined;
        
        const isSensitiveOperation = Math.random() > 0.9;
        const sensitiveOperationType = isSensitiveOperation 
          ? sensitiveTypes[Math.floor(Math.random() * sensitiveTypes.length)] 
          : undefined;

        try {
          await loginLogManager.createLog({
            userId: user.id,
            username: user.username,
            employeeNumber: user.employeeNumber || undefined,
            fullName: user.fullName || undefined,
            loginTime: loginTime,
            ipAddress: ipAddress,
            previousIpAddress: previousIpAddress,
            userAgent: "Mozilla/5.0 Test Agent",
            deviceType: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
            browser: browsers[Math.floor(Math.random() * browsers.length)],
            os: osList[Math.floor(Math.random() * osList.length)],
            loginMethod: loginMethods[Math.floor(Math.random() * loginMethods.length)] as "password" | "mac",
            loginStatus: "success",
            isSensitiveOperation: isSensitiveOperation,
            sensitiveOperationType: sensitiveOperationType,
          });
          totalLogs++;
        } catch (logError) {
          console.error("Error creating log:", logError);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `成功生成 ${totalLogs} 条登录日志测试数据`,
        data: {
          usersCount: Math.min(users.length, 10),
          logsCount: totalLogs,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error seeding login logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Seeding failed",
      },
      { status: 500 }
    );
  }
}
