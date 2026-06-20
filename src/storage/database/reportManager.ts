import { getDb } from "coze-coding-dev-sdk";
import { knowledgeBaseReports, knowledgeBaseReportFiles } from "@/storage/database/shared/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import type { InsertKnowledgeBaseReport, InsertKnowledgeBaseReportFile } from "@/storage/database/shared/schema";

export interface ReportListParams {
  projectId?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}

export class ReportManager {
  static async createReport(data: InsertKnowledgeBaseReport) {
    const db = await getDb(knowledgeBaseReports);
    const [result] = await db.insert(knowledgeBaseReports).values(data).returning();
    return result;
  }

  static async getReportById(id: string) {
    const db = await getDb(knowledgeBaseReports);
    const [result] = await db
      .select()
      .from(knowledgeBaseReports)
      .where(eq(knowledgeBaseReports.id, id));
    return result || null;
  }

  static async deleteReport(id: string) {
    const db = await getDb(knowledgeBaseReports);
    const [deleted] = await db
      .delete(knowledgeBaseReports)
      .where(eq(knowledgeBaseReports.id, id))
      .returning();
    return deleted || null;
  }

  static async getReportList(params: ReportListParams) {
    const db = await getDb(knowledgeBaseReports);
    const { projectId, page = 1, pageSize = 20, dateFrom, dateTo } = params;

    const conditions = [];

    if (projectId) {
      conditions.push(eq(knowledgeBaseReports.projectId, projectId));
    }

    if (dateFrom) {
      conditions.push(gte(knowledgeBaseReports.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(knowledgeBaseReports.createdAt, toDate));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(knowledgeBaseReports)
      .where(where);
    const total = totalResult[0]?.count ?? 0;

    const reports = await db
      .select()
      .from(knowledgeBaseReports)
      .where(where)
      .orderBy(desc(knowledgeBaseReports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: reports,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  static async uploadReportFile(data: InsertKnowledgeBaseReportFile) {
    const db = await getDb(knowledgeBaseReportFiles);
    const [result] = await db.insert(knowledgeBaseReportFiles).values(data).returning();
    return result;
  }

  static async getReportFiles(reportId: string) {
    const db = await getDb(knowledgeBaseReportFiles);
    return db
      .select()
      .from(knowledgeBaseReportFiles)
      .where(eq(knowledgeBaseReportFiles.reportId, reportId))
      .orderBy(knowledgeBaseReportFiles.createdAt);
  }

  static async deleteReportFile(id: string) {
    const db = await getDb(knowledgeBaseReportFiles);
    const [deleted] = await db
      .delete(knowledgeBaseReportFiles)
      .where(eq(knowledgeBaseReportFiles.id, id))
      .returning();
    return deleted || null;
  }
}
