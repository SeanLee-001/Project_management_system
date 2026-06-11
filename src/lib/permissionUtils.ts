"use client";

// 权限检查工具函数

type ResourceType = "projects" | "tasks" | "users" | "customers" | "customer_contacts" | "contracts" | "orders" | "products" | "config";
type PermissionType = "view" | "edit" | "delete" | "use";

// 资源名称映射
export const RESOURCE_NAMES: Record<ResourceType, string> = {
  projects: "项目管理",
  tasks: "任务管理",
  users: "用户管理",
  customers: "客户管理",
  customer_contacts: "客户联系人",
  contracts: "合同管理",
  orders: "订单管理",
  products: "产品管理",
  config: "编码管理",
};

// 权限名称映射
export const PERMISSION_NAMES: Record<PermissionType, string> = {
  view: "查看",
  edit: "编辑",
  delete: "删除",
  use: "使用",
};

// 缓存用户权限以减少 API 调用
// API返回格式: Record<string, string[]>  即 { "user_id": ["view", "edit", ...] }
type PermissionsCache = {
  permissions: Record<string, Record<string, string[]>>;
  timestamp: number;
} | null;

let cachedPermissions: PermissionsCache = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 检查用户是否具有指定资源的指定权限
 */
export async function checkPermission(
  resource: ResourceType,
  permission: PermissionType
): Promise<boolean> {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    
    // 管理员默认有所有权限
    if (user.role === "system_admin" || user.role === "admin" || user.role === "administrator") {
      return true;
    }
    
    // 获取当前缓存
    const now = Date.now();
    if (cachedPermissions && (now - cachedPermissions.timestamp) < CACHE_DURATION) {
      const userPerms = cachedPermissions.permissions[user.id];
      if (userPerms && Array.isArray(userPerms[resource])) {
        return userPerms[resource].includes(permission);
      }
      return false;
    }
    
    // 获取用户权限
    const res = await fetch("/api/permissions", { 
      credentials: "include",
      cache: "no-store"
    });
    
    if (!res.ok) return false;
    
    const json = await res.json();
    
    if (json.success && json.data) {
      // 更新缓存
      cachedPermissions = {
        permissions: json.data as Record<string, Record<string, string[]>>,
        timestamp: now,
      };
      
      const userPerms = json.data[user.id];
      if (userPerms && Array.isArray(userPerms[resource])) {
        return userPerms[resource].includes(permission);
      }
    }
    
    return false;
  } catch (error) {
    console.error("检查权限失败:", error);
    return false;
  }
}

/**
 * 显示无权限弹窗
 */
export function showNoPermissionAlert(): void {
  alert("无操作权限，请联系权限管理人员");
}

/**
 * 带权限检查的操作包装器
 * 如果没有权限，显示提示并阻止操作
 */
export async function withPermissionCheck(
  resource: ResourceType,
  permission: PermissionType,
  callback: () => void | Promise<void>
): Promise<void> {
  const hasPermission = await checkPermission(resource, permission);
  if (!hasPermission) {
    showNoPermissionAlert();
    return;
  }
  await callback();
}

/**
 * 检查多个权限（任一满足即可）
 */
export async function checkAnyPermission(
  resource: ResourceType,
  permissions: PermissionType[]
): Promise<boolean> {
  for (const perm of permissions) {
    if (await checkPermission(resource, perm)) {
      return true;
    }
  }
  return false;
}

/**
 * 清除权限缓存（用户切换或权限更新后调用）
 */
export function clearPermissionCache(): void {
  cachedPermissions = null;
}

/**
 * 检查用户是否是管理员
 */
export function isAdmin(): boolean {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return user.role === "admin" || user.role === "administrator";
  } catch {
    return false;
  }
}
