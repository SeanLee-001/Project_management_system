"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { User } from "@/storage/database/shared/schema";

// 动态导入重型组件，按需加载
const UserManagement = dynamic(() => import("@/components/UserManagement"), { ssr: false });
const PermissionManagement = dynamic(() => import("@/components/PermissionManagement"), { ssr: false });
const PermissionManagementMerged = dynamic(() => import("@/components/PermissionManagementMerged"), { ssr: false });
const RoleManagement = dynamic(() => import("@/components/RoleManagement"), { ssr: false });
const SystemLogManagement = dynamic(() => import("@/components/SystemLogManagement"), { ssr: false });
const LoginStatsDashboard = dynamic(() => import("@/components/LoginStatsDashboard"), { ssr: false });
const IntegrationManagement = dynamic(() => import("@/components/IntegrationManagement"), { ssr: false });
const ApprovalFlowManagement = dynamic(() => import("@/components/ApprovalFlowManagement"), { ssr: false });
const CodingRulesManagementV2 = dynamic(() => import("@/components/CodingRulesManagementV2"), { ssr: false });
const DatabaseConfigManagement = dynamic(() => import("@/components/DatabaseConfigManagement"), { ssr: false });
const DepartmentManagement = dynamic(() => import("@/components/DepartmentManagement"), { ssr: false });
const DepartmentPermissionManagement = dynamic(() => import("@/components/DepartmentPermissionManagement"), { ssr: false });

// 轻量组件保持静态导入
import MessageNotification from "@/components/MessageNotification";
import IconUpload from "@/components/IconUpload";
import AlertStyleSelector from "@/components/AlertStyleSelector";
import { notifyUserChanged } from "@/components/GlobalWatermark";
import { UserRoleDisplayNames, UserRole } from "@/storage/database/shared/schema";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { convertToProxyUrl } from "@/lib/imageUtils";

type Tab = "users" | "departments" | "department_permissions" | "permissions" | "roles" | "approval_flows" | "coding_rules" | "settings" | "system_logs" | "login_stats" | "integrations" | "db_config";

type MenuCategory = "basic" | "permission" | "system";

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

