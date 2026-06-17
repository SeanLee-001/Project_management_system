"use client";

import React, { useState, useEffect } from "react";
import type { ReactElement } from "react";
import type { User, Department } from "@/storage/database/shared/schema";
import { UserRoleDisplayNames, UserRole } from "@/storage/database/shared/schema";
import { ResizableTable, Column } from "@/components/ResizableTable";

// 送货管理子模块
const deliverySubModules = [
  { key: "delivery_notes", label: "送货单" },
  { key: "shipments", label: "发货" },
  { key: "distribution", label: "配送" },
  { key: "material_labels", label: "物料标签" },
  { key: "delivery_basic", label: "基础资料" },
];

// 资源类型
const resources = [
  { key: "projects", label: "项目管理" },
  { key: "tasks", label: "任务管理" },
  { key: "customers", label: "客户管理" },
  { key: "customer_contacts", label: "联系人管理" },
  { key: "contracts", label: "合同管理" },
  { key: "orders", label: "订单管理" },
  { key: "products", label: "产品管理" },
  { key: "deliveries", label: "送货管理", hasSubModules: true },
  { key: "users", label: "用户管理" },
  { key: "config", label: "系统配置" },
  { key: "financial", label: "财务管理" },
];

// 权限类型
const permissionTypes = [
  { key: "view", label: "查看" },
  { key: "edit", label: "编辑" },
  { key: "delete", label: "删除" },
];

