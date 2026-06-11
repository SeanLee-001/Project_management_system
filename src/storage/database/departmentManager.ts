import { eq, and } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { departments } from "./shared/schema";

export const departmentManager = {
  // 获取所有部门
  async getAllDepartments() {
    const db = await getDb();
    return db.select().from(departments).orderBy(departments.departmentCode);
  },

  // 获取所有启用的部门
  async getActiveDepartments() {
    const db = await getDb();
    return db
      .select()
      .from(departments)
      .where(eq(departments.status, "active"))
      .orderBy(departments.departmentCode);
  },

  // 根据ID获取部门
  async getDepartmentById(id: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));
    return results[0] || null;
  },

  // 根据部门代码获取部门
  async getDepartmentByCode(code: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(departments)
      .where(eq(departments.departmentCode, code));
    return results[0] || null;
  },

  // 创建部门
  async createDepartment(data: {
    departmentCode: string;
    departmentName: string;
    description?: string;
    status?: string;
  }) {
    const db = await getDb();
    const result = await db
      .insert(departments)
      .values({
        departmentCode: data.departmentCode,
        departmentName: data.departmentName,
        description: data.description,
        status: data.status || "active",
      })
      .returning();
    return result[0];
  },

  // 更新部门
  async updateDepartment(
    id: string,
    data: {
      departmentCode?: string;
      departmentName?: string;
      description?: string;
      status?: string;
    }
  ) {
    const db = await getDb();
    const result = await db
      .update(departments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();
    return result[0];
  },

  // 删除部门
  async deleteDepartment(id: string) {
    const db = await getDb();
    await db.delete(departments).where(eq(departments.id, id));
    return true;
  },

  // 检查部门代码是否已存在
  async isDepartmentCodeExists(code: string, excludeId?: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(departments)
      .where(eq(departments.departmentCode, code));
    
    if (results.length === 0) return false;
    if (excludeId && results[0].id === excludeId) return false;
    return true;
  },
};
