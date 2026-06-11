import { NextRequest, NextResponse } from "next/server";
import { userManager, loginLogManager } from "@/storage/database";
import { systemLogManager } from "@/storage/database/systemLogManager";
import { verifyToken } from "@/lib/auth";

// DELETE /api/auth/logout - 用户登出
export async function DELETE(request: NextRequest) {
  try {
    // 获取当前用户
    const token = request.cookies.get("token")?.value;
    if (token) {
      try {
        // 验证token并获取用户ID
        const decoded = await verifyToken(token);

        if (decoded && decoded.userId) {
          // 更新用户的登出信息（计算登录时长）
          await userManager.updateLogoutInfo(decoded.userId);

          // 获取用户信息
          const user = await userManager.getUserById(decoded.userId);

          // 记录登出日志
          if (user) {
            const userAgent = request.headers.get("user-agent") || "Unknown";
            const loginIP = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
              || request.headers.get("x-real-ip")
              || request.headers.get("cf-connecting-ip")
              || "127.0.0.1";

            await systemLogManager.createLog({
              action: "logout",
              resource: "system",
              userId: user.id,
              username: user.username,
              fullName: user.fullName,
              details: JSON.stringify({ loginDuration: user.loginDuration }),
              ipAddress: loginIP,
              userAgent: userAgent,
              status: "success",
            });

            // 更新最近一条登录日志的登出时间和登录时长
            const lastLoginLog = await loginLogManager.getLastLoginByUser(user.id);
            if (lastLoginLog && !lastLoginLog.logoutTime) {
              const logoutTime = new Date();
              const loginDuration = Math.floor((logoutTime.getTime() - new Date(lastLoginLog.loginTime).getTime()) / 1000);
              await loginLogManager.updateLog(lastLoginLog.id, {
                logoutTime,
                loginDuration,
              });
            }
          }
        }
      } catch (tokenError) {
        // Token验证失败，继续删除cookie
        console.error("Error verifying token during logout:", tokenError);
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("token");
    return response;
  } catch (error) {
    console.error("Error logging out:", error);
    const response = NextResponse.json({ success: true }); // 即使出错也返回成功，确保cookie被删除
    response.cookies.delete("token");
    return response;
  }
}
