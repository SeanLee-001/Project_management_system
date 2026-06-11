"use client";

import { useState, useEffect, useRef } from "react";
import { Pencil, Trash2, CheckCircle, XCircle, KeyRound, Link, Unplug } from "lucide-react";
import type { User, UserWithApprover } from "@/storage/database/shared/schema";
import { UserRole, UserRoleType, UserRoleDisplayNames } from "@/storage/database/shared/schema";
import { generateImportTemplate, userImportColumns } from "@/utils/excelImport";
import { ResizableTable, Column } from "@/components/ResizableTable";

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithApprover[]>([]);
  const [roles, setRoles] = useState<any[]>([]); // 角色列表
  const [departments, setDepartments] = useState<any[]>([]); // 部门列表
  const [isLoading, setIsLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changingUser, setChangingUser] = useState<UserWithApprover | null>(null);
  const [changePasswordData, setChangePasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [changePasswordError, setChangePasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 审核相关状态
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<UserWithApprover | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [showMacAddressForm, setShowMacAddressForm] = useState(false);
  const [macAddressUser, setMacAddressUser] = useState<UserWithApprover | null>(null);
  const [macAddressInput, setMacAddressInput] = useState("");

  // 用户详情弹窗状态
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithApprover | null>(null);

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("users-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("users-page-size", pageSize.toString());
  }, [pageSize]);

  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    employeeNumber: "",
    phone: "",
    role: "project_member" as UserRoleType,
    departmentId: "",
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles?active=true");
      if (res.ok) {
        const json = await res.json();
        setRoles(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments?active=true", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDepartments(json.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        await fetchUsers();
        setShowUserForm(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // 如果编辑模式下填写了密码，需要确认匹配
    if (userForm.password && userForm.password !== userForm.confirmPassword) {
      alert("两次输入的密码不一致");
      return;
    }
    
    try {
      // 如果密码为空，不传递密码字段
      const { confirmPassword, ...formData } = userForm;
      if (!formData.password) {
        delete (formData as any).password;
      }
      
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchUsers();
        setEditingUser(null);
        setShowUserForm(false);
        resetForm();
        alert("用户更新成功");
      } else {
        const json = await res.json();
        alert(`更新失败：${json.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("更新失败，请稍后重试");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("确定要删除此用户吗？")) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleDownloadTemplate = () => {
    generateImportTemplate(userImportColumns, "用户", "用户导入");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/users/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        const { total, success, failed, errors } = json.data;
        let message = `导入完成！\n总计：${total} 条\n成功：${success} 条\n失败：${failed} 条`;
        if (errors && errors.length > 0) {
          message += '\n\n失败详情：\n' + errors.map((e: any) => `用户名：${e.username}，错误：${e.error}`).join('\n');
        }
        alert(message);
        await fetchUsers();
      } else {
        alert(json.error || '导入失败');
      }
    } catch (error) {
      console.error('Error importing users:', error);
      alert('导入失败，请稍后重试');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditUser = (user: UserWithApprover) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
      fullName: user.fullName || "",
      employeeNumber: (user as any).employeeNumber || "",
      phone: (user as any).phone || "",
      role: user.role as UserRoleType,
      departmentId: (user as any).departmentId || "",
      isActive: user.isActive,
    });
    setShowUserForm(true);
  };

  const handleBindMacAddress = (user: UserWithApprover) => {
    setMacAddressUser(user);
    setMacAddressInput(user.macAddress || "");
    setShowMacAddressForm(true);
  };

  const handleMacAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!macAddressUser) return;

    try {
      const res = await fetch(`/api/users/${macAddressUser.id}/mac-address`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          macAddress: macAddressInput.trim(),
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert("MAC地址绑定成功");
        setShowMacAddressForm(false);
        setMacAddressUser(null);
        setMacAddressInput("");
        await fetchUsers();
      } else {
        alert(json.error || "MAC地址绑定失败");
      }
    } catch (error) {
      console.error("Error binding MAC address:", error);
      alert("MAC地址绑定失败，请稍后重试");
    }
  };

  const handleUnbindMacAddress = async (user: UserWithApprover) => {
    if (!confirm(`确定要解绑用户 ${user.username} 的MAC地址吗？`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}/mac-address`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();

      if (json.success) {
        alert("MAC地址解绑成功");
        await fetchUsers();
      } else {
        alert(json.error || "MAC地址解绑失败");
      }
    } catch (error) {
      console.error("Error unbinding MAC address:", error);
      alert("MAC地址解绑失败，请稍后重试");
    }
  };

  const handleChangePassword = (user: UserWithApprover) => {
    setChangingUser(user);
    setChangePasswordData({
      newPassword: "",
      confirmPassword: "",
    });
    setChangePasswordError("");
    setShowChangePassword(true);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingUser) return;

    setChangePasswordError("");
    setIsChangingPassword(true);

    // 验证新密码
    if (changePasswordData.newPassword.length < 6) {
      setChangePasswordError("新密码至少需要6个字符");
      setIsChangingPassword(false);
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangePasswordError("两次输入的密码不一致");
      setIsChangingPassword(false);
      return;
    }

    try {
      const res = await fetch(`/api/users/${changingUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newPassword: changePasswordData.newPassword,
        }),
      });

      const json = await res.json();

      if (json.success) {
        alert(`用户 ${changingUser.username} 的密码已成功修改`);
        setShowChangePassword(false);
        setChangingUser(null);
        setChangePasswordData({
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setChangePasswordError(json.error || "修改密码失败");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setChangePasswordError("修改密码失败，请稍后重试");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleApproveUser = async (user: UserWithApprover) => {
    if (!confirm(`确定要通过用户 ${user.username} (${user.email}) 的注册申请吗？`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();

      if (json.success) {
        alert(`用户 ${user.username} 审核通过`);
        await fetchUsers();
      } else {
        alert(json.error || "审核失败");
      }
    } catch (error) {
      console.error("Error approving user:", error);
      alert("审核失败，请稍后重试");
    }
  };

  const handleRejectUser = (user: UserWithApprover) => {
    setRejectingUser(user);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingUser) return;

    if (!rejectReason.trim()) {
      alert("请输入拒绝原因");
      return;
    }

    try {
      const res = await fetch(`/api/users/${rejectingUser.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rejectReason: rejectReason.trim(),
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert(`用户 ${rejectingUser.username} 审核已拒绝`);
        setShowRejectDialog(false);
        setRejectingUser(null);
        setRejectReason("");
        await fetchUsers();
      } else {
        alert(json.error || "审核失败");
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      alert("审核失败，请稍后重试");
    }
  };

  const resetForm = () => {
    setUserForm({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      employeeNumber: "",
      phone: "",
      role: "project_member",
      departmentId: "",
      isActive: true,
    });
    setEditingUser(null);
  };

  const getRoleColor = (role: string) => {
    // 为不同角色返回不同颜色
    const colorMap: Record<string, string> = {
      system_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      project_manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      mechanical_engineer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      electrical_engineer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      visual_engineer: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      software_engineer: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      project_management: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      production_planning: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
      quality_management: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      procurement_management: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
      department_manager: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
      field_supervisor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
      project_member: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      business: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
      safety_officer: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
    };
    return colorMap[role] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getRoleText = (role: string) => {
    // 首先尝试从动态角色中查找
    const dynamicRole = roles.find(r => r.roleCode === role);
    if (dynamicRole) {
      return dynamicRole.roleName;
    }
    // 如果动态角色中找不到，使用默认的UserRoleDisplayNames
    return UserRoleDisplayNames[role as UserRoleType] || role;
  };

  // 定义表格列配置
  const userColumns: Column<UserWithApprover>[] = [
    {
      key: "employeeNumber",
      title: "工号",
      width: 100,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "username",
      title: "用户名",
      width: 120,
      sortable: true,
      render: (value, row) => (
        <button
          onClick={() => {
            setSelectedUser(row);
            setShowUserDetail(true);
          }}
          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
        >
          {value}
        </button>
      ),
    },
    {
      key: "email",
      title: "邮箱",
      width: 200,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "fullName",
      title: "全名",
      width: 100,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "phone",
      title: "手机",
      width: 120,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "role",
      title: "角色",
      width: 120,
      sortable: true,
      render: (value) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(value)}`}>
          {getRoleText(value)}
        </span>
      ),
    },
    {
      key: "departmentId",
      title: "部门",
      width: 100,
      sortable: false,
      render: (value) => {
        const dept = departments.find(d => d.id === value);
        return dept ? dept.departmentName : "-";
      },
    },
    {
      key: "macAddress",
      title: "MAC地址",
      width: 130,
      sortable: true,
      render: (value) => value ? (
        <span className="font-mono text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
          {value}
        </span>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500">未绑定</span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 280,
      sortable: false,
      freezable: false,
      render: (_, row) => (
        <div className="flex gap-1 items-center flex-nowrap">
          {row.approvalStatus === "pending" && (
            <>
              <button onClick={() => handleApproveUser(row)} title="通过" className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => handleRejectUser(row)} title="拒绝" className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"><XCircle className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={() => handleEditUser(row)} title="编辑" className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => handleChangePassword(row)} title="修改密码" className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors"><KeyRound className="w-4 h-4" /></button>
          {row.macAddress ? (
            <button onClick={() => handleUnbindMacAddress(row)} title="解绑MAC" className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 transition-colors"><Unplug className="w-4 h-4" /></button>
          ) : (
            <button onClick={() => handleBindMacAddress(row)} title="绑定MAC" className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 transition-colors"><Link className="w-4 h-4" /></button>
          )}
          <button onClick={() => handleDeleteUser(row.id)} title="删除" className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col p-6">
      <div className="flex-shrink-0 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                用户管理
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                管理系统用户和权限 · 共 {users.length} 位用户
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="group inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-gray-700 font-medium shadow-sm border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:border-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>下载模板</span>
          </button>
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 text-white font-medium shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
          >
            {isImporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>导入中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>导入 Excel</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => {
              resetForm();
              setShowUserForm(true);
            }}
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-white font-medium shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>新建用户</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">加载中...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            暂无用户数据
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            点击"新建用户"按钮创建第一个用户
          </p>
        </div>
      ) : (
        <>
          {/* 表格容器 */}
          <ResizableTable
            columns={userColumns}
            data={users.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            storageKey="users"
            showPagination={false}
          />

          {/* 分页控制 - 固定在底部 */}
          <div className="mt-4 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                每页显示
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  setPageSize(newSize);
                  setCurrentPage(1); // 重置到第一页
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer"
              >
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="50">50 条</option>
                <option value="100">100 条</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  共 {users.length} 条记录
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                  title="首页"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                  title="上一页"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="px-3">
                  <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-2 text-sm font-semibold bg-blue-50 text-blue-700 rounded-lg dark:bg-blue-900/30 dark:text-blue-300">
                    {currentPage} / {Math.ceil(users.length / pageSize) || 1}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(Math.ceil(users.length / pageSize) || 1, prev + 1)
                    )
                  }
                  disabled={currentPage >= Math.ceil(users.length / pageSize)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                  title="下一页"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.ceil(users.length / pageSize) || 1)
                  }
                  disabled={currentPage >= Math.ceil(users.length / pageSize)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                  title="末页"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 transform transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingUser ? "编辑用户" : "新建用户"}
              </h2>
            </div>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">用户名 *</label>
                  <input type="text" required disabled={!!editingUser} value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">邮箱 *</label>
                  <input type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">全名</label>
                  <input type="text" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">工号</label>
                  <input type="text" value={userForm.employeeNumber} onChange={(e) => setUserForm({ ...userForm, employeeNumber: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">手机 *</label>
                  <input type="tel" required value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">部门</label>
                  <select value={userForm.departmentId} onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer">
                    <option value="">请选择部门</option>
                    {departments.map((dept) => (<option key={dept.id} value={dept.id}>{dept.departmentName}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">角色</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRoleType })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer">
                    {roles.map((role) => (<option key={role.id} value={role.roleCode}>{role.roleName}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">状态</label>
                  <select value={userForm.isActive ? "true" : "false"} onChange={(e) => setUserForm({ ...userForm, isActive: e.target.value === "true" })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer">
                    <option value="true">激活</option>
                    <option value="false">停用</option>
                  </select>
                </div>
              </div>
              {!editingUser && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">密码 *</label>
                    <input type="password" required value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value, confirmPassword: userForm.confirmPassword })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="设置初始密码" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">确认密码 *</label>
                    <input type="password" required value={userForm.confirmPassword} onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="再次输入密码" />
                  </div>
                </div>
              )}
              {editingUser && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">新密码 (可选)</label>
                    <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value, confirmPassword: userForm.confirmPassword })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="留空则不更新密码" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">确认新密码</label>
                    <input type="password" value={userForm.confirmPassword} onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="确认新密码" />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => { setShowUserForm(false); resetForm(); }} className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">取消</button>
                <button type="submit" className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 shadow-sm">{editingUser ? "更新" : "创建"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && changingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  修改密码
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  用户：{changingUser.username}
                </p>
              </div>
            </div>

            {changePasswordError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{changePasswordError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  新密码 *
                </label>
                <input
                  type="password"
                  required
                  value={changePasswordData.newPassword}
                  onChange={(e) =>
                    setChangePasswordData({
                      ...changePasswordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="输入新密码（至少6个字符）"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  确认新密码 *
                </label>
                <input
                  type="password"
                  required
                  value={changePasswordData.confirmPassword}
                  onChange={(e) =>
                    setChangePasswordData({
                      ...changePasswordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="再次输入新密码"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setChangingUser(null);
                    setChangePasswordData({
                      newPassword: "",
                      confirmPassword: "",
                    });
                    setChangePasswordError("");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 px-5 py-2.5 text-sm font-medium text-white hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-md transition-all"
                >
                  {isChangingPassword ? "修改中..." : "修改密码"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAC Address Binding Modal */}
      {showMacAddressForm && macAddressUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  绑定MAC地址
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  用户：{macAddressUser.username}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-100">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="space-y-1">
                  <p className="font-semibold">说明：</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>MAC地址绑定后，用户可免密码登录</li>
                    <li>格式：00:11:22:33:44:55（使用冒号分隔）</li>
                    <li>每个MAC地址只能绑定一个用户</li>
                    <li>用户可以绑定多个MAC地址</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleMacAddressSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  MAC地址 *
                </label>
                <input
                  type="text"
                  required
                  value={macAddressInput}
                  onChange={(e) => setMacAddressInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="00:11:22:33:44:55"
                  maxLength={17}
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  格式：XX:XX:XX:XX:XX:XX（使用冒号或连字符分隔）
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  当前绑定的MAC地址：{" "}
                  {macAddressUser.macAddress ? (
                    <span className="inline-block font-mono bg-white dark:bg-gray-700 px-3 py-1 rounded-md text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {macAddressUser.macAddress}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">未绑定</span>
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMacAddressForm(false);
                    setMacAddressUser(null);
                    setMacAddressInput("");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-md transition-all"
                >
                  绑定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject User Modal */}
      {showRejectDialog && rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  审核拒绝
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  用户：{rejectingUser.username}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-100">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold mb-2">用户信息：</p>
                  <ul className="space-y-1 text-xs">
                    <li>用户名：{rejectingUser.username}</li>
                    <li>邮箱：{rejectingUser.email}</li>
                    <li>角色：{UserRoleDisplayNames[rejectingUser.role as UserRoleType]}</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  拒绝原因 *
                </label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                  rows={4}
                  placeholder="请输入拒绝用户注册的原因"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  拒绝原因将显示给用户
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectingUser(null);
                    setRejectReason("");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-medium text-white hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-md transition-all"
                >
                  确认拒绝
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 用户详情弹窗 */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
            {/* 头部 */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedUser.fullName || selectedUser.username}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{selectedUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUserDetail(false);
                  setSelectedUser(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  基本信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">工号</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.employeeNumber || '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">邮箱</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.email || '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">手机</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.phone || '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">角色</div>
                    <div className="text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                        {getRoleText(selectedUser.role)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 账户状态 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  账户状态
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">账户状态</div>
                    <div className="text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        selectedUser.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}>
                        {selectedUser.isActive ? "激活" : "停用"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">审核状态</div>
                    <div className="text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        selectedUser.approvalStatus === 'approved'
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : selectedUser.approvalStatus === 'rejected'
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        }`}>
                        {selectedUser.approvalStatus === 'approved' ? '已通过' : selectedUser.approvalStatus === 'rejected' ? '已拒绝' : '待审核'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">MAC地址</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{selectedUser.macAddress || '未绑定'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">首次登录</div>
                    <div className="text-sm text-gray-900 dark:text-white">{selectedUser.isFirstLogin ? '是' : '否'}</div>
                  </div>
                </div>
              </div>

              {/* 登录信息 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  登录信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">最后登录时间</div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {selectedUser.lastLoginTime
                        ? new Date(selectedUser.lastLoginTime).toLocaleString('zh-CN')
                        : '未登录'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">登录时长</div>
                    <div className="text-sm text-gray-900 dark:text-white">{selectedUser.loginDuration || '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">登录终端</div>
                    <div className="text-sm text-gray-900 dark:text-white">{selectedUser.loginDevice || '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">登录IP</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{selectedUser.loginIP || '-'}</div>
                  </div>
                </div>
              </div>

              {/* 审核信息 */}
              {(selectedUser.approver || selectedUser.approvedAt) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    审核信息
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">审核人</div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {selectedUser.approver?.fullName || '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">审核时间</div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {selectedUser.approvedAt
                          ? new Date(selectedUser.approvedAt).toLocaleString('zh-CN')
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 时间戳 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  时间信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">创建时间</div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleString('zh-CN')
                        : '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">更新时间</div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {selectedUser.updatedAt
                        ? new Date(selectedUser.updatedAt).toLocaleString('zh-CN')
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUserDetail(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setShowUserDetail(false);
                  handleEditUser(selectedUser);
                }}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                编辑用户
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
