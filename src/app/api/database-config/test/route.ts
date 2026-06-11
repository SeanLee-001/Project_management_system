import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { UserRole } from "@/storage/database/shared/schema";
import { Pool } from "pg";

// POST /api/database-config/test - 测试数据库连接
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    // 检查权限
    const isAdmin = [UserRole.SYSTEM_ADMIN].includes(currentUser.role as any);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "只有系统管理员可以测试数据库连接" }, { status: 403 });
    }

    const config = await request.json();

    // 验证必填字段
    if (!config.host || !config.database || !config.username) {
      return NextResponse.json({ success: false, message: "请填写完整的连接信息" });
    }

    // 创建临时连接池测试连接
    const pool = new Pool({
      host: config.host,
      port: parseInt(config.port || "5432"),
      database: config.database,
      user: config.username,
      password: config.password || "",
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000, // 10秒超时
    });

    try {
      const client = await pool.connect();
      
      // 执行简单查询
      const result = await client.query("SELECT version()");
      const version = result.rows[0]?.version || "未知版本";
      
      // 获取数据库大小
      const sizeResult = await client.query(
        "SELECT pg_size_pretty(pg_database_size($1)) as size",
        [config.database]
      );
      const dbSize = sizeResult.rows[0]?.size || "未知";

      client.release();
      await pool.end();

      return NextResponse.json({
        success: true,
        message: `连接成功！PostgreSQL ${version.split(" ")[1]}, 数据库大小: ${dbSize}`,
        data: {
          version: version,
          size: dbSize,
        },
      });
    } catch (dbError: any) {
      await pool.end();
      
      // 解析错误信息
      let errorMessage = "连接失败";
      if (dbError.code === "ENOTFOUND") {
        errorMessage = "无法解析主机名，请检查主机地址";
      } else if (dbError.code === "ECONNREFUSED") {
        errorMessage = "连接被拒绝，请检查端口和防火墙设置";
      } else if (dbError.code === "ETIMEDOUT" || dbError.code === "CONNECTION_ETIMEDOUT") {
        errorMessage = "连接超时，请检查网络和防火墙设置";
      } else if (dbError.code === "28000" || dbError.code === "28P01") {
        errorMessage = "认证失败，请检查用户名和密码";
      } else if (dbError.code === "3D000") {
        errorMessage = "数据库不存在";
      } else if (dbError.message?.includes("SSL")) {
        errorMessage = "SSL 连接失败，请检查 SSL 设置";
      } else {
        errorMessage = `连接失败: ${dbError.message || dbError.code || "未知错误"}`;
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
      });
    }
  } catch (error) {
    console.error("测试数据库连接失败:", error);
    return NextResponse.json({
      success: false,
      message: "测试连接失败: " + String(error),
    });
  }
}
