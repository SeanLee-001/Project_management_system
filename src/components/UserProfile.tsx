"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRoleDisplayNames, type User } from "@/storage/database/shared/schema";
import { RESOURCE_NAMES, PERMISSION_NAMES } from "@/lib/permissionUtils";

type ResourceType = "projects" | "tasks" | "users" | "customers" | "customer_contacts" | "contracts" | "orders" | "products" | "config";
type PermissionType = "view" | "edit" | "delete" | "use";

// 资源中文名称（按权限管理页面顺序）
const RESOURCE_DISPLAY_ORDER: { key: ResourceType; name: string }[] = [
  { key: "projects", name: "项目管理" },
  { key: "tasks", name: "任务管理" },
  { key: "users", name: "用户管理" },
  { key: "customers", name: "客户管理" },
  { key: "customer_contacts", name: "客户联系人" },
  { key: "contracts", name: "合同管理" },
  { key: "orders", name: "订单管理" },
  { key: "products", name: "产品管理" },
  { key: "config", name: "编码管理" },
];

const APPROVAL_TYPE_OPTIONS = [
  { value: "order", label: "订单审批" },
  { value: "contract", label: "合同审批" },
  { value: "new_project", label: "新增项目审批" },
  { value: "edit_project", label: "编辑项目审批" },
  { value: "delete_project", label: "删除项目审批" },
];

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  order: "订单审批",
  contract: "合同审批",
  new_project: "新增项目",
  edit_project: "编辑项目",
  delete_project: "删除项目",
};

