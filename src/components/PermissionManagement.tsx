"use client";

import { useState, useEffect } from "react";
import type { User } from "@/storage/database/shared/schema";
import { UserRoleDisplayNames } from "@/storage/database/shared/schema";

import { useRouter } from "next/navigation";

type ResourceType = "projects" | "tasks" | "users" | "customers" | "customer_contacts" | "contracts" | "orders" | "products" | "deliveries" | "delivery_notes" | "shipments" | "distributions" | "material_labels" | "delivery_basic" | "config";
type PermissionType = "view" | "edit" | "delete" | "use";

interface Department {
  id: string;
  departmentCode: string;
  departmentName: string;
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
  projects: "项目管理",
  tasks: "任务管理",
  users: "用户管理",
  customers: "客户管理",
  customer_contacts: "客户联系人",
  contracts: "合同管理",
  orders: "订单管理",
  products: "产品管理",
  deliveries: "送货管理",
  delivery_notes: "送货单",
  shipments: "发货管理",
  distributions: "配送管理",
  material_labels: "物料标签",
  delivery_basic: "基础资料",
  config: "编码管理",
};

const PERMISSION_NAMES: Record<PermissionType, string> = {
  view: "查看",
  edit: "编辑",
  delete: "删除",
  use: "使用",
};

interface UserPermissions {
  userId: string;
  userName: string;
  permissions: Record<ResourceType, PermissionType[]>;
}

// 获取认证 Token
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

