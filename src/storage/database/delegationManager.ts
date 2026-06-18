import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { delegationSettings, users, departments } from "./shared/schema";

export const delegationManager = {
  async getAll() {
    const db = await getDb();
    return db
      .select()
      .from(delegationSettings)
      .orderBy(desc(delegationSettings.createdAt));
  },

  async getById(id: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(delegationSettings)
      .where(eq(delegationSettings.id, id));
    return results[0] || null;
  },

  async getByDelegator(delegatorId: string) {
    const db = await getDb();
    return db
      .select({
        id: delegationSettings.id,
        delegatorId: delegationSettings.delegatorId,
        proxyId: delegationSettings.proxyId,
        approvalTypes: delegationSettings.approvalTypes,
        proxyCode: delegationSettings.proxyCode,
        startDate: delegationSettings.startDate,
        endDate: delegationSettings.endDate,
        isActive: delegationSettings.isActive,
        createdAt: delegationSettings.createdAt,
        updatedAt: delegationSettings.updatedAt,
        proxyName: users.fullName,
        proxyUsername: users.username,
        proxyEmail: users.email,
        proxyDepartmentName: departments.departmentName,
      })
      .from(delegationSettings)
      .leftJoin(users, eq(delegationSettings.proxyId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(delegationSettings.delegatorId, delegatorId))
      .orderBy(desc(delegationSettings.createdAt));
  },

  async getActiveByDelegator(delegatorId: string) {
    const db = await getDb();
    const now = new Date().toISOString().slice(0, 10);
    return db
      .select()
      .from(delegationSettings)
      .where(
        and(
          eq(delegationSettings.delegatorId, delegatorId),
          eq(delegationSettings.isActive, true),
          sql`${delegationSettings.startDate} <= ${now}`,
          sql`${delegationSettings.endDate} >= ${now}`
        )
      )
      .orderBy(desc(delegationSettings.createdAt));
  },

  async getActiveProxiesForApprover(approverId: string) {
    const db = await getDb();
    const now = new Date().toISOString().slice(0, 10);
    return db
      .select()
      .from(delegationSettings)
      .where(
        and(
          eq(delegationSettings.proxyId, approverId),
          eq(delegationSettings.isActive, true),
          sql`${delegationSettings.startDate} <= ${now}`,
          sql`${delegationSettings.endDate} >= ${now}`
        )
      );
  },

  async create(data: {
    delegatorId: string;
    proxyId: string;
    approvalTypes: string[];
    startDate: string;
    endDate: string;
  }) {
    const db = await getDb();
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const proxyCode = `DLG${dateStr}${randomNum}`;

    const results = await db
      .insert(delegationSettings)
      .values({ ...data, proxyCode })
      .returning();
    return results[0];
  },

  async search(params: {
    delegatorId: string;
    agentName?: string;
    approvalType?: string;
    startDate?: string;
    endDate?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
  }) {
    const db = await getDb();
    const conditions: ReturnType<typeof eq>[] = [
      eq(delegationSettings.delegatorId, params.delegatorId),
    ];

    if (params.agentName) {
      const searchPattern = `%${params.agentName}%`;
      conditions.push(
        or(
          like(users.fullName, searchPattern),
          like(users.username, searchPattern),
          like(users.email, searchPattern),
          like(users.phone, searchPattern),
          like(users.employeeNumber, searchPattern)
        )
      );
    }

    if (params.approvalType) {
      conditions.push(
        sql`${delegationSettings.approvalTypes}::jsonb @> ${JSON.stringify([params.approvalType])}::jsonb`
      );
    }

    if (params.startDate) {
      conditions.push(sql`${delegationSettings.startDate} >= ${params.startDate}`);
    }
    if (params.endDate) {
      conditions.push(sql`${delegationSettings.endDate} <= ${params.endDate}`);
    }
    if (params.createdAtStart) {
      conditions.push(sql`${delegationSettings.createdAt} >= ${params.createdAtStart}`);
    }
    if (params.createdAtEnd) {
      conditions.push(sql`${delegationSettings.createdAt} <= ${params.createdAtEnd}`);
    }

    return db
      .select({
        id: delegationSettings.id,
        delegatorId: delegationSettings.delegatorId,
        proxyId: delegationSettings.proxyId,
        approvalTypes: delegationSettings.approvalTypes,
        proxyCode: delegationSettings.proxyCode,
        startDate: delegationSettings.startDate,
        endDate: delegationSettings.endDate,
        isActive: delegationSettings.isActive,
        createdAt: delegationSettings.createdAt,
        updatedAt: delegationSettings.updatedAt,
        proxyName: users.fullName,
        proxyUsername: users.username,
        proxyEmail: users.email,
        proxyDepartmentName: departments.departmentName,
      })
      .from(delegationSettings)
      .leftJoin(users, eq(delegationSettings.proxyId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(delegationSettings.createdAt));
  },

  async update(
    id: string,
    data: Partial<{
      proxyId: string;
      approvalTypes: string[];
      startDate: string;
      endDate: string;
      isActive: boolean;
    }>
  ) {
    const db = await getDb();
    const results = await db
      .update(delegationSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(delegationSettings.id, id))
      .returning();
    return results[0] || null;
  },

  async cancel(id: string) {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    const results = await db
      .update(delegationSettings)
      .set({ isActive: false, endDate: today, updatedAt: new Date() })
      .where(eq(delegationSettings.id, id))
      .returning();
    return results[0] || null;
  },

  async delete(id: string) {
    const db = await getDb();
    await db
      .delete(delegationSettings)
      .where(eq(delegationSettings.id, id));
  },

  async isProxyFor(
    proxyId: string,
    delegatorId: string,
    approvalType: string
  ): Promise<boolean> {
    const db = await getDb();
    const now = new Date().toISOString().slice(0, 10);
    const results = await db
      .select()
      .from(delegationSettings)
      .where(
        and(
          eq(delegationSettings.delegatorId, delegatorId),
          eq(delegationSettings.proxyId, proxyId),
          eq(delegationSettings.isActive, true),
          sql`${delegationSettings.startDate} <= ${now}`,
          sql`${delegationSettings.endDate} >= ${now}`
        )
      );

    return results.some((r) =>
      (r.approvalTypes as string[]).includes(approvalType)
    );
  },

  async findConflictingTypes(
    delegatorId: string,
    approvalTypes: string[],
    excludeId?: string
  ): Promise<string[]> {
    const db = await getDb();
    const now = new Date().toISOString().slice(0, 10);
    const conditions: ReturnType<typeof eq>[] = [
      eq(delegationSettings.delegatorId, delegatorId),
      eq(delegationSettings.isActive, true),
      sql`${delegationSettings.startDate} <= ${now}`,
      sql`${delegationSettings.endDate} >= ${now}`,
    ];
    if (excludeId) {
      conditions.push(sql`${delegationSettings.id} != ${excludeId}`);
    }

    const active = await db
      .select()
      .from(delegationSettings)
      .where(and(...conditions));

    const conflicting: string[] = [];
    for (const type of approvalTypes) {
      const alreadyDelegated = active.some((d) =>
        (d.approvalTypes as string[]).includes(type)
      );
      if (alreadyDelegated) {
        conflicting.push(type);
      }
    }

    return conflicting;
  },
};
