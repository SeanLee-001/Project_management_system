import { eq, and, or, SQL, like, sql, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  projects,
  projectApprovals,
  insertProjectSchema,
  updateProjectSchema,
} from "./shared/schema";
import type { Project, InsertProject, UpdateProject } from "./shared/schema";

export class ProjectManager {
  async createProject(data: InsertProject): Promise<Project> {
    const db = await getDb();

    // 处理日期字段，将字符串转换为Date对象
    const processedData: any = { ...data };
    const dateFields = [
      'startDate', 'endDate', 'orderDate', 'deliveryDate', 'contractDate'
    ];

    dateFields.forEach(field => {
      // 检查字段是否存在且不为空字符串
      if (processedData[field] !== undefined && processedData[field] !== null && processedData[field] !== "") {
        if (typeof processedData[field] === 'string') {
          const dateValue = new Date(processedData[field]);
          // 检查日期是否有效
          if (!isNaN(dateValue.getTime())) {
            processedData[field] = dateValue;
          } else {
            // 如果日期无效，设置为 undefined
            processedData[field] = undefined;
          }
        }
      } else {
        // 如果字段为空字符串、null 或 undefined，设置为 undefined
        processedData[field] = undefined;
      }
    });

    const validated = insertProjectSchema.parse(processedData);
    const [project] = await db.insert(projects).values(validated).returning();
    return project;
  }

