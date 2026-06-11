import { eq, and, desc, or, like, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { systemLogs, type SystemLog, type InsertSystemLog } from "./shared/schema";

export class SystemLogManager {
  async createLog(data: InsertSystemLog): Promise<SystemLog> {
    const db = await getDb();
    const [log] = await db.insert(systemLogs).values(data).returning();
    return log;
  }

  async getLogs(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<SystemLog, "userId" | "action" | "resource" | "status">>;
    search?: string; // 搜索关键词（用户名、全名、资源ID等）
  } = {}): Promise<SystemLog[]> {
    const { skip = 0, limit = 100, filters = {}, search } = options;
    const db = await getDb();

    const conditions: any[] = [];

    if (filters.userId !== undefined && filters.userId !== null) {
      conditions.push(eq(systemLogs.userId, filters.userId));
    }
    if (filters.action !== undefined && filters.action !== null) {
      conditions.push(eq(systemLogs.action, filters.action));
    }
    if (filters.resource !== undefined && filters.resource !== null) {
      conditions.push(eq(systemLogs.resource, filters.resource));
    }
    if (filters.status !== undefined && filters.status !== null) {
      conditions.push(eq(systemLogs.status, filters.status));
    }

    // 模糊搜索（用户名、全名、资源ID）
    if (search && search.trim().length > 0) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(systemLogs.username, searchPattern),
          like(systemLogs.fullName, searchPattern),
          like(systemLogs.resourceId, searchPattern)
        )
      );
    }

    let logs: SystemLog[];
    if (conditions.length > 0) {
      logs = await db
        .select()
        .from(systemLogs)
        .where(and(...conditions))
        .orderBy(desc(systemLogs.createdAt))
        .limit(limit)
        .offset(skip);
    } else {
      logs = await db
        .select()
        .from(systemLogs)
        .orderBy(desc(systemLogs.createdAt))
        .limit(limit)
        .offset(skip);
    }

    return logs;
  }

  async getLogById(id: string): Promise<SystemLog | null> {
    const db = await getDb();
    const [log] = await db.select().from(systemLogs).where(eq(systemLogs.id, id));
    return log || null;
  }

  async getLogCount(options: {
    filters?: Partial<Pick<SystemLog, "userId" | "action" | "resource" | "status">>;
    search?: string;
  } = {}): Promise<number> {
    const { filters = {}, search } = options;
    const db = await getDb();

    const conditions: any[] = [];

    if (filters.userId !== undefined && filters.userId !== null) {
      conditions.push(eq(systemLogs.userId, filters.userId));
    }
    if (filters.action !== undefined && filters.action !== null) {
      conditions.push(eq(systemLogs.action, filters.action));
    }
    if (filters.resource !== undefined && filters.resource !== null) {
      conditions.push(eq(systemLogs.resource, filters.resource));
    }
    if (filters.status !== undefined && filters.status !== null) {
      conditions.push(eq(systemLogs.status, filters.status));
    }

    // 模糊搜索
    if (search && search.trim().length > 0) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(systemLogs.username, searchPattern),
          like(systemLogs.fullName, searchPattern),
          like(systemLogs.resourceId, searchPattern)
        )
      );
    }

    if (conditions.length > 0) {
      const [result] = await db
        .select({ count: systemLogs.id })
        .from(systemLogs)
        .where(and(...conditions));
      return Number(result?.count || 0);
    } else {
      const [result] = await db.select({ count: systemLogs.id }).from(systemLogs);
      return Number(result?.count || 0);
    }
  }

  async deleteLog(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(systemLogs).where(eq(systemLogs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteOldLogs(days: number): Promise<number> {
    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 使用原生SQL删除旧日志
    const result = await db.execute(
      sql`DELETE FROM system_logs WHERE created_at < ${cutoffDate}`
    );
    return result.rowCount ?? 0;
  }

  async deleteAllLogs(): Promise<number> {
    const db = await getDb();
    const result = await db.delete(systemLogs);
    return result.rowCount ?? 0;
  }
}

export const systemLogManager = new SystemLogManager();
