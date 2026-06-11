import { permissionManager, type ResourceType, type PermissionType } from "@/storage/database";

// 检查用户是否有权限
export async function checkUserPermission(
  userId: string | undefined,
  resource: ResourceType,
  permission: PermissionType
): Promise<boolean> {
  if (!userId) return false;

  // 系统管理员拥有所有权限
  // 注意：这里需要从数据库获取用户角色，或者从传入的用户信息中获取
  // 为了简化，我们假设调用者已经检查了角色
  // 实际使用时，应该在调用此函数前先检查是否是系统管理员

  // 检查用户是否有该资源的特定权限
  return await permissionManager.hasPermission(userId, resource, permission);
}

// 检查用户是否有查看权限
export async function canView(userId: string | undefined, resource: ResourceType): Promise<boolean> {
  return checkUserPermission(userId, resource, "view");
}

// 检查用户是否有编辑权限
export async function canEdit(userId: string | undefined, resource: ResourceType): Promise<boolean> {
  return checkUserPermission(userId, resource, "edit");
}

// 检查用户是否有删除权限
export async function canDelete(userId: string | undefined, resource: ResourceType): Promise<boolean> {
  return checkUserPermission(userId, resource, "delete");
}
