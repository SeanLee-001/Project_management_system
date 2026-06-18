"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  Package,
  Shield,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  DollarSign,
} from "lucide-react";

interface DarkSidebarLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

const menuItems = [
  { href: "/app", icon: LayoutDashboard, label: "工作台", color: "from-blue-400 to-blue-600" },
  { href: "/app?tab=projects", icon: FolderKanban, label: "项目管理", color: "from-purple-400 to-purple-600" },
  { href: "/app?tab=tasks", icon: CheckSquare, label: "任务管理", color: "from-green-400 to-green-600" },
  { href: "/app?tab=customers", icon: Users, label: "客户管理", color: "from-pink-400 to-pink-600" },
  { href: "/app?tab=contracts", icon: FileText, label: "合同管理", color: "from-yellow-400 to-yellow-600" },
  { href: "/app?tab=orders", icon: Package, label: "订单管理", color: "from-indigo-400 to-indigo-600" },
  { href: "/app?tab=products", icon: Package, label: "产品管理", color: "from-red-400 to-red-600" },
  { href: "/app?tab=approvals", icon: Shield, label: "项目审批", color: "from-teal-400 to-teal-600" },
  { href: "/app?tab=financial_management", icon: DollarSign, label: "财务管理", color: "from-amber-400 to-amber-600" },
  { href: "/login-logs", icon: History, label: "登录日志", color: "from-orange-400 to-orange-600" },
  { href: "/admin", icon: Settings, label: "系统管理", color: "from-cyan-400 to-cyan-600" },
];

export default function DarkSidebarLayout({
  children,
  userName,
  userRole,
  onLogout,
}: DarkSidebarLayoutProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app" || pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  // 如果是黑色主题模式，渲染侧边栏布局
  if (theme === "dark-sidebar") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* 移动端遮罩层 */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* 侧边栏 - 渐变黑色背景 */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white transition-all duration-300 ease-in-out shadow-2xl ${
            isCollapsed ? "w-20" : "w-64"
          } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* Logo 区域 - 带光晕效果 */}
          <div className="relative h-20 px-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-900 to-gray-800">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative flex items-center justify-between h-full">
              {!isCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      项目管理系统
                    </h1>
                    <p className="text-xs text-gray-400">{currentTime.toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-all duration-200 hidden lg:block group"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
                )}
              </button>
            </div>
          </div>

          {/* 用户信息卡片 - 玻璃拟态效果 */}
          {!isCollapsed && (
            <div className="p-4 border-b border-gray-700/50">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm p-4 border border-gray-600/30">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {userName?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{userName || "用户"}</p>
                    <p className="text-xs text-gray-400 truncate">{userRole || "未登录"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 导航菜单 - 带颜色标识 */}
          <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            <ul className="space-y-1.5 px-3">
              {menuItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group overflow-hidden ${
                        active
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                          : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {/* 背景渐变 */}
                      {active && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-20`}></div>
                      )}
                      
                      {/* 图标 - 活动时带渐变 */}
                      <div className={`relative ${
                        active 
                          ? "text-white" 
                          : "text-gray-400 group-hover:text-white"
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      
                      {/* 标签 */}
                      {!isCollapsed && (
                        <span className="relative text-sm font-medium">{item.label}</span>
                      )}
                      
                      {/* 活动指示器 */}
                      {!isCollapsed && active && (
                        <div className="relative ml-auto">
                          <div className="w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50"></div>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 底部操作区 - 玻璃拟态 */}
          <div className="p-4 border-t border-gray-700/50 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
            {/* 主题切换按钮 */}
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 hover:text-white transition-all duration-200 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-white to-gray-300 shadow-lg">
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-gray-800 to-black"></div>
              </div>
              {!isCollapsed && (
                <span className="text-sm font-medium">切换到默认主题</span>
              )}
            </button>

            {/* 登出按钮 */}
            {onLogout && (
              <button
                onClick={onLogout}
                className={`mt-2 w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 hover:text-red-300 transition-all duration-200 ${
                  isCollapsed ? "justify-center" : ""
                }`}
              >
                <LogOut className="w-5 h-5" />
                {!isCollapsed && <span className="text-sm font-medium">退出登录</span>}
              </button>
            )}
          </div>
        </aside>

        {/* 主内容区 */}
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? "lg:ml-20" : "lg:ml-64"
          }`}
        >
          {/* 顶部导航栏 - 白色背景带阴影 */}
          <header className="sticky top-0 z-30 h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
            <div className="flex items-center justify-between h-full px-6">
              {/* 左侧：移动端菜单按钮 */}
              <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>

              {/* 中间：搜索框 */}
              <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索项目、任务、客户..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-600 transition-all outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                  />
                </div>
              </div>

              {/* 右侧：通知和主题指示器 */}
              <div className="flex items-center gap-4">
                {/* 通知按钮 */}
                <button className="relative p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-700"></span>
                </button>

                {/* 主题切换指示器 */}
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 border border-blue-200 dark:border-gray-500">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-lg"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">黑色侧边栏模式</span>
                </div>
              </div>
            </div>
          </header>

          {/* 页面内容 - 白色卡片背景 */}
          <main className="p-6 lg:p-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700">
              {children}
            </div>
          </main>
        </div>

        {/* 自定义滚动条样式 */}
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </div>
    );
  }

  // 默认主题 - 直接渲染子组件
  return <>{children}</>;
}
