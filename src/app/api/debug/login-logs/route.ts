import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

// GET /api/debug/login-logs - 查看登录日志数据统计
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 总数
    const countResult = await db.execute(`SELECT COUNT(*) as count FROM login_logs`);
    
    // 按敏感操作分组
    const sensitiveResult = await db.execute(`
      SELECT is_sensitive_operation, COUNT(*) as count 
      FROM login_logs 
      GROUP BY is_sensitive_operation
    `);
    
    // 敏感操作类型分布
    const sensitiveTypeResult = await db.execute(`
      SELECT sensitive_operation_type, COUNT(*) as count 
      FROM login_logs 
      WHERE is_sensitive_operation = true
      GROUP BY sensitive_operation_type
    `);
    
    // 设备类型分布
    const deviceResult = await db.execute(`
      SELECT device_type, COUNT(*) as count 
      FROM login_logs 
      GROUP BY device_type
    `);
    
    // 示例数据
    const sampleResult = await db.execute(`
      SELECT id, username, login_time, device_type, is_sensitive_operation, sensitive_operation_type
      FROM login_logs 
      LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      data: {
        totalCount: countResult,
        sensitiveStats: sensitiveResult,
        sensitiveTypeStats: sensitiveTypeResult,
        deviceTypeStats: deviceResult,
        sampleData: sampleResult,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false, error: String(error) });
  }
}