  async getProjects(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<Project, "id" | "status">>;
    userId?: string; // 当前用户ID，用于过滤待审批项目
  } = {}): Promise<Project[]> {
    const { skip = 0, limit = 100, filters = {}, userId } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(projects.id, filters.id));
    }
    if (filters.status !== undefined) {
      conditions.push(eq(projects.status, filters.status));
    }

    let projectList: Project[] = [];

    if (conditions.length > 0) {
      projectList = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
        .orderBy(desc(projects.createdAt));
    } else {
      projectList = await db
        .select()
        .from(projects)
        .limit(limit)
        .offset(skip)
        .orderBy(desc(projects.createdAt));
    }

    // 如果没有提供用户ID，返回所有项目（向后兼容）
    if (!userId) {
      return projectList;
    }

    // 获取所有待审批的项目ID
    const pendingApprovals = await db
      .select({ projectId: projectApprovals.projectId, applicantId: projectApprovals.applicantId })
      .from(projectApprovals)
      .where(eq(projectApprovals.status, "pending"));

    const pendingProjectIds = new Set(pendingApprovals.map(a => a.projectId));
    const pendingApplicantMap = new Map(pendingApprovals.map(a => [a.projectId, a.applicantId]));

    // 过滤项目：只返回没有待审批记录的项目，或者待审批项目的申请人
    return projectList.filter(project => {
      if (!pendingProjectIds.has(project.id)) {
        return true; // 没有待审批记录，可见
      }
      // 有待审批记录，只有申请人可见
      return pendingApplicantMap.get(project.id) === userId;
    });
  }

  async getProjectById(id: string): Promise<Project | null> {
    const db = await getDb();
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || null;
  }

  async getProjectByProjectCode(projectCode: string): Promise<Project | null> {
    const db = await getDb();
    const [project] = await db.select().from(projects).where(eq(projects.projectCode, projectCode));
    return project || null;
  }

  async updateProject(id: string, data: UpdateProject): Promise<Project | null> {
    const db = await getDb();

    // 处理日期字段，将字符串转换为Date对象
    const processedData: any = { ...data };
    const dateFields = [
      'startDate', 'endDate', 'orderDate', 'deliveryDate', 'contractDate'
    ];

    dateFields.forEach(field => {
      // 检查字段是否存在且不为空字符串
      if (processedData[field] !== undefined && processedData[field] !== null && processedData[field] !== "") {
        if (typeof processedData[field] === 'string') {
          const dateValue = new Date(processedData[field]);
          // 检查日期是否有效
          if (!isNaN(dateValue.getTime())) {
            processedData[field] = dateValue;
          } else {
            // 如果日期无效，设置为 undefined
            processedData[field] = undefined;
          }
        }
      } else {
        // 如果字段为空字符串、null 或 undefined，设置为 undefined
        processedData[field] = undefined;
      }
    });

    const validated = updateProjectSchema.parse(processedData);
    const [project] = await db
      .update(projects)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || null;
  }

  async deleteProject(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getProjectOptions(): Promise<{ id: string; name: string }[]> {
    const db = await getDb();
    return db
      .select({
        id: projects.id,
        name: projects.name,
      })
      .from(projects)
      .where(eq(projects.status, "active"))
      .orderBy(projects.name);
  }

  // 高级查询（支持多种条件组合）
  async advancedSearch(params: {
    keyword?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    customerName?: string;
  }, userId?: string): Promise<Project[]> {
    const db = await getDb();
    const conditions: SQL[] = [];

    // 关键词搜索（项目名称、描述）
    if (params.keyword) {
      const keywordPattern = `%${params.keyword}%`;
      conditions.push(
        sql`(${like(projects.name, keywordPattern)} OR ${like(projects.description, keywordPattern)})`
      );
    }

    // 客户名称搜索（在项目名称或描述中搜索客户名称）
    if (params.customerName) {
      const customerPattern = `%${params.customerName}%`;
      conditions.push(
        sql`(${like(projects.name, customerPattern)} OR ${like(projects.description, customerPattern)})`
      );
    }

    // 状态过滤
    if (params.status) {
      conditions.push(eq(projects.status, params.status));
    }

    // 年度查询 - 基于开始日期（仅查询startDate不为null的项目）
    if (params.year && !params.month) {
      conditions.push(
        sql`${projects.startDate} IS NOT NULL AND EXTRACT(YEAR FROM ${projects.startDate}) = ${params.year}`
      );
    }

    // 年度和月度查询
    if (params.year && params.month) {
      conditions.push(
        sql`${projects.startDate} IS NOT NULL AND EXTRACT(YEAR FROM ${projects.startDate}) = ${params.year} AND EXTRACT(MONTH FROM ${projects.startDate}) = ${params.month}`
      );
    }

    // 日期范围查询
    if (params.startDate && params.endDate) {
      conditions.push(
        sql`${projects.startDate} >= ${new Date(params.startDate)} AND ${projects.startDate} <= ${new Date(params.endDate)}`
      );
    } else if (params.startDate) {
      conditions.push(
        sql`${projects.startDate} >= ${new Date(params.startDate)}`
      );
    } else if (params.endDate) {
      conditions.push(
        sql`${projects.startDate} <= ${new Date(params.endDate)}`
      );
    }

    // 执行查询
    let projectList: Project[] = [];
    if (conditions.length > 0) {
      projectList = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.createdAt));
    } else {
      projectList = await db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt));
    }

    // 如果没有提供用户ID，返回所有项目（向后兼容）
    if (!userId) {
      return projectList;
    }

    // 获取所有待审批的项目ID
    const pendingApprovals = await db
      .select({ projectId: projectApprovals.projectId, applicantId: projectApprovals.applicantId })
      .from(projectApprovals)
      .where(eq(projectApprovals.status, "pending"));

    const pendingProjectIds = new Set(pendingApprovals.map(a => a.projectId));
    const pendingApplicantMap = new Map(pendingApprovals.map(a => [a.projectId, a.applicantId]));

    // 过滤项目：只返回没有待审批记录的项目，或者待审批项目的申请人
    return projectList.filter(project => {
      if (!pendingProjectIds.has(project.id)) {
        return true; // 没有待审批记录，可见
      }
      // 有待审批记录，只有申请人可见
      return pendingApplicantMap.get(project.id) === userId;
    });

    // 如果有条件，组合查询
    if (conditions.length > 0) {
      return db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.createdAt));
    }

    // 默认返回所有项目
    return db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }
}

export const projectManager = new ProjectManager();
