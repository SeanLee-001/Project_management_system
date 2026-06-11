import { eq, and, SQL, like, count } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  tasks,
  projects,
  insertTaskSchema,
  updateTaskSchema,
} from "./shared/schema";
import type { Task, InsertTask, UpdateTask } from "./shared/schema";

export class TaskManager {
  async createTask(data: InsertTask): Promise<Task> {
    const db = await getDb();

    // 清理空字符串，转换为null
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    );

    const validated = insertTaskSchema.parse(cleanedData);

    // 如果没有提供任务编码，自动生成
    if (!validated.taskCode && validated.projectId) {
      validated.taskCode = await this.generateTaskCode(validated.projectId);
    }

    const [task] = await db.insert(tasks).values(validated).returning();
    return task;
  }

  async generateTaskCode(projectId: string): Promise<string> {
    const db = await getDb();

    // 获取项目编号
    const [project] = await db
      .select({ projectCode: projects.projectCode })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project || !project.projectCode) {
      throw new Error("项目编号不存在");
    }

    // 查询该项目的任务数量
    const [result] = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    const taskCount = result?.count || 0;

    // 生成任务编码：项目编号 + 3位序号
    const sequence = (taskCount + 1).toString().padStart(3, "0");
    return `${project.projectCode}${sequence}`;
  }

  async getTasks(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<Task, "id" | "projectId" | "status" | "priority">>;
  } = {}): Promise<Task[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(tasks.id, filters.id));
    }
    if (filters.projectId !== undefined) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }
    if (filters.status !== undefined) {
      conditions.push(eq(tasks.status, filters.status));
    }
    if (filters.priority !== undefined) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
        .orderBy(tasks.createdAt);
    }

    return db
      .select()
      .from(tasks)
      .limit(limit)
      .offset(skip)
      .orderBy(tasks.createdAt);
  }

  async getTaskById(id: string): Promise<Task | null> {
    const db = await getDb();
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || null;
  }

  async updateTask(id: string, data: UpdateTask): Promise<Task | null> {
    const db = await getDb();

    console.log("updateTask input:", data);

    try {
      // 清理空字符串，转换为null
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === "" ? null : value,
        ])
      );

      console.log("updateTask cleaned:", cleanedData);

      const validated = updateTaskSchema.parse(cleanedData);
      console.log("updateTask validated:", validated);

      const [task] = await db
        .update(tasks)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();

      return task || null;
    } catch (error) {
      console.error("Error in updateTask:", error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    const db = await getDb();
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.createdAt);
  }
}

export const taskManager = new TaskManager();
