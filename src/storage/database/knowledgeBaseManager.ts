import { eq, and, or, SQL, like, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  knowledgeBase,
  knowledgeBaseAttachments,
  insertKnowledgeBaseSchema,
  updateKnowledgeBaseSchema,
  insertKnowledgeBaseAttachmentSchema,
} from "./shared/schema";
import type {
  KnowledgeBase,
  InsertKnowledgeBase,
  UpdateKnowledgeBase,
  KnowledgeBaseAttachment,
  InsertKnowledgeBaseAttachment,
} from "./shared/schema";

export class KnowledgeBaseManager {
  // 创建知识库
  async createKnowledgeBase(data: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const db = await getDb();
    const validated = insertKnowledgeBaseSchema.parse(data);
    const [kb] = await db.insert(knowledgeBase).values(validated).returning();
    return kb;
  }

  // 更新知识库
  async updateKnowledgeBase(
    id: string,
    data: UpdateKnowledgeBase & { updatedBy: string }
  ): Promise<KnowledgeBase | null> {
    const db = await getDb();
    const validated = updateKnowledgeBaseSchema.parse(data);
    
    const [updated] = await db
      .update(knowledgeBase)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id))
      .returning();
    
    return updated || null;
  }

  // 删除知识库
  async deleteKnowledgeBase(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id)).returning();
    return result.length > 0;
  }

  // 获取知识库详情
  async getKnowledgeBaseById(id: string): Promise<KnowledgeBase | null> {
    const db = await getDb();
    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    
    // 增加浏览次数
    if (kb) {
      await db
        .update(knowledgeBase)
        .set({ viewCount: (parseInt(kb.viewCount || '0') + 1).toString() })
        .where(eq(knowledgeBase.id, id));
    }
    
    return kb || null;
  }

  // 获取知识库列表
  async getKnowledgeBaseList(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<KnowledgeBase, "category" | "projectId" | "taskId" | "createdBy">>;
    searchKeyword?: string;
  } = {}): Promise<{ data: KnowledgeBase[]; total: number }> {
    const { skip = 0, limit = 100, filters = {}, searchKeyword } = options;
    const db = await getDb();

    const conditions: SQL[] = [];

    // 添加过滤条件
    if (filters.category !== undefined) {
      conditions.push(eq(knowledgeBase.category, filters.category));
    }
    if (filters.projectId !== undefined) {
      conditions.push(eq(knowledgeBase.projectId, filters.projectId as string));
    }
    if (filters.taskId !== undefined) {
      conditions.push(eq(knowledgeBase.taskId, filters.taskId as string));
    }
    if (filters.createdBy !== undefined) {
      conditions.push(eq(knowledgeBase.createdBy, filters.createdBy as string));
    }

    // 添加搜索条件（标题和内容）
    if (searchKeyword) {
      conditions.push(
        or(
          like(knowledgeBase.title, `%${searchKeyword}%`),
          like(knowledgeBase.content || '', `%${searchKeyword}%`)
        )!
      );
    }

    // 获取总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBase)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 获取数据
    const data = await db
      .select()
      .from(knowledgeBase)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(knowledgeBase.createdAt))
      .limit(limit)
      .offset(skip);

    return { data, total: Number(count) };
  }

  // 获取知识库附件列表
  async getAttachmentsByKnowledgeBaseId(
    knowledgeBaseId: string
  ): Promise<KnowledgeBaseAttachment[]> {
    const db = await getDb();
    return await db
      .select()
      .from(knowledgeBaseAttachments)
      .where(eq(knowledgeBaseAttachments.knowledgeBaseId, knowledgeBaseId))
      .orderBy(knowledgeBaseAttachments.createdAt);
  }

  // 上传附件
  async uploadAttachment(data: InsertKnowledgeBaseAttachment): Promise<KnowledgeBaseAttachment> {
    const db = await getDb();
    const validated = insertKnowledgeBaseAttachmentSchema.parse(data);
    const [attachment] = await db.insert(knowledgeBaseAttachments).values(validated).returning();
    return attachment;
  }

  // 删除附件
  async deleteAttachment(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(knowledgeBaseAttachments).where(eq(knowledgeBaseAttachments.id, id)).returning();
    return result.length > 0;
  }

  // 根据项目自动生成知识库
  async autoGenerateForProject(projectId: string, projectName: string, userId?: string): Promise<KnowledgeBase> {
    const db = await getDb();
    
    // 检查是否已存在该项目的知识库
    const existing = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.projectId, projectId))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    // 创建新的知识库
    const [kb] = await db.insert(knowledgeBase).values({
      title: `项目知识库 - ${projectName}`,
      content: `本知识库记录了项目 "${projectName}" 的相关文档和资料。`,
      projectId,
      category: 'project',
      createdBy: userId || null,
      viewCount: '0',
    }).returning();

    return kb;
  }

  // 根据任务自动生成知识库
  async autoGenerateForTask(taskId: string, taskTitle: string, userId?: string): Promise<KnowledgeBase> {
    const db = await getDb();
    
    // 检查是否已存在该任务的知识库
    const existing = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.taskId, taskId))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    // 创建新的知识库
    const [kb] = await db.insert(knowledgeBase).values({
      title: `任务知识库 - ${taskTitle}`,
      content: `本知识库记录了任务 "${taskTitle}" 的相关文档和资料。`,
      taskId,
      category: 'task',
      createdBy: userId || null,
      viewCount: '0',
    }).returning();

    return kb;
  }
}

export const knowledgeBaseManager = new KnowledgeBaseManager();
