import { eq, and } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { userPermissions } from "./shared/schema";

// 资源类型定义
export type ResourceType = "projects" | "tasks" | "users" | "customers" | "customer_contacts" | "contracts" | "orders" | "products" | "config";

// 权限类型定义
export type PermissionType = "view" | "edit" | "delete" | "use";

export const permissionManager = {
  // 获取用户的所有权限
  async getUserPermissions(userId: string) {
    const db = await getDb();
    return db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
  },

  // 获取用户在指定资源的所有权限
  async getUserResourcePermissions(userId: string, resource: ResourceType) {
    const db = await getDb();
    return db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.resource, resource)
        )
      );
  },

  // 检查用户是否有指定资源的特定权限
  async hasPermission(
    userId: string,
    resource: ResourceType,
    permission: PermissionType
  ): Promise<boolean> {
    const db = await getDb();
    const results = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.resource, resource),
          eq(userPermissions.permission, permission)
        )
      );

    return results.length > 0;
  },

  // 为用户添加权限
  async addPermission(data: {
    userId: string;
    resource: ResourceType;
    permission: PermissionType;
  }) {
    const db = await getDb();

    // 检查是否已存在相同权限
    const existing = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, data.userId),
          eq(userPermissions.resource, data.resource),
          eq(userPermissions.permission, data.permission)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const results = await db.insert(userPermissions).values(data).returning();
    return results[0];
  },

  // 删除用户权限
  async removePermission(id: string) {
    const db = await getDb();
    const results = await db
      .delete(userPermissions)
      .where(eq(userPermissions.id, id))
      .returning();
    return results[0];
  },

  // 删除用户在指定资源的特定权限
  async removeUserResourcePermission(userId: string, resource: ResourceType, permission: PermissionType) {
    const db = await getDb();
    const results = await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.resource, resource),
          eq(userPermissions.permission, permission)
        )
      )
      .returning();
    return results;
  },

  // 删除用户在指定资源的所有权限
  async removeUserResourcePermissions(userId: string, resource: ResourceType) {
    const db = await getDb();
    const results = await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.resource, resource)
        )
      )
      .returning();
    return results;
  },

  // 删除用户的所有权限
  async removeUserAllPermissions(userId: string) {
    const db = await getDb();
    const results = await db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, userId))
      .returning();
    return results;
  },

  // 批量为用户设置权限（先删除该资源的所有权限，再添加新权限）
  async setUserPermissions(userId: string, resource: ResourceType, permissions: PermissionType[]) {
    const db = await getDb();

    console.log("[permissionManager] Setting permissions:", { userId, resource, permissions });

    // 先删除该资源的所有权限
    await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.resource, resource)
        )
      );

    // 添加新权限
    if (permissions.length === 0) {
      console.log("[permissionManager] No new permissions to add");
      return [];
    }

    const insertData = permissions.map((permission) => ({
      userId,
      resource,
      permission,
    }));

    console.log("[permissionManager] Inserting new permissions:", insertData);

    try {
      const results = await db
        .insert(userPermissions)
        .values(insertData)
        .returning();

      console.log("[permissionManager] Permissions inserted successfully:", results);
      return results;
    } catch (error) {
      console.error("[permissionManager] Error inserting permissions:", error);
      throw error;
    }
  },
};
