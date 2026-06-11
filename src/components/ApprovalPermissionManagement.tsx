"use client";

import { useState, useEffect } from "react";
import type { User, ProjectApprovalFlow, Department } from "@/storage/database/shared/schema";
import { UserRoleDisplayNames, UserRole } from "@/storage/database/shared/schema";
import { ResizableTable, Column } from "@/components/ResizableTable";

interface ApprovalPermissionManagementProps {
  userId?: string;
  userRole?: string;
}

export default function ApprovalPermissionManagement({ userId, userRole }: ApprovalPermissionManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [flows, setFlows] = useState<ProjectApprovalFlow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // 用户审批权限映射
  const [userApprovalPermissions, setUserApprovalPermissions] = useState<Record<string, string[]>>({});

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("approval-permissions-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("approval-permissions-page-size", pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    fetchUsers();
    fetchFlows();
    fetchDepartments();
    fetchUserApprovalPermissions();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
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

  const fetchFlows = async () => {
    try {
      const res = await fetch("/api/approval-flows");
      const json = await res.json();
      if (json.success) {
        setFlows(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching flows:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (json.success) {
        setDepartments(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchUserApprovalPermissions = async () => {
    try {
      const res = await fetch("/api/user-approval-permissions");
      const json = await res.json();
      if (json.success) {
        setUserApprovalPermissions(json.data || {});
      }
    } catch (error) {
      console.error("Error fetching user approval permissions:", error);
    }
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionModal(true);
  };

  const handlePermissionChange = (approvalType: string, checked: boolean) => {
    if (!selectedUser) return;

    const userPermissions = userApprovalPermissions[selectedUser.id] || [];
    let newPermissions: string[];

    if (checked) {
      newPermissions = [...userPermissions, approvalType];
    } else {
      newPermissions = userPermissions.filter(type => type !== approvalType);
    }

    setUserApprovalPermissions({
      ...userApprovalPermissions,
      [selectedUser.id]: newPermissions,
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      const permissions = userApprovalPermissions[selectedUser.id] || [];
      const res = await fetch(`/api/user-approval-permissions/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const json = await res.json();

      if (json.success) {
        alert("权限保存成功");
        setShowPermissionModal(false);
        setSelectedUser(null);
      } else {
        alert(json.error || "保存失败");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      alert("保存失败，请稍后重试");
    }
  };

  const getApprovalTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      new_project: "新建项目",
      edit_project: "编辑项目",
      delete_project: "删除项目",
      status_change: "状态变更",
      member_change: "成员变更",
      new_order: "新建订单",
      edit_order: "编辑订单",
      delete_order: "删除订单",
      new_contract: "新建合同",
      edit_contract: "编辑合同",
      delete_contract: "删除合同",
    };
    return typeMap[type] || type;
  };

  const getFlowByType = (type: string) => {
    return flows.find(flow => flow.approvalType === type);
  };

  const getUserApprovalTypes = (user: User) => {
    return userApprovalPermissions[user.id] || [];
  };

  const getDepartmentName = (departmentId: string | null | undefined) => {
    if (!departmentId) return "-";
    const dept = departments.find(d => d.id === departmentId);
    return dept?.departmentName || "-";
  };

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
      render: (_, row) => UserRoleDisplayNames[row.role as keyof typeof UserRoleDisplayNames] || row.role,
    },
    {
      key: "department",
      title: "部门",
      width: 120,
      sortable: true,
      render: (_, row) => (
        <span className="text-gray-700 dark:text-gray-300">
          {getDepartmentName(row.departmentId)}
        </span>
      ),
    },
    {
      key: "approvalTypes",
      title: "审批权限",
      width: 300,
      render: (_, row) => {
        const types = getUserApprovalTypes(row);
        if (types.length === 0) return <span className="text-gray-500">无审批权限</span>;
        
        // 将权限分成每组最多4个
        const ITEMS_PER_ROW = 4;
        const rows: string[][] = [];
        for (let i = 0; i < types.length; i += ITEMS_PER_ROW) {
          rows.push(types.slice(i, i + ITEMS_PER_ROW));
        }
        
        return (
          <div className="space-y-1">
            {rows.map((rowTypes, rowIndex) => (
              <div key={rowIndex} className="flex flex-wrap gap-1">
                {rowTypes.map(type => (
                  <span
                    key={type}
                    className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {getApprovalTypeText(type)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "phone",
      title: "电话",
      width: 130,
      render: (_, row) => row.phone || "-",
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: 110,
      sortable: true,
      render: (_, row) => formatDate(row.createdAt),
    },
    {
      key: "isActive",
      title: "状态",
      width: 80,
      sortable: true,
      render: (_, row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {row.isActive ? "启用" : "禁用"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">审批权限管理</h2>
        <div className="text-sm text-gray-400">
          管理用户的审批权限，配置用户可以参与哪些类型的审批
        </div>
      </div>

      <ResizableTable
        columns={userColumns}
        data={users}
        storageKey="approval-permissions"
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* 权限管理模态框 */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                管理审批权限
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                用户：{selectedUser.fullName || selectedUser.username}（{UserRoleDisplayNames[selectedUser.role as keyof typeof UserRoleDisplayNames]}）
                {selectedUser.departmentId && (
                  <span className="ml-2">- 部门：{getDepartmentName(selectedUser.departmentId)}</span>
                )}
              </p>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">审批类型权限</h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* 项目审批类型 */}
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">项目审批</h5>
                    {[
                      "new_project",
                      "edit_project",
                      "delete_project",
                      "status_change",
                      "member_change",
                    ].map(approvalType => {
                      const flow = getFlowByType(approvalType);
                      const isChecked = getUserApprovalTypes(selectedUser).includes(approvalType);
                      const isEnabled = flow?.isEnabled ?? true;

                      return (
                        <div
                          key={approvalType}
                          className={`p-3 rounded-lg border ${
                            !isEnabled ? "opacity-50 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`permission-${approvalType}`}
                              checked={isChecked}
                              onChange={(e) => handlePermissionChange(approvalType, e.target.checked)}
                              disabled={!isEnabled}
                              className="mt-1 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`permission-${approvalType}`}
                                className={`block text-sm font-medium ${
                                  !isEnabled ? "text-gray-400" : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {getApprovalTypeText(approvalType)}
                              </label>
                              {flow && (
                                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                  <div>流程：{flow.name}</div>
                                  {flow.description && <div>说明：{flow.description}</div>}
                                </div>
                              )}
                              {!isEnabled && (
                                <div className="mt-1 text-xs text-red-500">该审批流程已停用</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 订单审批类型 */}
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">订单审批</h5>
                    {[
                      "new_order",
                      "edit_order",
                      "delete_order",
                    ].map(approvalType => {
                      const flow = getFlowByType(approvalType);
                      const isChecked = getUserApprovalTypes(selectedUser).includes(approvalType);
                      const isEnabled = flow?.isEnabled ?? true;

                      return (
                        <div
                          key={approvalType}
                          className={`p-3 rounded-lg border ${
                            !isEnabled ? "opacity-50 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`permission-${approvalType}`}
                              checked={isChecked}
                              onChange={(e) => handlePermissionChange(approvalType, e.target.checked)}
                              disabled={!isEnabled}
                              className="mt-1 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`permission-${approvalType}`}
                                className={`block text-sm font-medium ${
                                  !isEnabled ? "text-gray-400" : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {getApprovalTypeText(approvalType)}
                              </label>
                              {flow && (
                                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                  <div>流程：{flow.name}</div>
                                  {flow.description && <div>说明：{flow.description}</div>}
                                </div>
                              )}
                              {!isEnabled && (
                                <div className="mt-1 text-xs text-red-500">该审批流程已停用</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 合同审批类型 */}
                  <div>
                    <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">合同审批</h5>
                    {[
                      "new_contract",
                      "edit_contract",
                      "delete_contract",
                    ].map(approvalType => {
                      const flow = getFlowByType(approvalType);
                      const isChecked = getUserApprovalTypes(selectedUser).includes(approvalType);
                      const isEnabled = flow?.isEnabled ?? true;

                      return (
                        <div
                          key={approvalType}
                          className={`p-3 rounded-lg border ${
                            !isEnabled ? "opacity-50 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`permission-${approvalType}`}
                              checked={isChecked}
                              onChange={(e) => handlePermissionChange(approvalType, e.target.checked)}
                              disabled={!isEnabled}
                              className="mt-1 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`permission-${approvalType}`}
                                className={`block text-sm font-medium ${
                                  !isEnabled ? "text-gray-400" : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {getApprovalTypeText(approvalType)}
                              </label>
                              {flow && (
                                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                  <div>流程：{flow.name}</div>
                                  {flow.description && <div>说明：{flow.description}</div>}
                                </div>
                              )}
                              {!isEnabled && (
                                <div className="mt-1 text-xs text-red-500">该审批流程已停用</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  保存权限
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
