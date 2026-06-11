import { eq, and, desc, gte, lte, sql, or, like } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { loginLogs, type LoginLog, type InsertLoginLog, type UpdateLoginLog, users } from "./shared/schema";

export class LoginLogManager {
  async createLog(data: InsertLoginLog): Promise<LoginLog> {
    const db = await getDb();
    const [log] = await db.insert(loginLogs).values(data).returning();
    return log;
  }

  async updateLog(id: string, data: UpdateLoginLog): Promise<LoginLog | null> {
    const db = await getDb();
    const [log] = await db.update(loginLogs).set(data).where(eq(loginLogs.id, id)).returning();
    return log || null;
  }

  async getLogById(id: string): Promise<LoginLog | null> {
    const db = await getDb();
    const [log] = await db.select().from(loginLogs).where(eq(loginLogs.id, id));
    return log || null;
  }

  async getLogs(options: {
    skip?: number;
    limit?: number;
    userId?: string;
    loginStatus?: string;
    isSensitiveOperation?: boolean;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  } = {}): Promise<LoginLog[]> {
    const { skip = 0, limit = 100, userId, loginStatus, isSensitiveOperation, startDate, endDate, search } = options;
    const db = await getDb();

    const conditions: any[] = [];

    if (userId) {
      conditions.push(eq(loginLogs.userId, userId));
    }
    if (loginStatus) {
      conditions.push(eq(loginLogs.loginStatus, loginStatus));
    }
    if (isSensitiveOperation !== undefined) {
      conditions.push(eq(loginLogs.isSensitiveOperation, isSensitiveOperation));
    }
    if (startDate) {
      conditions.push(gte(loginLogs.loginTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(loginLogs.loginTime, endDate));
    }
    if (search && search.trim().length > 0) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(loginLogs.username, searchPattern),
          like(loginLogs.employeeNumber, searchPattern),
          like(loginLogs.fullName, searchPattern),
          like(loginLogs.ipAddress, searchPattern)
        )
      );
    }

    let logs: LoginLog[];
    if (conditions.length > 0) {
      logs = await db
        .select()
        .from(loginLogs)
        .where(and(...conditions))
        .orderBy(desc(loginLogs.loginTime))
        .limit(limit)
        .offset(skip);
    } else {
      logs = await db
        .select()
        .from(loginLogs)
        .orderBy(desc(loginLogs.loginTime))
        .limit(limit)
        .offset(skip);
    }

    return logs;
  }

  async getLogCount(options: {
    userId?: string;
    loginStatus?: string;
    isSensitiveOperation?: boolean;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  } = {}): Promise<number> {
    const { userId, loginStatus, isSensitiveOperation, startDate, endDate, search } = options;
    const db = await getDb();

    const conditions: any[] = [];

    if (userId) {
      conditions.push(eq(loginLogs.userId, userId));
    }
    if (loginStatus) {
      conditions.push(eq(loginLogs.loginStatus, loginStatus));
    }
    if (isSensitiveOperation !== undefined) {
      conditions.push(eq(loginLogs.isSensitiveOperation, isSensitiveOperation));
    }
    if (startDate) {
      conditions.push(gte(loginLogs.loginTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(loginLogs.loginTime, endDate));
    }
    if (search && search.trim().length > 0) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(loginLogs.username, searchPattern),
          like(loginLogs.employeeNumber, searchPattern),
          like(loginLogs.fullName, searchPattern),
          like(loginLogs.ipAddress, searchPattern)
        )
      );
    }

    let result;
    if (conditions.length > 0) {
      result = await db
        .select({ count: sql<number>`count(*)` })
        .from(loginLogs)
        .where(and(...conditions));
    } else {
      result = await db
        .select({ count: sql<number>`count(*)` })
        .from(loginLogs);
    }

    return result[0]?.count || 0;
  }

  // 获取用户最后一次登录记录
  async getLastLoginByUser(userId: string): Promise<LoginLog | null> {
    const db = await getDb();
    const [log] = await db
      .select()
      .from(loginLogs)
      .where(and(eq(loginLogs.userId, userId), eq(loginLogs.loginStatus, "success")))
      .orderBy(desc(loginLogs.loginTime))
      .limit(1);
    return log || null;
  }

  // 统计 - 按日期统计登录次数
  async getLoginStatsByDate(startDate: Date, endDate: Date): Promise<{ date: string; count: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT to_char(login_time, 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM login_logs
      WHERE login_time >= ${startDate}
        AND login_time <= ${endDate}
        AND login_status = 'success'
      GROUP BY to_char(login_time, 'YYYY-MM-DD')
      ORDER BY date
    `);
    
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      date: row.date,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  // 统计 - 按月统计登录次数
  async getLoginStatsByMonth(startDate: Date, endDate: Date): Promise<{ month: string; count: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT to_char(login_time, 'YYYY-MM') as month, COUNT(*) as count
      FROM login_logs
      WHERE login_time >= ${startDate}
        AND login_time <= ${endDate}
        AND login_status = 'success'
      GROUP BY to_char(login_time, 'YYYY-MM')
      ORDER BY month
    `);
    
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      month: row.month,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  // 统计 - 敏感操作统计
  async getSensitiveOperationStats(startDate: Date, endDate: Date): Promise<{ type: string; count: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT sensitive_operation_type as type, COUNT(*) as count 
      FROM login_logs 
      WHERE login_time >= ${startDate} 
        AND login_time <= ${endDate}
        AND is_sensitive_operation = true
      GROUP BY sensitive_operation_type
      ORDER BY count DESC
    `);
    
    // 处理返回结果
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      type: row.type || row.sensitive_operation_type,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  // 统计 - 活跃用户
  async getActiveUsers(startDate: Date, endDate: Date, limit: number = 20): Promise<{ userId: string; username: string; fullName: string | null; loginCount: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT user_id as "userId", username, full_name as "fullName", COUNT(*) as "loginCount"
      FROM login_logs
      WHERE login_time >= ${startDate}
        AND login_time <= ${endDate}
        AND login_status = 'success'
      GROUP BY user_id, username, full_name
      ORDER BY "loginCount" DESC
      LIMIT ${limit}
    `);
    
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      userId: row.userId || row.user_id,
      username: row.username,
      fullName: row.fullName || row.full_name,
      loginCount: parseInt(row.loginCount, 10) || 0,
    }));
  }

  // 统计 - 登录方式统计
  async getLoginMethodStats(startDate: Date, endDate: Date): Promise<{ method: string; count: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT login_method as method, COUNT(*) as count 
      FROM login_logs 
      WHERE login_time >= ${startDate} 
        AND login_time <= ${endDate}
        AND login_status = 'success'
      GROUP BY login_method
      ORDER BY count DESC
    `);
    
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      method: row.method || row.login_method,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  // 统计 - 设备类型统计
  async getDeviceTypeStats(startDate: Date, endDate: Date): Promise<{ deviceType: string; count: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT device_type as "deviceType", COUNT(*) as count 
      FROM login_logs 
      WHERE login_time >= ${startDate} 
        AND login_time <= ${endDate}
        AND login_status = 'success'
      GROUP BY device_type
      ORDER BY count DESC
    `);
    
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      deviceType: row.deviceType || row.device_type,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  // 统计 - 浏览器统计
  async getBrowserStats(startDate: Date, endDate: Date): Promise<{ browser: string; count: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT browser, COUNT(*) as count 
      FROM login_logs 
      WHERE login_time >= ${startDate} 
        AND login_time <= ${endDate}
        AND login_status = 'success'
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      browser: row.browser,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  // 统计 - 每日登录时段分布
  async getLoginHourDistribution(startDate: Date, endDate: Date): Promise<{ hour: number; count: number }[]> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT extract(hour from login_time)::int as hour, COUNT(*) as count
      FROM login_logs
      WHERE login_time >= ${startDate}
        AND login_time <= ${endDate}
        AND login_status = 'success'
      GROUP BY extract(hour from login_time)
      ORDER BY hour
    `);
    
    const rows = result.rows || result;
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      hour: parseInt(row.hour, 10) || 0,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  // 删除旧日志（数据清理）
  async deleteOldLogs(beforeDate: Date): Promise<number> {
    const db = await getDb();
    const result = await db
      .delete(loginLogs)
      .where(lte(loginLogs.loginTime, beforeDate))
      .returning({ id: loginLogs.id });
    return result.length;
  }
}

export const loginLogManager = new LoginLogManager();