export default function AdminPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [activeMenu, setActiveMenu] = useState<MenuCategory>("basic");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    companyName: "",
    companyLogo: "",
    systemVersion: "",
    alertStyle: "default",
  });

  const checkLoginStatus = () => {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (user && token) {
      const userData = JSON.parse(user);
      setCurrentUser(userData);

      // 检查是否是系统管理员
      if (userData.role !== UserRole.SYSTEM_ADMIN) {
        router.push("/app");
        return;
      }
    } else {
      router.push("/login?redirect=/admin");
    }
    setIsLoading(false);
  };

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch("/api/settings", {
        credentials: "include",
        headers: createAuthHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        router.push("/login?redirect=/admin");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        const settings = json.data || {};
        
        // 转换图片 URL 为代理格式
        if (settings.companyLogo) {
          settings.companyLogo = convertToProxyUrl(settings.companyLogo);
        }
        
        setSystemSettings(settings);
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const handleAutoLogout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login?redirect=/admin");
    console.log("由于长时间无操作，已自动登出");
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchSystemSettings();
    }
  }, [currentUser]);

  useAutoLogout({
    timeout: 30 * 60 * 1000, // 30分钟无操作自动登出
    onTimeout: handleAutoLogout,
    enabled: !!currentUser,
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    // 通知水印组件用户已登出
    notifyUserChanged();
    router.push("/login?redirect=/admin");
  };

  const handleUpdateSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || currentUser.role !== UserRole.SYSTEM_ADMIN) {
      alert("只有系统管理员可以修改系统设置");
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: createAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(systemSettings),
      });

      if (res.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        alert("登录已过期，请重新登录");
        router.push("/login?redirect=/admin");
        return;
      }

      const json = await res.json();

      if (json.success) {
        setSystemSettings(json.data);
        setShowSettingsModal(false);
        alert("系统设置更新成功！");
      } else {
        alert("更新失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error updating system settings:", error);
      alert("更新系统设置失败，请稍后重试");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // 再次检查权限，确保只有系统管理员可以访问
  if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header - 后台管理专用 */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 md:px-8 py-3 md:py-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2 md:gap-4">
              {/* 移动端侧边栏切换按钮 */}
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors touch-target"
                aria-label="切换菜单"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {systemSettings.companyLogo && (
                  <img
                    src={systemSettings.companyLogo}
                    alt="公司Logo"
                    className="h-10 w-10 md:h-40 md:w-40 rounded object-contain"
                  />
                )}
                <div>
                  <h1 className="text-base md:text-lg font-bold text-white">
                    {systemSettings.companyName}后台管理系统
                  </h1>
                  <div className="text-xs text-gray-400">
                    {systemSettings.systemVersion || "1.0.0"}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <LanguageSwitcher currentLocale={locale} />
              <MessageNotification userId={currentUser?.id || ""} />
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-white">
                  {currentUser?.fullName || currentUser?.username}
                </div>
                <div className="text-xs text-gray-400">
                  {UserRoleDisplayNames[currentUser?.role as keyof typeof UserRoleDisplayNames] || "管理员"}
                </div>
              </div>
              <button
                onClick={() => router.push("/app")}
                className="px-2.5 py-1.5 md:px-3 md:py-1.5 text-xs md:text-sm rounded border border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 touch-target"
              >
                返回应用端
              </button>
              <button
                onClick={() => router.push("/user-profile")}
                className="hidden sm:inline px-3 py-1.5 text-sm rounded border border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                个人中心
              </button>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 md:px-3 md:py-1.5 text-xs md:text-sm rounded border border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20 touch-target"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex relative">
        {/* 移动端侧边栏遮罩 */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`w-52 min-h-[calc(100vh-3.5rem)] bg-gray-900 border-r border-gray-700 flex-shrink-0 transition-all duration-300
          ${isMobileSidebarOpen ? 'fixed left-0 top-[3.5rem] z-40 h-[calc(100vh-3.5rem)] overflow-y-auto shadow-2xl' : 'hidden md:block'}
        `}>
          <nav className="p-4">
            {/* 一级菜单 - 基础管理 */}
            <div className="mb-2">
              <button
                onClick={() => setActiveMenu("basic")}
                className={`w-full text-left px-4 py-4 rounded-lg text-base font-bold transition-colors flex items-center justify-between ${
                  activeMenu === "basic"
                    ? "bg-blue-600 text-white"
                    : "text-white hover:bg-gray-800"
                }`}
              >
                <span>基础管理</span>
                <span className={`transform transition-transform ${activeMenu === "basic" ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>
              {activeMenu === "basic" && (
                <ul className="mt-2 ml-2 space-y-1 border-l-2 border-gray-600 pl-4">
                  <li>
                    <button
                      onClick={() => setActiveTab("users")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "users"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      用户管理
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("departments")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "departments"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      部门管理
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("roles")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "roles"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      角色管理
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("coding_rules")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "coding_rules"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      编码规则管理
                    </button>
                  </li>
                </ul>
              )}
            </div>

            {/* 分隔线 */}
            <div className="my-4 border-t-2 border-b border-white"></div>

            {/* 一级菜单 - 权限管理 */}
            <div className="mb-2">
              <button
                onClick={() => setActiveMenu("permission")}
                className={`w-full text-left px-4 py-4 rounded-lg text-base font-bold transition-colors flex items-center justify-between ${
                  activeMenu === "permission"
                    ? "bg-blue-600 text-white"
                    : "text-white hover:bg-gray-800"
                }`}
              >
                <span>权限管理</span>
                <span className={`transform transition-transform ${activeMenu === "permission" ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>
              {activeMenu === "permission" && (
                <ul className="mt-2 ml-2 space-y-1 border-l-2 border-gray-600 pl-4">
                  <li>
                    <button
                      onClick={() => setActiveTab("permissions")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "permissions"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      权限管理
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("department_permissions")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "department_permissions"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      部门基础权限
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("approval_flows")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "approval_flows"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      审批流程配置
                    </button>
                  </li>
                </ul>
              )}
            </div>

            {/* 分隔线 */}
            <div className="my-4 border-t-2 border-b border-white"></div>

            {/* 一级菜单 - 系统管理 */}
            <div className="mb-2">
              <button
                onClick={() => setActiveMenu("system")}
                className={`w-full text-left px-4 py-4 rounded-lg text-base font-bold transition-colors flex items-center justify-between ${
                  activeMenu === "system"
                    ? "bg-blue-600 text-white"
                    : "text-white hover:bg-gray-800"
                }`}
              >
                <span>系统管理</span>
                <span className={`transform transition-transform ${activeMenu === "system" ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>
              {activeMenu === "system" && (
                <ul className="mt-2 ml-2 space-y-1 border-l-2 border-gray-600 pl-4">
                  <li>
                    <button
                      onClick={() => setActiveTab("system_logs")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "system_logs"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      系统日志
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("login_stats")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "login_stats"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      登录统计
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab("integrations")}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === "integrations"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      系统对接
                    </button>
                  </li>
                  {currentUser?.role === UserRole.SYSTEM_ADMIN && (
                    <>
                      <li>
                        <button
                          onClick={() => setActiveTab("db_config")}
                          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === "db_config"
                              ? "bg-blue-600 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                        >
                          数据库配置
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => setShowSettingsModal(true)}
                          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === "settings"
                              ? "bg-blue-600 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                        >
                          系统设置
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-3 md:p-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-3 md:p-6 min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-2rem)]">
            {activeTab === "users" && <UserManagement />}
            {activeTab === "departments" && <DepartmentManagement />}
            {activeTab === "department_permissions" && <DepartmentPermissionManagement />}
            {activeTab === "permissions" && <PermissionManagementMerged />}
            {activeTab === "roles" && <RoleManagement />}
            {activeTab === "coding_rules" && <CodingRulesManagementV2 />}
            {activeTab === "approval_flows" && <ApprovalFlowManagement userId={currentUser?.id} userRole={currentUser?.role} />}
            {activeTab === "system_logs" && <SystemLogManagement />}
            {activeTab === "login_stats" && <LoginStatsDashboard />}
            {activeTab === "integrations" && <IntegrationManagement />}
            {activeTab === "db_config" && <DatabaseConfigManagement />}
          </div>
        </main>
      </div>

      {/* System Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  系统设置
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  配置系统参数
                </p>
              </div>

              {/* 检查用户是否有管理员权限 */}
              {currentUser && (
                currentUser.role === UserRole.SYSTEM_ADMIN ||
                currentUser.role === UserRole.DEPARTMENT_MANAGER ||
                currentUser.role === UserRole.PROJECT_MANAGER
              ) ? (
                <form onSubmit={handleUpdateSystemSettings}>
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      公司名称
                    </label>
                    <input
                      type="text"
                      required
                      value={systemSettings.companyName}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="例如：XXX公司"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      系统版本号
                    </label>
                    <input
                      type="text"
                      value={systemSettings.systemVersion || "1.0.0"}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          systemVersion: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="例如：1.0.0"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      格式：主版本号.次版本号.修订号（例如：1.0.0）
                    </p>
                  </div>

                  <div className="mb-6">
                    <IconUpload
                      currentIconUrl={systemSettings.companyLogo || undefined}
                      onIconChange={(url) => setSystemSettings({ ...systemSettings, companyLogo: url || "" })}
                      label="公司Logo"
                      size="lg"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      支持拖拽上传或点击选择文件
                    </p>
                  </div>

                  {/* 系统提示风格选择 */}
                  <div className="mb-6">
                    <AlertStyleSelector
                      currentStyleId={systemSettings.alertStyle || "default"}
                      onStyleChange={(styleId) => setSystemSettings({ ...systemSettings, alertStyle: styleId })}
                    />
                  </div>

                  {/* 设置导出/导入按钮 */}
                  <div className="mb-6 flex gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/settings/export", {
                            credentials: "include",
                            headers: createAuthHeaders(),
                          });
                          if (response.status === 401) {
                            localStorage.removeItem("user");
                            localStorage.removeItem("token");
                            alert("登录已过期，请重新登录");
                            router.push("/login?redirect=/admin");
                            return;
                          }
                          if (!response.ok) {
                            alert("导出失败");
                            return;
                          }
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `system-settings-${Date.now()}.json`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          alert("设置已导出");
                        } catch (error) {
                          console.error("导出失败:", error);
                          alert("导出设置失败");
                        }
                      }}
                      className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                    >
                      导出设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "application/json";
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;

                          try {
                            const text = await file.text();
                            const data = JSON.parse(text);

                            if (!data.companyName) {
                              alert("文件格式无效");
                              return;
                            }

                            if (!confirm("导入设置将覆盖当前设置，确定要继续吗？")) {
                              return;
                            }

                            const response = await fetch("/api/settings/import", {
                              method: "POST",
                              headers: createAuthHeaders(),
                              credentials: "include",
                              body: JSON.stringify(data),
                            });

                            if (response.status === 401) {
                              localStorage.removeItem("user");
                              localStorage.removeItem("token");
                              alert("登录已过期，请重新登录");
      router.push("/login?redirect=/admin");
                              return;
                            }

                            const result = await response.json();
                            if (result.success) {
                              alert("设置导入成功");
                              await fetchSystemSettings();
                            } else {
                              alert("导入失败: " + (result.error || "未知错误"));
                            }
                          } catch (error) {
                            console.error("导入失败:", error);
                            alert("导入设置失败");
                          }
                        };
                        input.click();
                      }}
                      className="rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                    >
                      导入设置
                    </button>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(false);
                        fetchSystemSettings();
                      }}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      保存
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-md bg-yellow-50 p-6 dark:bg-yellow-900/20">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-base font-medium text-yellow-800 dark:text-yellow-200">
                        权限不足
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                        只有系统管理员、部门经理或项目经理才能访问系统设置。
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
