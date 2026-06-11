import { eq, and } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { departmentPermissions } from "./shared/schema";
import { ResourceType, PermissionType } from "./permissionManager";

export const departmentPermissionManager = {
  // 获取部门的所有权限
  async getDepartmentPermissions(departmentId: string) {
    const db = await getDb();
    return db
      .select()
      .from(departmentPermissions)
      .where(eq(departmentPermissions.departmentId, departmentId));
  },

  // 获取部门在指定资源的所有权限
  async getDepartmentResourcePermissions(
    departmentId: string,
    resource: ResourceType
  ) {
    const db = await getDb();
    return db
      .select()
      .from(departmentPermissions)
      .where(
        and(
          eq(departmentPermissions.departmentId, departmentId),
          eq(departmentPermissions.resource, resource)
        )
      );
  },

  // 检查部门是否有指定资源的特定权限
  async hasPermission(
    departmentId: string,
    resource: ResourceType,
    permission: PermissionType
  ): Promise<boolean> {
    const db = await getDb();
    const results = await db
      .select()
      .from(departmentPermissions)
      .where(
        and(
          eq(departmentPermissions.departmentId, departmentId),
          eq(departmentPermissions.resource, resource),
          eq(departmentPermissions.permission, permission)
        )
      );

    return results.length > 0;
  },

  // 为部门添加权限
  async addPermission(data: {
    departmentId: string;
    resource: ResourceType;
    permission: PermissionType;
  }) {
    const db = await getDb();

    // 检查权限是否已存在
    const existing = await db
      .select()
      .from(departmentPermissions)
      .where(
        and(
          eq(departmentPermissions.departmentId, data.departmentId),
          eq(departmentPermissions.resource, data.resource),
          eq(departmentPermissions.permission, data.permission)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db
      .insert(departmentPermissions)
      .values({
        departmentId: data.departmentId,
        resource: data.resource,
        permission: data.permission,
      })
      .returning();
    return result[0];
  },

  // 为部门添加多个权限
  async addPermissions(
    departmentId: string,
    permissions: Array<{ resource: ResourceType; permission: PermissionType }>
  ) {
    const results = [];
    for (const perm of permissions) {
      const result = await departmentPermissionManager.addPermission({
        departmentId,
        resource: perm.resource,
        permission: perm.permission,
      });
      results.push(result);
    }
    return results;
  },

  // 移除部门权限
  async removePermission(data: {
    departmentId: string;
    resource: ResourceType;
    permission: PermissionType;
  }) {
    const db = await getDb();
    await db
      .delete(departmentPermissions)
      .where(
        and(
          eq(departmentPermissions.departmentId, data.departmentId),
          eq(departmentPermissions.resource, data.resource),
          eq(departmentPermissions.permission, data.permission)
        )
      );
    return true;
  },

  // 移除部门所有权限
  async removeAllPermissions(departmentId: string) {
    const db = await getDb();
    await db
      .delete(departmentPermissions)
      .where(eq(departmentPermissions.departmentId, departmentId));
    return true;
  },

  // 批量设置部门权限（先删除再添加）
  async setDepartmentPermissions(
    departmentId: string,
    permissions: Array<{ resource: ResourceType; permission: PermissionType }>
  ) {
    // 先移除所有现有权限
    await departmentPermissionManager.removeAllPermissions(departmentId);

    // 添加新权限
    if (permissions.length > 0) {
      await departmentPermissionManager.addPermissions(departmentId, permissions);
    }

    return true;
  },
};