// 创建带认证的请求头
const createAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export default function PermissionManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, UserPermissions>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("permissions-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDeliveryUsers, setExpandedDeliveryUsers] = useState<Set<string>>(new Set());

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("permissions-page-size", pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments?active=true", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        credentials: 'include',
        headers: createAuthHeaders(),
      });
      
      // 处理 401 未授权
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("登录已过期，请重新登录");
        router.push("/login");
        return;
      }
      
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const userList = json.data;
        setUsers(userList);
        // 为所有用户获取权限（并行加载，提升性能）
        await Promise.all(
          userList.map((user: User) => fetchUserPermissions(user.id, user.username))
        );
      } else {
        console.error("Invalid user data format:", json);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string, userName: string) => {
    try {
      const res = await fetch(`/api/permissions/${userId}`, {
        credentials: 'include',
        headers: createAuthHeaders(),
      });
      
      // 处理 401 未授权
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("登录已过期，请重新登录");
        router.push("/login");
        return;
      }
      
      const json = await res.json();

      // API 现在返回按资源分组的数据格式: { projects: ["view", "edit"], tasks: ["view"], ... }
      const permissions: Record<ResourceType, PermissionType[]> = {
        projects: [],
        tasks: [],
        users: [],
        customers: [],
        customer_contacts: [],
        contracts: [],
        orders: [],
        products: [],
        deliveries: [],
        delivery_notes: [],
        shipments: [],
        distributions: [],
        material_labels: [],
        delivery_basic: [],
        config: [],
      };

      // 兼容处理：支持数组格式（旧）和对象格式（新）
      if (json.success && json.data) {
        if (Array.isArray(json.data)) {
          // 旧格式：扁平数组
          json.data.forEach((perm: any) => {
            const resource = perm.resource as ResourceType;
            const permission = perm.permission as PermissionType;
            // 确保 resource 在定义的资源列表中，并且是数组
            if (resource && permissions[resource] && Array.isArray(permissions[resource])) {
              permissions[resource].push(permission);
            }
          });
        } else {
          // 新格式：按资源分组
          Object.entries(json.data).forEach(([resource, perms]) => {
            const res = resource as ResourceType;
            if (permissions[res] !== undefined && Array.isArray(perms)) {
              permissions[res] = [...perms];
            }
          });
        }
      } else {
        console.warn(`Failed to fetch permissions for user ${userName}:`, json.error || "Unknown error");
      }

      setUserPermissions((prev) => ({
        ...prev,
        [userId]: { userId, userName, permissions },
      }));
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      // 即使发生错误，也要创建一个空的权限对象
      setUserPermissions((prev) => ({
        ...prev,
        [userId]: {
          userId,
          userName,
          permissions: {
            projects: [],
            tasks: [],
            users: [],
            customers: [],
            customer_contacts: [],
            contracts: [],
            orders: [],
            products: [],
            deliveries: [],
            delivery_notes: [],
            shipments: [],
            distributions: [],
            material_labels: [],
            delivery_basic: [],
            config: [],
          },
        },
      }));
    }
  };

  const handlePermissionChange = async (
    userId: string,
    resource: ResourceType,
    permission: PermissionType,
    checked: boolean
  ) => {
    try {
      const userPerms = userPermissions[userId];
      if (!userPerms) {
        alert("用户权限数据未加载，请刷新页面后重试");
        return;
      }

      // 获取当前资源的所有权限，确保是数组
      const currentPerms = userPerms.permissions?.[resource];
      let newPermissions = Array.isArray(currentPerms) ? [...currentPerms] : [];

      if (checked) {
        if (!newPermissions.includes(permission)) {
          newPermissions.push(permission);
        }
      } else {
        newPermissions = newPermissions.filter((p) => p !== permission);
      }

      // 确保权限列表是唯一的
      newPermissions = [...new Set(newPermissions)];

      const res = await fetch(`/api/permissions/${userId}`, {
        method: "PUT",
        headers: createAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          resource,
          permissions: newPermissions,
        }),
      });

      console.log("[PermissionManagement] PUT response status:", res.status);

      // 处理 401 未授权
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("登录已过期，请重新登录");
        router.push("/login");
        return;
      }

      console.log("[PermissionManagement] PUT response headers:", res.headers);

      const responseText = await res.text();

      if (!res.ok) {
        alert(`更新权限失败: ${responseText}`);
        return;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        alert(`服务器返回了无效的响应: ${responseText}`);
        return;
      }

      if (!result.success) {
        alert(`更新权限失败: ${result.error || "未知错误"}`);
        return;
      }

      // 更新本地状态
      setUserPermissions((prev) => ({
        ...prev,
        [userId]: {
          ...userPerms,
          permissions: {
            ...userPerms.permissions,
            [resource]: newPermissions,
          },
        },
      }));

    } catch (error) {
      console.error("Error updating permissions:", error);
      alert(`更新权限失败: ${error instanceof Error ? error.message : "请稍后重试"}`);
    }
  };

  const hasPermission = (userId: string, resource: ResourceType, permission: PermissionType): boolean => {
    const userPerms = userPermissions[userId];
    if (!userPerms || !userPerms.permissions || !userPerms.permissions[resource]) {
      return false;
    }
    const perms = userPerms.permissions[resource];
    if (!Array.isArray(perms)) {
      return false;
    }
    return perms.includes(permission);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400">加载中...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">权限管理</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          为用户设置不同模块的查看、编辑和删除权限
        </p>
      </div>

      {/* 统一表格视图 */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {/* 用户信息列 */}
                <th
                  rowSpan={2}
                  className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-600"
                >
                  用户信息
                </th>

                {/* 权限类型表头 */}
                <th
                  colSpan={Object.keys(RESOURCE_NAMES).filter(k => k !== "deliveries").length + 1}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600"
                >
                  资源模块权限
                </th>
              </tr>
              <tr>
                {/* 每个资源的权限（排除deliveries，单独处理） */}
                {Object.entries(RESOURCE_NAMES).filter(([key]) => key !== "deliveries").map(([key, name]) => {
                  const resource = key as ResourceType;
                  const headerPerms = ["查看", "编辑", "删除"];
                  
                  return (
                    <th
                      key={resource}
                      className="px-2 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{name}</span>
                        <div className="flex justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {headerPerms.map((perm, idx) => (
                            <span key={idx} className="w-6">{perm}</span>
                          ))}
                        </div>
                      </div>
                    </th>
                  );
                })}
                {/* 送货管理二级权限表头 */}
                <th
                  className="px-2 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-blue-600 dark:text-blue-400">送货管理</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">点击展开配置</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {/* 用户信息单元格 */}
                  <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.fullName || user.username}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.username}
                      </div>
                      <div className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {UserRoleDisplayNames[user.role as keyof typeof UserRoleDisplayNames] || user.role}
                      </div>
                      {user.departmentId && (
                        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {departments.find(d => d.id === user.departmentId)?.departmentName || ""}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 每个资源的权限单元格 */}
                  {Object.keys(RESOURCE_NAMES).filter(k => k !== "deliveries").map((key) => {
                    const resource = key as ResourceType;
                    const permissionsForResource = ["view", "edit", "delete"] as PermissionType[];
                    
                    return (
                      <td
                        key={resource}
                        className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                      >
                        <div className="flex justify-center gap-2">
                          {permissionsForResource.map((permission) => (
                            <label
                              key={permission}
                              className="cursor-pointer inline-flex items-center justify-center w-6"
                              title={`${PERMISSION_NAMES[permission]} ${RESOURCE_NAMES[resource]}`}
                            >
                              <input
                                type="checkbox"
                                checked={hasPermission(user.id, resource, permission)}
                                onChange={(e) =>
                                  handlePermissionChange(user.id, resource, permission, e.target.checked)
                                }
                                className={`h-4 w-4 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 ${
                                  permission === "view"
                                    ? "text-blue-600"
                                    : permission === "edit"
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              />
                            </label>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                  {/* 送货管理-二级权限展开 */}
                  <td className="px-2 py-1 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0">
                    <button
                      onClick={() => {
                        setExpandedDeliveryUsers(prev => {
                          const next = new Set(prev);
                          if (next.has(user.id)) next.delete(user.id); else next.add(user.id);
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 mx-auto text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      <svg className={`w-3 h-3 transition-transform ${expandedDeliveryUsers.has(user.id) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      送货管理
                    </button>
                    {expandedDeliveryUsers.has(user.id) && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {(["delivery_notes", "shipment", "distribution", "material_labels", "delivery_basic"] as ResourceType[]).map((subKey) => (
                          <div key={subKey} className="flex items-center gap-1">
                            <span className="text-xs w-14 text-right text-gray-500 dark:text-gray-400 truncate" title={DELIVERY_SUB_NAMES[subKey]}>{DELIVERY_SUB_NAMES[subKey]}</span>
                            <div className="flex gap-1">
                              {(["view", "edit", "delete"] as PermissionType[]).map((perm) => (
                                <label key={perm} className="cursor-pointer inline-flex items-center justify-center w-5" title={`${PERMISSION_NAMES[perm]} ${DELIVERY_SUB_NAMES[subKey]}`}>
                                  <input
                                    type="checkbox"
                                    checked={hasPermission(user.id, subKey, perm)}
                                    onChange={(e) => handlePermissionChange(user.id, subKey, perm, e.target.checked)}
                                    className={`h-3 w-3 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 ${
                                      perm === "view" ? "text-blue-600" : perm === "edit" ? "text-yellow-600" : "text-red-600"
                                    }`}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 图例 */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-700">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">权限说明：</span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-600 rounded"></span>
              <span>查看</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-yellow-600 rounded"></span>
              <span>编辑</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-600 rounded"></span>
              <span>删除</span>
            </span>
          </div>
        </div>

        {/* 分页控件 */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">每页显示：</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="50">50 条</option>
                <option value="100">100 条</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">共 {users.length} 条记录</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  首页
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  第 {currentPage} / {Math.ceil(users.length / pageSize) || 1} 页
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(users.length / pageSize) || 1, prev + 1))}
                  disabled={currentPage >= Math.ceil(users.length / pageSize)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  下一页
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(users.length / pageSize) || 1)}
                  disabled={currentPage >= Math.ceil(users.length / pageSize)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端视图 */}
      <div className="md:hidden mt-6 space-y-4">
        {users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((user) => (
          <div
            key={user.id}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {user.fullName || user.username}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.username} · {UserRoleDisplayNames[user.role as keyof typeof UserRoleDisplayNames] || user.role}
              </p>
              {user.departmentId && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  部门：{departments.find(d => d.id === user.departmentId)?.departmentName || "-"}
                </p>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(RESOURCE_NAMES).map(([key, name]) => {
                const resource = key as ResourceType;
                return (
                  <div
                    key={resource}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {name}
                    </span>
                    <div className="flex gap-3">
                      {(["view", "edit", "delete"] as PermissionType[]).map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={hasPermission(user.id, resource, permission)}
                            onChange={(e) =>
                              handlePermissionChange(user.id, resource, permission, e.target.checked)
                            }
                            className={`h-4 w-4 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 ${
                              permission === "view"
                                ? "text-blue-600"
                                : permission === "edit"
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          />
                          {PERMISSION_NAMES[permission]}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 移动端分页控件 */}
      <div className="md:hidden mt-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">每页：</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">共 {users.length} 条</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                首页
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                上一页
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {currentPage}/{Math.ceil(users.length / pageSize) || 1}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(users.length / pageSize) || 1, prev + 1))}
                disabled={currentPage >= Math.ceil(users.length / pageSize)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                下一页
              </button>
              <button
                onClick={() => setCurrentPage(Math.ceil(users.length / pageSize) || 1)}
                disabled={currentPage >= Math.ceil(users.length / pageSize)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                末页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