export default function UserProfile() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showMacBinding, setShowMacBinding] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [macAddress, setMacAddress] = useState("");
  const [isDetectingMac, setIsDetectingMac] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 代理人设置状态
  const [delegations, setDelegations] = useState<any[]>([]);
  const [delegationsLoading, setDelegationsLoading] = useState(false);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [editingProxyId, setEditingProxyId] = useState<string | null>(null);
  const [proxyModalData, setProxyModalData] = useState({
    proxyId: "",
    approvalTypes: [] as string[],
    startDate: "",
    endDate: "",
  });
  const [proxySearchText, setProxySearchText] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [proxyActionLoading, setProxyActionLoading] = useState(false);
  const [proxyError, setProxyError] = useState("");
  const [departments, setDepartments] = useState<{ id: string; departmentName: string }[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  // 代理记录筛选
  const [filterAgentName, setFilterAgentName] = useState("");
  const [filterApprovalType, setFilterApprovalType] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterCreatedStart, setFilterCreatedStart] = useState("");
  const [filterCreatedEnd, setFilterCreatedEnd] = useState("");

  // 用户权限状态
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // 加载用户信息
  useEffect(() => {
    loadUserProfile();
    loadUserPermissions();
    fetchDelegations();
  }, []);

  // 关闭部门下拉菜单（点击外部）
  useEffect(() => {
    const handler = () => setShowDeptDropdown(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showDeptDropdown]);

  // 加载用户权限
  const loadUserPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const res = await fetch("/api/permissions/my", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setUserPermissions(data.data);
      }
    } catch (err) {
      console.error("Error loading user permissions:", err);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
        setFormData({
          fullName: data.data.fullName || "",
          email: data.data.email,
          phone: (data.data as any).phone || "",
        });
        setMacAddress((data.data as any).macAddress || "");
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
      router.push("/login");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 验证表单
    if (!formData.email) {
      setError("邮箱不能为空");
      return;
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("邮箱格式不正确");
      return;
    }

    // 手机号格式验证（如果填写了）
    if (formData.phone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        setError("手机号格式不正确");
        return;
      }
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        // 更新当前用户信息
        setCurrentUser(data.data);

        // 更新 localStorage 中的用户信息
        localStorage.setItem("user", JSON.stringify(data.data));

        setSuccess("个人信息更新成功！");
        setIsEditing(false);
      } else {
        setError(data.error || "更新失败，请稍后重试");
      }
    } catch (err) {
      console.error("Error updating user profile:", err);
      setError("更新失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // 重置表单
    if (currentUser) {
      setFormData({
        fullName: currentUser.fullName || "",
        email: currentUser.email,
        phone: (currentUser as any).phone || "",
      });
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  const handleChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 验证表单
    if (!passwordData.currentPassword) {
      setError("当前密码不能为空");
      return;
    }

    if (!passwordData.newPassword) {
      setError("新密码不能为空");
      return;
    }

    // 密码长度验证
    if (passwordData.newPassword.length < 6) {
      setError("新密码长度不能少于6位");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          credentials: "include",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 更新本地存储的token（因为API返回了新token）
        if (data.data.token) {
          localStorage.setItem("token", data.data.token);
        }

        setSuccess("密码修改成功！");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowChangePassword(false);

        // 延迟2秒后清除成功消息
        setTimeout(() => {
          setSuccess("");
        }, 2000);
      } else {
        setError(data.error || "密码修改失败，请稍后重试");
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setError("密码修改失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPassword = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowChangePassword(false);
    setError("");
    setSuccess("");
  };

  // 自动检测MAC地址
  const handleDetectMac = async () => {
    setIsDetectingMac(true);
    setError("");
    
    try {
      // 尝试从API获取MAC地址
      const res = await fetch("/api/auth/mac-address");
      const data = await res.json();
      
      if (data.success && data.data.macAddress) {
        setMacAddress(data.data.macAddress);
        setSuccess("已自动获取MAC地址");
      } else {
        // 尝试从localStorage获取保存的MAC地址
        const savedMac = localStorage.getItem("savedMacAddress");
        if (savedMac) {
          setMacAddress(savedMac);
          setSuccess("已从本地缓存加载MAC地址");
        } else {
          setError("无法自动获取MAC地址，请手动输入。由于浏览器安全限制，Web应用无法直接获取客户端MAC地址。");
        }
      }
    } catch (err) {
      console.error("Error detecting MAC address:", err);
      // 尝试从localStorage获取保存的MAC地址
      const savedMac = localStorage.getItem("savedMacAddress");
      if (savedMac) {
        setMacAddress(savedMac);
        setSuccess("已从本地缓存加载MAC地址");
      } else {
        setError("自动检测失败，请手动输入MAC地址");
      }
    } finally {
      setIsDetectingMac(false);
    }
  };

  // 绑定MAC地址
  const handleBindMac = async () => {
    if (!macAddress.trim()) {
      setError("请输入MAC地址");
      return;
    }

    // 验证MAC地址格式
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress.trim())) {
      setError("MAC地址格式不正确，请输入格式如：00:11:22:33:44:55");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/bind-mac", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ macAddress: macAddress.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        // 更新当前用户信息
        setCurrentUser(data.data);
        // 更新 localStorage 中的用户信息
        localStorage.setItem("user", JSON.stringify(data.data));
        // 保存MAC地址到localStorage
        localStorage.setItem("savedMacAddress", macAddress.trim());
        
        setSuccess("MAC地址绑定成功！您可以使用MAC地址快速登录");
        setShowMacBinding(false);
      } else {
        setError(data.error || "绑定失败，请稍后重试");
      }
    } catch (err) {
      console.error("Error binding MAC address:", err);
      setError("绑定失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 解绑MAC地址
  const handleUnbindMac = async () => {
    if (!confirm("确定要解绑MAC地址吗？解绑后将无法使用MAC地址快速登录。")) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/bind-mac", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        // 更新当前用户信息
        setCurrentUser(data.data);
        // 更新 localStorage 中的用户信息
        localStorage.setItem("user", JSON.stringify(data.data));
        // 清除localStorage中保存的MAC地址
        localStorage.removeItem("savedMacAddress");
        setMacAddress("");
        
        setSuccess("MAC地址已解绑");
      } else {
        setError(data.error || "解绑失败，请稍后重试");
      }
    } catch (err) {
      console.error("Error unbinding MAC address:", err);
      setError("解绑失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 代理人设置相关
  const fetchDelegations = async (params?: Record<string, string>) => {
    setDelegationsLoading(true);
    try {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await fetch("/api/delegations" + qs);
      if (res.ok) {
        const data = await res.json();
        setDelegations(data);
      }
    } catch {
      // ignore
    } finally {
      setDelegationsLoading(false);
    }
  };

  const handleUserSearch = async (query: string, deptId?: string) => {
    const hasQuery = query.trim().length > 0;
    const hasDept = !!deptId;
    if (!hasQuery && !hasDept) {
      setSearchResults([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (hasQuery) params.set("q", query.trim());
      if (hasDept) params.set("departmentId", deptId!);
      const res = await fetch(`/api/users/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch {
      // ignore
    }
  };

  const handleProxySubmit = async () => {
    const { proxyId, approvalTypes, startDate, endDate } = proxyModalData;
    if (!proxyId) {
      setProxyError("请选择代理人");
      return;
    }
    if (approvalTypes.length === 0) {
      setProxyError("请至少选择一种代理审批类型");
      return;
    }
    if (!startDate || !endDate) {
      setProxyError("请设置日期范围");
      return;
    }
    if (startDate > endDate) {
      setProxyError("开始日期不能晚于结束日期");
      return;
    }

    setProxyActionLoading(true);
    setProxyError("");

    try {
      const url = editingProxyId ? `/api/delegations/${editingProxyId}` : "/api/delegations";
      const method = editingProxyId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxyId, approvalTypes, startDate, endDate }),
      });

      if (res.ok) {
        setShowProxyModal(false);
        setSearchResults([]);
        fetchDelegations();
      } else {
        const data = await res.json();
        setProxyError(data.error || "操作失败");
      }
    } catch {
      setProxyError("网络错误，请稍后重试");
    } finally {
      setProxyActionLoading(false);
    }
  };

  const handleFilterSearch = () => {
    const params: Record<string, string> = {};
    if (filterAgentName.trim()) params.agentName = filterAgentName.trim();
    if (filterApprovalType) params.approvalType = filterApprovalType;
    if (filterStartDate) params.startDate = filterStartDate;
    if (filterEndDate) params.endDate = filterEndDate;
    if (filterCreatedStart) params.createdAtStart = filterCreatedStart;
    if (filterCreatedEnd) params.createdAtEnd = filterCreatedEnd;
    fetchDelegations(params);
  };

  const handleResetFilter = () => {
    setFilterAgentName("");
    setFilterApprovalType("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterCreatedStart("");
    setFilterCreatedEnd("");
    fetchDelegations();
  };

  const handleNewProxy = () => {
    setEditingProxyId(null);
    setProxyModalData({ proxyId: "", approvalTypes: [], startDate: "", endDate: "" });
    setProxySearchText("");
    setSearchResults([]);
    setSelectedDepartmentId("");
    setProxyError("");
    setShowProxyModal(true);
  };

  const handleEditProxy = (d: any) => {
    setEditingProxyId(d.id);
    setProxyModalData({
      proxyId: d.proxyId,
      approvalTypes: d.approvalTypes || [],
      startDate: d.startDate || "",
      endDate: d.endDate || "",
    });
    setProxySearchText(d.proxyName || d.proxyUsername || "");
    setSearchResults([]);
    setSelectedDepartmentId("");
    setProxyError("");
    setShowProxyModal(true);
  };

  const handleDeleteDelegation = async (id: string) => {
    if (!confirm("确定要删除此代理设置吗？")) {
      return;
    }

    setProxyActionLoading(true);
    try {
      const res = await fetch(`/api/delegations/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDelegations();
      }
    } catch {
      // ignore
    } finally {
      setProxyActionLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={handleBack}
              className="mb-4 inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              返回
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              个人中心
            </h1>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              编辑资料
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：用户头像和基本信息 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-center">
                {/* 用户头像 */}
                <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-4">
                  <span className="text-3xl font-bold text-red-600">
                    {currentUser.fullName?.charAt(0) || currentUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentUser.fullName || currentUser.username}
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {UserRoleDisplayNames[currentUser.role as keyof typeof UserRoleDisplayNames] || "项目成员"}
                </p>

                {/* 账户状态 */}
                <div className="flex items-center justify-center gap-2">
                  {currentUser.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      活跃
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                      未激活
                    </span>
              )}
            </div>

            {showProxyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {editingProxyId ? "编辑代理设置" : "新增代理设置"}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">代理人</label>
                      {editingProxyId ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                          {proxySearchText}
                        </div>
                      ) : (
                        <div>
                          <div className="flex gap-2">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (departments.length === 0) {
                                    fetch("/api/departments")
                                      .then((r) => r.json())
                                      .then((data) => setDepartments(data || []))
                                      .catch(() => {});
                                  }
                                  setShowDeptDropdown(!showDeptDropdown);
                                }}
                                className="h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 whitespace-nowrap flex items-center gap-1"
                              >
                                {selectedDepartmentId
                                  ? departments.find((d) => d.id === selectedDepartmentId)?.departmentName || "已选部门"
                                  : "选择部门"}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {showDeptDropdown && (
                                <div className="absolute z-10 mt-1 w-44 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDepartmentId("");
                                      setShowDeptDropdown(false);
                                      if (proxySearchText.trim()) {
                                        handleUserSearch(proxySearchText);
                                      }
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${!selectedDepartmentId ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600" : "text-gray-700 dark:text-gray-300"}`}
                                  >
                                    全部部门
                                  </button>
                                  {departments.map((dept) => (
                                    <button
                                      key={dept.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedDepartmentId(dept.id);
                                        setShowDeptDropdown(false);
                                        handleUserSearch(proxySearchText, dept.id);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${selectedDepartmentId === dept.id ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600" : "text-gray-700 dark:text-gray-300"}`}
                                    >
                                      {dept.departmentName}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={proxySearchText}
                                onChange={(e) => {
                                  setProxySearchText(e.target.value);
                                  if (e.target.value.trim().length > 0 || selectedDepartmentId) {
                                    handleUserSearch(e.target.value, selectedDepartmentId || undefined);
                                  } else {
                                    setSearchResults([]);
                                  }
                                }}
                                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="输入姓名搜索..."
                              />
                              {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {searchResults.map((u: any) => (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => {
                                        setProxyModalData({ ...proxyModalData, proxyId: u.id });
                                        setProxySearchText(u.fullName || u.username);
                                        setSearchResults([]);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                    >
                                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                                        {u.fullName || u.username}
                                      </div>
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        {u.departmentName && <span>{u.departmentName} · </span>}
                                        {u.email}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
            </div>

            {/* 代理人设置卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  代理人设置
                </h3>
                <button
                  onClick={handleNewProxy}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  新增代理
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                设置代理人后，代理人可在指定时间范围内代为处理对应类型的审批。
              </p>

              {/* 筛选栏 */}
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <input
                  type="text"
                  placeholder="代理人姓名"
                  value={filterAgentName}
                  onChange={(e) => setFilterAgentName(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white w-28"
                />
                <select
                  value={filterApprovalType}
                  onChange={(e) => setFilterApprovalType(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">全部类型</option>
                  {APPROVAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white w-36"
                  title="代理开始日期"
                />
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white w-36"
                  title="代理结束日期"
                />
                <input
                  type="date"
                  value={filterCreatedStart}
                  onChange={(e) => setFilterCreatedStart(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white w-36"
                  title="创建开始日期"
                />
                <input
                  type="date"
                  value={filterCreatedEnd}
                  onChange={(e) => setFilterCreatedEnd(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white w-36"
                  title="创建结束日期"
                />
                <button
                  onClick={handleFilterSearch}
                  className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  查询
                </button>
                <button
                  onClick={handleResetFilter}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  重置
                </button>
              </div>

              {/* 表格 */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">序号</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">编码</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">代理人</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">代理类型</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium w-32">日期范围</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">创建日期</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">状态</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delegationsLoading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent mx-auto"></div>
                        </td>
                      </tr>
                    ) : delegations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400">暂无代理设置</td>
                      </tr>
                    ) : (
                      delegations.map((d: any, idx: number) => {
                        const today = new Date().toISOString().slice(0, 10);
                        const isInRange = d.isActive && d.startDate <= today && d.endDate >= today;
                        const isPending = d.isActive && d.startDate > today;
                        const statusLabel = !d.isActive ? "已失效" : isInRange ? "生效中" : isPending ? "待生效" : "已过期";
                        const statusColor = isInRange ? "green" : !d.isActive || !isPending ? "red" : "yellow";
                        return (
                        <tr key={d.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{idx + 1}</td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{d.proxyCode || "-"}</td>
                          <td className="py-2 px-3">
                            <div className="text-gray-900 dark:text-white font-medium text-sm">{d.proxyName || d.proxyUsername || "-"}</div>
                            <div className="text-xs text-gray-400">{d.proxyEmail || ""}</div>
                          </td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs">{(d.approvalTypes || []).map((t: string) => APPROVAL_TYPE_LABELS[t] || t).join("、") || "-"}</td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{d.startDate || "-"} ~ {d.endDate || "-"}</td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs">{d.createdAt ? d.createdAt.slice(0, 10) : "-"}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColor === "green" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
                              statusColor === "yellow" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" :
                              "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditProxy(d)}
                                className="text-orange-500 hover:text-orange-600 text-sm"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteDelegation(d.id)}
                                className="text-red-500 hover:text-red-600 text-sm"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
                        </div>
                      )}
                      {proxyModalData.proxyId && (
                        <p className="mt-1 text-xs text-orange-500">
                          已选择：{proxySearchText}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">代理审批类型</label>
                      <div className="flex flex-wrap gap-3">
                        {APPROVAL_TYPE_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={proxyModalData.approvalTypes.includes(opt.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProxyModalData({
                                    ...proxyModalData,
                                    approvalTypes: [...proxyModalData.approvalTypes, opt.value],
                                  });
                                } else {
                                  setProxyModalData({
                                    ...proxyModalData,
                                    approvalTypes: proxyModalData.approvalTypes.filter((v) => v !== opt.value),
                                  });
                                }
                              }}
                              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">开始日期</label>
                        <input
                          type="date"
                          value={proxyModalData.startDate}
                          onChange={(e) => setProxyModalData({ ...proxyModalData, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">结束日期</label>
                        <input
                          type="date"
                          value={proxyModalData.endDate}
                          onChange={(e) => setProxyModalData({ ...proxyModalData, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {proxyError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{proxyError}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowProxyModal(false);
                        setProxyError("");
                        setSearchResults([]);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleProxySubmit}
                      disabled={proxyActionLoading}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {proxyActionLoading ? "保存中..." : editingProxyId ? "确认修改" : "确认添加"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">用户名</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentUser.username}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">创建时间</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(currentUser.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 我的权限卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                我的权限
              </h3>
              
              {permissionsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* 系统管理员提示 */}
                  {(currentUser.role === "system_admin" || currentUser.role === "admin" || currentUser.role === "administrator") && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <span className="font-medium">系统管理员</span>拥有所有模块的完整权限
                      </p>
                    </div>
                  )}
                  
                  {/* 权限列表 */}
                  {(currentUser.role !== "system_admin" && currentUser.role !== "admin" && currentUser.role !== "administrator") && (
                    <>
                      {Object.keys(userPermissions).length === 0 ? (
                        <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          <p>您暂未被分配任何模块权限</p>
                          <p className="mt-1">请联系系统管理员为您分配权限</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {RESOURCE_DISPLAY_ORDER.map(({ key, name }) => {
                            const perms = userPermissions[key] || [];
                            if (perms.length === 0) return null;
                            
                            return (
                              <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                                <div className="flex gap-1">
                                  {perms.includes("view") && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                      查看
                                    </span>
                                  )}
                                  {perms.includes("edit") && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                                      编辑
                                    </span>
                                  )}
                                  {perms.includes("delete") && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                      删除
                                    </span>
                                  )}
                                  {perms.includes("use") && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                      使用
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* 权限说明 */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-blue-500"></span>
                        <span className="text-gray-500 dark:text-gray-400">查看</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-yellow-500"></span>
                        <span className="text-gray-500 dark:text-gray-400">编辑</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-red-500"></span>
                        <span className="text-gray-500 dark:text-gray-400">删除</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-green-500"></span>
                        <span className="text-gray-500 dark:text-gray-400">使用</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 右侧：详细信息和编辑表单 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 修改密码卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  安全设置
                </h3>
                {!showChangePassword && (
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    修改密码
                  </button>
                )}
              </div>

              {showChangePassword && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      当前密码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={handleChangePassword}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="请输入当前密码"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      新密码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={handleChangePassword}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="请输入新密码（至少6位）"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      确认新密码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={handleChangePassword}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="请再次输入新密码"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelPassword}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "修改中..." : "确认修改"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 个人信息卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                {isEditing ? "编辑个人信息" : "个人信息"}
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      用户名（不可修改）
                    </label>
                    <input
                      type="text"
                      value={currentUser.username}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      姓名
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="请输入姓名"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      邮箱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="请输入邮箱"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      手机
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="请输入手机号"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      角色（不可修改）
                    </label>
                    <input
                      type="text"
                      value={UserRoleDisplayNames[currentUser.role as keyof typeof UserRoleDisplayNames] || "项目成员"}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "保存中..." : "保存"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        用户名
                      </label>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {currentUser.username}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        姓名
                      </label>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {currentUser.fullName || "-"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        邮箱
                      </label>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {currentUser.email}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        手机
                      </label>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {(currentUser as any).phone || "-"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        角色
                      </label>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {UserRoleDisplayNames[currentUser.role as keyof typeof UserRoleDisplayNames] || "项目成员"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        账户状态
                      </label>
                      <p className="text-lg">
                        {currentUser.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            活跃
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            未激活
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        创建时间
                      </label>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {formatDate(currentUser.createdAt)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        绑定MAC地址
                      </label>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {(currentUser as any).macAddress || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MAC地址绑定卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  MAC地址绑定
                </h3>
                {!showMacBinding && (
                  <button
                    onClick={() => setShowMacBinding(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {(currentUser as any).macAddress ? "更换绑定" : "绑定MAC"}
                  </button>
                )}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                绑定MAC地址后，可以使用MAC地址快速登录系统，无需输入用户名和密码。
              </p>

              {(currentUser as any).macAddress && !showMacBinding && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      已绑定MAC地址
                    </p>
                    <p className="text-lg font-mono text-green-900 dark:text-green-200">
                      {(currentUser as any).macAddress}
                    </p>
                  </div>
                  <button
                    onClick={handleUnbindMac}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    解绑
                  </button>
                </div>
              )}

              {showMacBinding && (
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-600">{success}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="macAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      MAC地址
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="macAddress"
                        type="text"
                        value={macAddress}
                        onChange={(e) => {
                          setMacAddress(e.target.value);
                          setError("");
                          setSuccess("");
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono"
                        placeholder="格式：00:11:22:33:44:55"
                      />
                      <button
                        type="button"
                        onClick={handleDetectMac}
                        disabled={isDetectingMac}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 whitespace-nowrap"
                      >
                        {isDetectingMac ? "检测中..." : "自动检测"}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      MAC地址格式：00:11:22:33:44:55（使用冒号或连字符分隔）
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMacBinding(false);
                        setMacAddress((currentUser as any).macAddress || "");
                        setError("");
                        setSuccess("");
                      }}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleBindMac}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "绑定中..." : "确认绑定"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
