"use client";

import { useState, useEffect } from "react";

type ResourceType = "projects" | "tasks" | "users" | "customers" | "customer_contacts" | "contracts" | "orders" | "products" | "deliveries" | "config" | "financial";
type PermissionType = "view" | "edit" | "delete" | "use";

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
  config: "编码管理",
  financial: "财务管理",
};

const PERMISSION_NAMES: Record<PermissionType, string> = {
  view: "查看",
  edit: "编辑",
  delete: "删除",
  use: "使用",
};

interface Department {
  id: string;
  departmentCode: string;
  departmentName: string;
  status: string;
}

export default function DepartmentPermissionManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // 加载部门列表
  useEffect(() => {
    loadDepartments();
  }, []);

  // 加载选中部门的权限
  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentPermissions(selectedDepartment);
    }
  }, [selectedDepartment]);

  const loadDepartments = async () => {
    try {
      const res = await fetch("/api/departments?active=true", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
        if (data.data.length > 0) {
          setSelectedDepartment(data.data[0].id);
        }
      }
    } catch (err) {
      console.error("加载部门列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentPermissions = async (departmentId: string) => {
    try {
      const res = await fetch(`/api/department-permissions/${departmentId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data);
      }
    } catch (err) {
      console.error("加载部门权限失败:", err);
    }
  };

  const hasPermission = (resource: ResourceType, permission: PermissionType) => {
    return permissions[resource]?.includes(permission) || false;
  };

  const togglePermission = (resource: ResourceType, permission: PermissionType) => {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      if (current.includes(permission)) {
        return {
          ...prev,
          [resource]: current.filter((p) => p !== permission),
        };
      } else {
        return {
          ...prev,
          [resource]: [...current, permission],
        };
      }
    });
  };

  const handleSave = async () => {
    if (!selectedDepartment) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // 将权限对象转换为数组格式
      const permissionsArray: Array<{ resource: string; permission: string }> = [];
      Object.entries(permissions).forEach(([resource, perms]) => {
        perms.forEach((permission) => {
          permissionsArray.push({ resource, permission });
        });
      });

      const res = await fetch(`/api/department-permissions/${selectedDepartment}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ permissions: permissionsArray }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("权限保存成功");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "保存失败");
      }
    } catch (err) {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const selectedDeptName = departments.find((d) => d.id === selectedDepartment)?.departmentName || "";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题栏 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            部门基础权限管理
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            设置部门成员的基础权限，新用户将自动继承所属部门的基础权限
          </p>
        </div>

        {/* 部门选择 */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              选择部门：
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择部门</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.departmentName} ({dept.departmentCode})
                </option>
              ))}
            </select>
            {success && (
              <span className="text-sm text-green-600 dark:text-green-400">{success}</span>
            )}
            {error && (
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            )}
          </div>
        </div>

        {/* 权限配置表格 */}
        {selectedDepartment && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      资源模块
                    </th>
                    {(["view", "edit", "delete"] as PermissionType[]).map((perm) => (
                      <th
                        key={perm}
                        className="px-6 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {PERMISSION_NAMES[perm]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(Object.keys(RESOURCE_NAMES) as ResourceType[]).map((resource) => (
                    <tr key={resource} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {RESOURCE_NAMES[resource]}
                      </td>
                      {(["view", "edit", "delete"] as PermissionType[]).map((permission) => (
                        <td key={permission} className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={hasPermission(resource, permission)}
                            onChange={() => togglePermission(resource, permission)}
                            className={`h-5 w-5 rounded border-gray-300 focus:ring-blue-500 ${
                              permission === "view"
                                ? "text-blue-600"
                                : permission === "edit"
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 保存按钮 */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存权限"}
              </button>
            </div>
          </div>
        )}

        {!selectedDepartment && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            请选择要配置权限的部门
          </div>
        )}

        {/* 图例 */}
        <div className="mt-6 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
      </div>
    </div>
  );
}
