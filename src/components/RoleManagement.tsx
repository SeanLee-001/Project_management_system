"use client";

import { useState, useEffect } from "react";
import { ResizableTable, Column } from "@/components/ResizableTable";

interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [roleForm, setRoleForm] = useState({
    roleCode: "",
    roleName: "",
    description: "",
    isActive: true,
  });

  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("roles-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    localStorage.setItem("roles-page-size", pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    fetchRoles();
    // 初始化系统角色
    initRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (json.success) {
        setRoles(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const initRoles = async () => {
    try {
      const res = await fetch("/api/roles/init", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        console.log("Roles initialized:", json.message);
      }
    } catch (error) {
      console.error("Error initializing roles:", error);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm),
      });
      if (res.ok) {
        await fetchRoles();
        setShowRoleForm(false);
        resetForm();
        alert("角色创建成功！");
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating role:", error);
      alert("创建失败");
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      const res = await fetch(`/api/roles/${editingRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: roleForm.roleName,
          description: roleForm.description,
          isActive: roleForm.isActive,
        }),
      });
      if (res.ok) {
        await fetchRoles();
        setEditingRole(null);
        setShowRoleForm(false);
        resetForm();
        alert("角色更新成功！");
      } else {
        const json = await res.json();
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("更新失败");
    }
  };

  const handleDeleteRole = async (id: string) => {
    const role = roles.find(r => r.id === id);
    if (!role) return;

    if (role.isSystem) {
      alert("系统角色不允许删除");
      return;
    }

    if (!confirm("确定要删除此角色吗？")) return;
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchRoles();
        alert("角色删除成功！");
      } else {
        const json = await res.json();
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("删除失败");
    }
  };

  const handleToggleStatus = async (id: string) => {
    const role = roles.find(r => r.id === id);
    if (!role) return;

    const newStatus = !role.isActive;
    const actionText = newStatus ? "启用" : "停用";

    if (role.isSystem) {
      alert("系统角色不允许修改状态");
      return;
    }

    if (!confirm(`确定要${actionText}此角色吗？`)) return;
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: role.roleName,
          description: role.description,
          isActive: newStatus,
        }),
      });
      if (res.ok) {
        await fetchRoles();
        alert(`角色${actionText}成功！`);
      } else {
        const json = await res.json();
        alert(json.error || `${actionText}失败`);
      }
    } catch (error) {
      console.error(`Error ${actionText.toLowerCase()} role:`, error);
      alert(`${actionText}失败`);
    }
  };

  const handleEditRole = (role: Role) => {
    if (role.isSystem) {
      alert("系统角色不允许编辑");
      return;
    }
    setEditingRole(role);
    setRoleForm({
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description || "",
      isActive: role.isActive,
    });
    setShowRoleForm(true);
  };

  const resetForm = () => {
    setRoleForm({
      roleCode: "",
      roleName: "",
      description: "",
      isActive: true,
    });
    setEditingRole(null);
  };

  // 列定义
  const columns: Column<Role>[] = [
    {
      key: "roleCode",
      title: "角色代码",
      width: 150,
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {row.roleCode}
          </div>
          {row.isSystem && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              系统角色
            </span>
          )}
        </div>
      ),
    },
    {
      key: "roleName",
      title: "角色名称",
      width: 150,
      sortable: true,
    },
    {
      key: "description",
      title: "角色描述",
      width: 250,
      sortable: false,
    },
    {
      key: "isActive",
      title: "状态",
      width: 100,
      sortable: true,
      render: (value, row) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            row.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {row.isActive ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: 180,
      sortable: true,
      render: (value, row) => {
        const date = new Date(row.createdAt);
        return date.toLocaleString("zh-CN");
      },
    },
    {
      key: "actions",
      title: "操作",
      width: 280,
      sortable: false,
      render: (value, row) => (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleToggleStatus(row.id)}
            disabled={row.isSystem}
            className={`px-2 py-1 rounded text-sm ${
              row.isActive
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {row.isActive ? "停用" : "启用"}
          </button>
          <button
            onClick={() => handleEditRole(row)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={row.isSystem}
          >
            编辑
          </button>
          <button
            onClick={() => handleDeleteRole(row.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={row.isSystem}
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  // 分页计算
  const getPaginatedRoles = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return roles.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(roles.length / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 角色表单 */}
      {showRoleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingRole ? "编辑角色" : "新建角色"}
            </h2>
            <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    角色代码 *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleForm.roleCode}
                    onChange={(e) => setRoleForm({ ...roleForm, roleCode: e.target.value })}
                    disabled={!!editingRole}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                    placeholder="例如：project_manager"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    创建后不可修改
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    角色名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleForm.roleName}
                    onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="例如：项目经理"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    角色描述
                  </label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="请输入角色描述"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={roleForm.isActive}
                    onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    启用状态
                  </label>
                  <p className="ml-4 text-xs text-gray-500 dark:text-gray-400">
                    停用的角色不会在项目成员选择时显示
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleForm(false);
                    resetForm();
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {editingRole ? "更新" : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">角色管理</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            系统角色不可编辑、停用或删除。创建自定义角色来管理这些功能。
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowRoleForm(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          新建角色
        </button>
      </div>

      {/* 角色列表 */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        {roles.filter(r => r.isSystem).length === roles.length && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  所有角色都是系统角色
                </h3>
                <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  当前所有角色都是系统角色，无法进行编辑、停用或删除操作。点击"新建角色"创建自定义角色来管理这些功能。
                </div>
              </div>
            </div>
          </div>
        )}
        <ResizableTable
          columns={columns}
          data={getPaginatedRoles()}
          storageKey="roles"
        />
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">每页显示：</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              共 {roles.length} 条
            </span>
          </div>
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
            >
              首页
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
            >
              下一页
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