export default function PermissionManagementMerged() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);

  // 权限配置相关状态
  const [permissions, setPermissions] = useState<Record<string, Record<string, string[]>>>({});
  // 临时权限状态（用于编辑，关闭时不保存）
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, Record<string, string[]>>>({});
  // 保存状态
  const [isSaving, setIsSaving] = useState(false);
  // 送货管理展开状态
  const [expandedDeliveries, setExpandedDeliveries] = useState<Record<string, boolean>>({});

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("permissions-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("permissions-page-size", pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setDepartments(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const getDepartmentName = (departmentId: string | null | undefined) => {
    if (!departmentId) return "-";
    const dept = departments.find(d => d.id === departmentId);
    return dept?.departmentName || "-";
  };

  // 打开权限配置弹窗
  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionModal(true);
    // 从服务器获取该用户的权限并初始化临时状态
    fetchUserPermissions(user.id);
  };

  // 获取指定用户的权限
  const fetchUserPermissions = async (userId: string) => {
    setPermissionLoading(true);
    try {
      const res = await fetch(`/api/user-permissions?userId=${userId}`, { credentials: "include" });
      const json = await res.json();
      if (json.success && json.data) {
        // 更新服务器数据
        setPermissions(prev => ({
          ...prev,
          [userId]: json.data[userId] || {}
        }));
        // 初始化临时数据（用于编辑）
        setPendingPermissions(prev => ({
          ...prev,
          [userId]: JSON.parse(JSON.stringify(json.data[userId] || {}))
        }));
      } else {
        // 如果没有数据，初始化空权限
        setPendingPermissions(prev => ({
          ...prev,
          [userId]: {}
        }));
      }
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      setPendingPermissions(prev => ({
        ...prev,
        [userId]: {}
      }));
    } finally {
      setPermissionLoading(false);
    }
  };

  // 获取用户权限（用于显示）
  const getUserPermissions = (userId: string): Record<string, string[]> => {
    // 优先使用临时数据
    if (pendingPermissions[userId]) {
      return pendingPermissions[userId];
    }
    return permissions[userId] || {};
  };

  // 检查是否有某权限
  const hasPermission = (userId: string, resource: string, permission: string) => {
    const userPerms = getUserPermissions(userId);
    const resourcePerms = userPerms[resource] || [];
    return resourcePerms.includes(permission);
  };

  // 切换权限（仅更新本地状态，不调用API）
  const handleTogglePermission = (userId: string, resource: string, permission: string, checked: boolean) => {
    setPendingPermissions(prev => {
      const userPerms = prev[userId] || {};
      const resourcePerms = userPerms[resource] || [];
      
      let newResourcePerms: string[];
      if (checked) {
        // 添加权限
        newResourcePerms = [...resourcePerms, permission];
      } else {
        // 移除权限
        newResourcePerms = resourcePerms.filter(p => p !== permission);
      }
      
      return {
        ...prev,
        [userId]: {
          ...userPerms,
          [resource]: newResourcePerms
        }
      };
    });
  };

  // 保存权限配置
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    setIsSaving(true);
    const userId = selectedUser.id;
    const originalPerms = permissions[userId] || {};
    const newPerms = pendingPermissions[userId] || {};
    
    try {
      // 计算需要添加和删除的权限
      const toAdd: { resource: string; permission: string }[] = [];
      const toDelete: { resource: string; permission: string }[] = [];
      
      // 遍历主资源
      for (const resource of resources) {
        const originalResourcePerms = originalPerms[resource.key] || [];
        const newResourcePerms = newPerms[resource.key] || [];
        
        // 找出需要添加的权限
        for (const perm of newResourcePerms) {
          if (!originalResourcePerms.includes(perm)) {
            toAdd.push({ resource: resource.key, permission: perm });
          }
        }
        
        // 找出需要删除的权限
        for (const perm of originalResourcePerms) {
          if (!newResourcePerms.includes(perm)) {
            toDelete.push({ resource: resource.key, permission: perm });
          }
        }
      }
      
      // 遍历送货管理子模块
      for (const subModule of deliverySubModules) {
        const originalResourcePerms = originalPerms[subModule.key] || [];
        const newResourcePerms = newPerms[subModule.key] || [];
        
        // 找出需要添加的权限
        for (const perm of newResourcePerms) {
          if (!originalResourcePerms.includes(perm)) {
            toAdd.push({ resource: subModule.key, permission: perm });
          }
        }
        
        // 找出需要删除的权限
        for (const perm of originalResourcePerms) {
          if (!newResourcePerms.includes(perm)) {
            toDelete.push({ resource: subModule.key, permission: perm });
          }
        }
      }
      
      // 批量添加权限
      for (const { resource, permission } of toAdd) {
        const res = await fetch("/api/user-permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, resource, permission }),
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.error || "添加权限失败");
        }
      }
      
      // 批量删除权限
      for (const { resource, permission } of toDelete) {
        const res = await fetch("/api/user-permissions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, resource, permission }),
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.error || "删除权限失败");
        }
      }
      
      // 更新本地状态
      setPermissions(prev => ({
        ...prev,
        [userId]: newPerms
      }));
      
      // 关闭弹窗
      setShowPermissionModal(false);
      setSelectedUser(null);
      setPendingPermissions({});
      setExpandedDeliveries({});
      
      alert("权限保存成功");
    } catch (error) {
      console.error("Error saving permissions:", error);
      alert("保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  // 关闭弹窗（不保存）
  const handleCloseModal = () => {
    // 清空临时状态，不保存
    setPendingPermissions({});
    setShowPermissionModal(false);
    setSelectedUser(null);
    setExpandedDeliveries({});
  };

  // 切换送货管理展开/收起状态
  const toggleDeliveryExpand = () => {
    if (!selectedUser) return;
    setExpandedDeliveries(prev => ({
      ...prev,
      [selectedUser.id]: !prev[selectedUser.id]
    }));
  };

  // 检查送货管理是否展开
  const isDeliveryExpanded = (userId: string) => {
    return !!expandedDeliveries[userId];
  };

  // 格式化为日期
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // 定义表格列配置
  const userColumns: Column<User>[] = [
    {
      key: "username",
      title: "用户名",
      width: 120,
      sortable: true,
      render: (value, row) => (
        <button
          onClick={() => handleManagePermissions(row)}
          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer text-left"
        >
          {value}
        </button>
      ),
    },
    {
      key: "fullName",
      title: "姓名",
      width: 120,
      sortable: true,
      render: (value, row) => (
        <button
          onClick={() => handleManagePermissions(row)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer text-left"
        >
          {value || "-"}
        </button>
      ),
    },
    {
      key: "role",
      title: "角色",
      width: 150,
      sortable: true,
      render: (value, row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {UserRoleDisplayNames[value as keyof typeof UserRoleDisplayNames] || value}
        </span>
      ),
    },
    {
      key: "departmentId",
      title: "部门",
      width: 120,
      sortable: true,
      render: (value) => getDepartmentName(value),
    },
    {
      key: "email",
      title: "邮箱",
      width: 200,
      sortable: true,
    },
    {
      key: "isActive",
      title: "状态",
      width: 100,
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        }`}>
          {value ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "lastLoginTime",
      title: "最后登录",
      width: 150,
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: 150,
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  return (
    <div className="space-y-4">
      <ResizableTable
        title="用户权限管理"
        columns={userColumns}
        data={users}
        storageKey="user-permissions"
        isLoading={isLoading}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageSizeChange={setPageSize}
        onPageChange={setCurrentPage}
      />

      {/* 权限配置弹窗 */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                配置权限
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                用户：{selectedUser.fullName || selectedUser.username}（{UserRoleDisplayNames[selectedUser.role as keyof typeof UserRoleDisplayNames]}）
                {selectedUser.departmentId && (
                  <span className="ml-2">- 部门：{getDepartmentName(selectedUser.departmentId)}</span>
                )}
              </p>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {permissionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 w-32">
                            资源/操作
                          </th>
                          {permissionTypes.map(p => (
                            <th key={p.key} className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 w-24">
                              {p.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resources.map(resource => {
                          // 送货管理特殊处理
                          if (resource.key === "deliveries" && resource.hasSubModules) {
                            const isExpanded = isDeliveryExpanded(selectedUser.id);
                            return (
                              <React.Fragment key={resource.key}>
                                <tr className="border-t border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
                                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={toggleDeliveryExpand}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer text-sm"
                                      >
                                        {isExpanded ? "收起 ▼" : "展开配置 ▶"}
                                      </button>
                                      <span>送货管理（5 个子模块）</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center" colSpan={3}>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                                      点击"{isExpanded ? "收起" : "展开"}"配置子模块权限
                                    </span>
                                  </td>
                                </tr>
                                {isExpanded && deliverySubModules.map(subModule => (
                                  <tr key={subModule.key} className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 pl-8">
                                      └─ {subModule.label}
                                    </td>
                                    {permissionTypes.map(p => {
                                      const isChecked = hasPermission(selectedUser.id, subModule.key, p.key);
                                      return (
                                        <td key={p.key} className="px-4 py-3 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => handleTogglePermission(selectedUser.id, subModule.key, p.key, e.target.checked)}
                                            className="rounded border-gray-300 w-5 h-5"
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          }
                          
                          // 普通资源行
                          return (
                            <tr key={resource.key} className="border-t border-gray-200 dark:border-gray-600">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                {resource.label}
                              </td>
                              {permissionTypes.map(p => {
                                const isChecked = hasPermission(selectedUser.id, resource.key, p.key);
                                return (
                                  <td key={p.key} className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => handleTogglePermission(selectedUser.id, resource.key, p.key, e.target.checked)}
                                      className="rounded border-gray-300 w-5 h-5"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving || permissionLoading}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSaving && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                )}
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
